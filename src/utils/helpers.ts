import { VATCategory, ATCEntry, Supplier, LedgerRow, Transaction } from '../types';

export const BALANCE_ALLOWANCE = 0.51;

export function makeId(prefix = 'id'): string {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export function parseMoney(value: any): number {
  let raw = String(value ?? '').trim();
  if (!raw || raw === '-' || raw === '--' || raw.toLowerCase() === 'n/a') return 0;
  let negative = false;
  if (/^\(.*\)$/.test(raw)) {
    negative = true;
    raw = raw.slice(1, -1);
  }
  raw = raw.replace(/[₱,\s]/g, '');
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
}

export function fmt(n: number | string): string {
  const num = Number(n || 0);
  return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function pesoText(n: number | string): string {
  const value = Number(n || 0);
  const body = '₱ ' + fmt(Math.abs(value));
  return value < 0 ? `(${body})` : body;
}

export function isStrictMMDDYYYY(value: string): boolean {
  const raw = String(value ?? '').trim();
  const m = raw.match(/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(19\d{2}|20\d{2})$/);
  if (!m) return false;
  const mm = Number(m[1]), dd = Number(m[2]), yyyy = Number(m[3]);
  const d = new Date(yyyy, mm - 1, dd);
  return d.getFullYear() === yyyy && d.getMonth() === (mm - 1) && d.getDate() === dd;
}

export function normalizeImportDate(value: any): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${mm}/${dd}/${value.getFullYear()}`;
  }
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  // Check if it is an Excel serial date code (e.g. 45234)
  const num = Number(raw);
  if (!Number.isNaN(num) && num > 20000 && num < 65000) {
    // Excel leap year bug offset for dates after Feb 28, 1900 is 25569
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}/${dd}/${d.getFullYear()}`;
  }

  if (isStrictMMDDYYYY(raw)) return raw;
  const m = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
  if (!m) return '';
  const mm = Number(m[1]), dd = Number(m[2]);
  let yyyy = Number(m[3]);
  if (m[3].length === 2) yyyy = yyyy >= 50 ? 1900 + yyyy : 2000 + yyyy;
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return '';
  return `${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}/${yyyy}`;
}

export function dateSortNumber(value: string): number | null {
  const raw = String(value ?? '').trim();
  if (isStrictMMDDYYYY(raw)) {
    const [mm, dd, yyyy] = raw.split('/').map(Number);
    return yyyy * 10000 + mm * 100 + dd;
  }
  return null;
}

export function parseVerification(value: any): 'unreviewed' | 'ok' | 'warn' | 'err' | 'journal' | 'adjusting' {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v || ['unreviewed', 'for review', 'not reviewed'].includes(v)) return 'unreviewed';
  if (['ok', 'compliant', 'fully compliant', 'with invoice', 'has invoice', 'invoice'].includes(v)) return 'ok';
  if (['warn', 'without invoice', 'no invoice', 'missing invoice', 'without-invoice', 'without_invoice'].includes(v)) return 'warn';
  if (['err', 'error', 'non-compliant', 'non compliant', 'non_compliant', 'noncompliant', 'with issues', 'non-compliant invoice', 'invoice has non-compliant part'].includes(v)) return 'err';
  if (['journal', 'journal entry', 'journal-entry', 'journal_entry', 'je'].includes(v)) return 'journal';
  if (['adjusting', 'adjusting entry', 'adjusting-entry', 'adjusting_entry', 'adjustment', 'aje'].includes(v)) return 'adjusting';
  return 'unreviewed';
}

export function verificationText(status: string): string {
  if (status === 'ok') return 'Compliant';
  if (status === 'warn') return 'Without Invoice';
  if (status === 'err') return 'Non-Compliant';
  if (status === 'journal') return 'Journal Entry';
  if (status === 'adjusting') return 'Adjusting Entry';
  return 'Unreviewed';
}

export function isExemptEntry(t?: Partial<Transaction>): boolean {
  const s = t?.manualStatus;
  return s === 'journal' || s === 'adjusting';
}

export function isAdjustingEntry(t?: Partial<Transaction>): boolean {
  return t?.manualStatus === 'adjusting';
}

export function normalizeATC(value: any): string {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw || raw === '-' || raw === '--' || raw === 'N/A' || raw === 'NONE') return '';
  const compact = raw.replace(/[^A-Z0-9]/g, '');
  const match = compact.match(/^([A-Z]{2})(\d{3})$/);
  return match ? `${match[1]} ${match[2]}` : '';
}

export function isValidATC(value: any): boolean {
  const raw = String(value ?? '').trim();
  return !raw || Boolean(normalizeATC(raw));
}

export function atcText(value: any): string {
  return normalizeATC(value) || '--';
}

export function parseRate(value: any): number | null {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '-' || raw === '--' || raw.toLowerCase() === 'n/a') return null;
  const hasPercent = raw.includes('%');
  const parsed = parseFloat(raw.replace('%', '').replace(/,/g, ''));
  if (!Number.isFinite(parsed)) return null;
  if (!hasPercent && parsed > 0 && parsed < 1) return parsed * 100;
  return parsed;
}

export function normalizeVatCodeRaw(value: any): string {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '');
}

export function normalizeVatCategoryMaster(row: any): VATCategory {
  return {
    _id: row?._id || makeId('vatcat'),
    code: normalizeVatCodeRaw(row?.code ?? row?.vatCategory ?? row?.vat_category ?? row?.vat_category_code ?? row?.category),
    label: String(row?.label ?? row?.description ?? row?.desc ?? row?.meaning ?? '').trim(),
    kind: String(row?.kind ?? row?.vatType ?? row?.vat_type ?? row?.type ?? 'VAT Registered').trim() || 'VAT Registered',
    rate: parseRate(row?.rate ?? row?.vat_rate ?? row?.percentage) ?? 0,
    status: String(row?.status ?? 'active').trim().toLowerCase() || 'active',
  };
}

export function normalizeAtcMaster(row: any): ATCEntry {
  return {
    _id: row?._id || makeId('atc'),
    atcCode: normalizeATC(row?.atcCode ?? row?.atc_code ?? row?.atc ?? row?.code),
    rate: parseRate(row?.rate ?? row?.ewt_rate ?? row?.percentage ?? row?.tax_rate),
    description: String(row?.description ?? row?.nature ?? row?.income_payment ?? row?.payment_type ?? '').trim(),
    source: String(row?.source ?? row?.database_source ?? row?.reference ?? row?.basis ?? row?.legal_basis ?? '').trim(),
    status: String(row?.status ?? 'active').trim().toLowerCase() || 'active',
  };
}

export function normalizeSupplier(row: any): Supplier {
  return {
    _id: row?._id || makeId('sup'),
    tin: formatTIN(row?.tin || row?.supplier_tin || row?.tin_no || row?.tax_identification_number),
    registeredName: String(row?.registeredName ?? row?.registered_name ?? row?.corporation_name ?? row?.registered_corporation_name ?? row?.company_name ?? row?.supplier_name ?? '').trim(),
    lastName: String(row?.lastName ?? row?.last_name ?? row?.registered_last_name ?? '').trim(),
    firstName: String(row?.firstName ?? row?.first_name ?? row?.registered_first_name ?? '').trim(),
    middleName: String(row?.middleName ?? row?.middle_name ?? row?.registered_middle_name ?? '').trim(),
    address: String(row?.address ?? row?.registeredAddress ?? row?.registered_address ?? row?.street_address ?? '').trim(),
    city: String(row?.city ?? row?.registered_city ?? '').trim(),
    zip: String(row?.zip ?? row?.zip_code ?? row?.registered_zip_code ?? row?.postal_code ?? '').trim(),
  };
}

export function formatTIN(value: any): string {
  const d = String(value ?? '').replace(/[^0-9]/g, '');
  if (d.length === 12) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 9)}-${d.slice(9)}`;
  return String(value ?? '').trim();
}

export function normalizeTIN(value: any): string {
  return String(value ?? '').replace(/[^0-9]/g, '');
}

export function personName(s: Partial<Supplier>): string {
  return [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ').trim();
}

export function supplierDisplayName(s: Partial<Supplier>): string {
  return String(s?.registeredName || '').trim() || personName(s) || '';
}

export function isBalanced(n: number, allowance = BALANCE_ALLOWANCE): boolean {
  return Math.abs(Number(n || 0)) <= allowance;
}

export function normalizeLedger(row: any, type: 'vat' | 'ewt'): LedgerRow {
  return {
    _id: row?._id || makeId(type),
    cv: String(row?.cv || row?.cv_no || row?.cv_number || '').trim(),
    supplier: String(row?.supplier || row?.supplier_name || row?.payee || row?.voucherName || row?.voucher_name || '').trim(),
    date: String(row?.date || row?.transaction_date || '').trim() || '--',
    amount: parseMoney(row?.amount ?? row?.balance ?? row?.ending_balance ?? (type === 'vat' ? row?.vat_amount ?? row?.input_vat : row?.ewt_amount ?? row?.withholding_tax)),
    account: String(row?.account || row?.ledger_account || '').trim(),
    ref: String(row?.ref || row?.reference || row?.gl_ref || '').trim(),
    type,
  };
}

// Characters the BIR DAT/Reliefs format accepts: A-Z, 0-9, space and . , & ( ) ' / -
const BIR_ALLOWED_RE = /^[A-Za-z0-9 .,&()'\/-]*$/;

export function supplierFieldHasSpecial(value: any): boolean {
  const v = String(value ?? '').trim();
  if (!v) return false;
  return !BIR_ALLOWED_RE.test(v);
}

export function birSanitize(value: any): string {
  let s = String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); // strip diacritics
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-'); // smart punctuation -> ascii
  s = s.replace(/[^A-Za-z0-9 .,&()'\/-]/g, ' ');                          // drop anything still unsupported
  return s.replace(/\s+/g, ' ').trim();
}

export const MONTH_NAMES = [
  ['Jan', 'january', 'jan'],
  ['Feb', 'february', 'feb'],
  ['Mar', 'march', 'mar'],
  ['Apr', 'april', 'apr'],
  ['May', 'may'],
  ['Jun', 'june', 'jun'],
  ['Jul', 'july', 'jul'],
  ['Aug', 'august', 'aug'],
  ['Sep', 'september', 'sept', 'sep'],
  ['Oct', 'october', 'oct'],
  ['Nov', 'november', 'nov'],
  ['Dec', 'december', 'dec']
];

export function monthInfo(month: number, year: string | number) {
  const m = Math.max(1, Math.min(12, Number(month) || 1));
  const mm = String(m).padStart(2, '0');
  const yr = String(year || '').trim();
  return {
    key: yr ? `${yr}-${mm}` : `m${mm}`,
    label: `${MONTH_NAMES[m - 1][0]}${yr ? ' ' + yr : ''}`,
    order: yr ? Number(yr) * 100 + m : m,
  };
}

export function monthInfoFromDate(value: any) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '--' || raw === '-' || raw.toLowerCase() === 'n/a') {
    return { key: 'undated', label: 'Undated', order: 999999 };
  }
  let m = raw.match(/^\s*(\d{4})[-\/.](\d{1,2})(?:[-\/.](\d{1,2}))?/);
  if (m) return monthInfo(Number(m[2]), m[1]);
  m = raw.match(/^\s*(\d{1,2})[-\/.](\d{1,2})(?:[-\/.](\d{2,4}))?/);
  if (m) {
    const first = Number(m[1]), second = Number(m[2]);
    const month = first > 12 ? second : first;
    let yr = m[3] || '';
    if (yr && yr.length === 2) yr = '20' + yr;
    return monthInfo(month, yr);
  }
  const lower = raw.toLowerCase();
  const y = (raw.match(/\b(19\d{2}|20\d{2})\b/) || [])[1] || '';
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (MONTH_NAMES[i].some(alias => new RegExp(`\\b${alias}\\b`).test(lower))) {
      return monthInfo(i + 1, y);
    }
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return monthInfo(parsed.getMonth() + 1, String(parsed.getFullYear()));
  }
  return { key: 'undated', label: 'Undated', order: 999999 };
}

export function recordMonthKey(row: any): string {
  return monthInfoFromDate(row?.date).key;
}

export function yearOfKey(key: string): string {
  return /^(\d{4})-\d{2}$/.test(String(key)) ? String(key).slice(0, 4) : '';
}

export function excelSerialToYmd(serial: number) {
  const ms = Math.round(serial) * 86400000 + Date.UTC(1899, 11, 30);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function ymd(year: number, month: number, day: number): number {
  const y = Number(year) || 0, m = Number(month) || 1, d = Number(day) || 1;
  return y * 10000 + m * 100 + d;
}

export function fullYear(year: string | number): number {
  let y = Number(year) || 0;
  if (y > 0 && y < 100) y += y <= 69 ? 2000 : 1900;
  return y;
}

export function parseWorkSortDate(value: any): number {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '--' || raw === '-' || raw.toLowerCase() === 'n/a') return Number.POSITIVE_INFINITY;
  const strict = dateSortNumber(raw);
  if (strict !== null) return strict;
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && numeric > 20000 && numeric < 70000) {
      const fromSerial = excelSerialToYmd(numeric);
      if (fromSerial !== null) return fromSerial;
    }
  }
  let m = raw.match(/^\s*(\d{4})[-\/.](\d{1,2})(?:[-\/.](\d{1,2}))?/);
  if (m) return ymd(Number(m[1]), Number(m[2]), Number(m[3] || 1));
  m = raw.match(/^\s*(\d{1,2})[-\/.](\d{1,2})(?:[-\/.](\d{2,4}))?/);
  if (m) {
    const first = Number(m[1]), second = Number(m[2]);
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    return ymd(fullYear(m[3] || ''), month, day);
  }
  const lower = raw.toLowerCase();
  const day = Number((raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/i) || [])[1] || 1);
  const yearToken = (raw.match(/\b(\d{4})\b/) || raw.match(/\b(\d{2})\b(?!.*\b\d{1,2}\b)/) || [])[1];
  const year = fullYear(yearToken);
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (MONTH_NAMES[i].some(alias => new RegExp(`\\b${alias}\\b`, 'i').test(lower))) {
      return ymd(year, i + 1, day);
    }
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return ymd(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }
  return Number.POSITIVE_INFINITY;
}

export function naturalCompareText(a: any, b: any): number {
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' });
}

export function compactList(values: any[], empty = '--'): string {
  const seen: string[] = [];
  values.forEach(v => {
    const s = String(v ?? '').trim();
    if (s && !seen.includes(s)) seen.push(s);
  });
  if (!seen.length) return empty;
  if (seen.length === 1) return seen[0];
  return `Mixed (${seen.length})`;
}

export function applySupplierToTransaction(t: Transaction, s: Supplier): Transaction {
  return {
    ...t,
    supplier: supplierDisplayName(s),
    tin: s.tin,
    registeredName: s.registeredName || '',
    lastName: s.lastName || '',
    firstName: s.firstName || '',
    middleName: s.middleName || '',
    address: s.address || '',
    city: s.city || '',
    zip: s.zip || ''
  };
}
