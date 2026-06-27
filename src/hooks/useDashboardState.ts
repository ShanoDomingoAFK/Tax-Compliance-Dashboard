import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Transaction,
  LedgerRow,
  Supplier,
  ATCEntry,
  VATCategory,
  MonthInfo,
  YearInfo
} from '../types';
import {
  makeId,
  parseMoney,
  normalizeImportDate,
  normalizeATC,
  atcText,
  parseRate,
  normalizeVatCodeRaw,
  normalizeVatCategoryMaster,
  normalizeAtcMaster,
  normalizeSupplier,
  normalizeLedger,
  supplierFieldHasSpecial,
  birSanitize,
  monthInfoFromDate,
  recordMonthKey,
  yearOfKey,
  naturalCompareText,
  parseWorkSortDate,
  isBalanced,
  compactList,
  formatTIN,
  normalizeTIN,
  supplierDisplayName,
  parseVerification,
  isAdjustingEntry,
  applySupplierToTransaction
} from '../utils/helpers';
import {
  COMPANY_PROFILE,
  demoVatCategories,
  demoAtcMaster,
  demoSupplierMaster
} from '../data/demo';

const TX_KEY = 'vatPurchaseVoucherVerificationTxCleanV1';
const VAT_LEDGER_KEY = 'vatPurchaseVatLedgerCleanV1';
const EWT_LEDGER_KEY = 'vatPurchaseEwtLedgerCleanV1';
const SUPPLIER_MASTER_KEY = 'vatPurchaseSupplierMasterV1';
const ATC_MASTER_KEY = 'vatPurchaseAtcMasterDatabaseOnlyV1';
const VAT_CATEGORIES_KEY = 'vatPurchaseVatCategoriesMasterV1';

export function useDashboardState() {
  // --- Master Data State ---
  const [vatCategories, setVatCategories] = useState<VATCategory[]>(() => {
    try {
      const raw = localStorage.getItem(VAT_CATEGORIES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(normalizeVatCategoryMaster);
      }
    } catch (_) {}
    return demoVatCategories;
  });

  const [atcMaster, setAtcMaster] = useState<ATCEntry[]>(() => {
    try {
      const raw = localStorage.getItem(ATC_MASTER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(normalizeAtcMaster);
      }
    } catch (_) {}
    return demoAtcMaster;
  });

  const [supplierMaster, setSupplierMaster] = useState<Supplier[]>(() => {
    try {
      const raw = localStorage.getItem(SUPPLIER_MASTER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(normalizeSupplier);
      }
    } catch (_) {}
    return demoSupplierMaster;
  });

  // --- Transactions & Ledger State ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const raw = localStorage.getItem(TX_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(t => normalizeTransaction(t));
      }
    } catch (_) {}
    return [];
  });

  const [vatLedger, setVatLedger] = useState<LedgerRow[]>(() => {
    try {
      const raw = localStorage.getItem(VAT_LEDGER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(r => normalizeLedger(r, 'vat'));
      }
    } catch (_) {}
    return [];
  });

  const [ewtLedger, setEwtLedger] = useState<LedgerRow[]>(() => {
    try {
      const raw = localStorage.getItem(EWT_LEDGER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(r => normalizeLedger(r, 'ewt'));
      }
    } catch (_) {}
    return [];
  });

  // --- UI Filter & Navigation State ---
  const [activeTab, setActiveTab] = useState<'summary' | 'sales' | 'working' | 'vat' | 'ewt' | 'bir' | 'masters'>('summary');
  const [activeMasterSub, setActiveMasterSub] = useState<'vatCategories' | 'atcRates' | 'suppliers'>('vatCategories');
  const [activeYear, setActiveYear] = useState<string>('all');
  const [activeMonth, setActiveMonth] = useState<string>('all');
  const [activePurchaseBreakdown, setActivePurchaseBreakdown] = useState<'vat' | 'ewt' | null>(null);

  const [workSort, setWorkSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'asc' });
  const [summarySort, setSummarySort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'first', dir: 'asc' });
  const [summaryViewMode, setSummaryViewMode] = useState<'count' | 'amount'>('count');
  const [activeSummaryStatus, setActiveSummaryStatus] = useState<string>('');
  const [activeBirReport, setActiveBirReport] = useState<string>('slpExcel');

  const [focusedCV, setFocusedCV] = useState<string | null>(null);
  const [activeSummaryReview, setActiveSummaryReview] = useState<{ mode: 'supplier' | 'cv'; key: string } | null>(null);
  const [summaryGroupMode, setSummaryGroupMode] = useState<'supplier' | 'cv'>('supplier');

  // Search queries
  const [summarySearch, setSummarySearch] = useState<string>('');
  const [workingSearch, setWorkingSearch] = useState<string>('');
  const [vatSearch, setVatSearch] = useState<string>('');
  const [ewtSearch, setEwtSearch] = useState<string>('');
  const [vatCategorySearch, setVatCategorySearch] = useState<string>('');
  const [atcSearch, setAtcSearch] = useState<string>('');
  const [supplierSearch, setSupplierSearch] = useState<string>('');

  // Dropdown states for balances filters
  const [vatBalanceFilter, setVatBalanceFilter] = useState<string>('');
  const [ewtBalanceFilter, setEwtBalanceFilter] = useState<string>('');
  const [workStatusFilter, setWorkStatusFilter] = useState<string>('');
  const [varianceFilter, setVarianceFilter] = useState<string>('');
  const [summaryVatTypeFilter, setSummaryVatTypeFilter] = useState<string>('');

  // --- Auto-Save and Local Persistence Trigger ---
  useEffect(() => {
    localStorage.setItem(TX_KEY, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(VAT_LEDGER_KEY, JSON.stringify(vatLedger));
  }, [vatLedger]);

  useEffect(() => {
    localStorage.setItem(EWT_LEDGER_KEY, JSON.stringify(ewtLedger));
  }, [ewtLedger]);

  useEffect(() => {
    localStorage.setItem(SUPPLIER_MASTER_KEY, JSON.stringify(supplierMaster));
  }, [supplierMaster]);

  useEffect(() => {
    localStorage.setItem(ATC_MASTER_KEY, JSON.stringify(atcMaster));
  }, [atcMaster]);

  useEffect(() => {
    localStorage.setItem(VAT_CATEGORIES_KEY, JSON.stringify(vatCategories));
  }, [vatCategories]);

  // --- Master Data Query Helpers ---
  function atcLookup(code: string): ATCEntry | null {
    const normalized = normalizeATC(code);
    if (!normalized) return null;
    return atcMaster.find(a => normalizeATC(a.atcCode) === normalized) || null;
  }

  function atcRateForCode(code: string): number | null {
    const found = atcLookup(code);
    return found && Number.isFinite(found.rate) ? (found.rate as number) : null;
  }

  function atcRateText(code: string): string {
    const rate = atcRateForCode(code);
    return rate === null ? '--' : rate.toFixed(2).replace(/\.00$/, '') + '%';
  }

  function vatCategoryLookup(code: string): VATCategory | null {
    const normalized = normalizeVatCodeRaw(code);
    return vatCategories.find(c => c.code === normalized) || null;
  }

  function vatCategoryText(code: string): string {
    const c = vatCategoryLookup(code);
    return c ? `${c.code} - ${c.label}` : '--';
  }

  function vatRateForCategory(code: string): number | null {
    const c = vatCategoryLookup(code);
    return c ? c.rate : null;
  }

  function isVatableCategory(code: string): boolean {
    const rate = vatRateForCategory(code);
    return Number(rate || 0) > 0;
  }

  function findSupplierByTIN(tin: string): Supplier | null {
    const needle = normalizeTIN(tin);
    if (!needle) return null;
    return supplierMaster.find(s => normalizeTIN(s.tin) === needle) || null;
  }

  // --- Tax calculations based on transaction ---
  function computeVATFromCategory(vatable: number, category: string): number {
    const rate = vatRateForCategory(category);
    if (rate === null) return 0;
    return Number(vatable || 0) * rate / 100;
  }

  function taxableBaseFromAmount(amount: number, category: string): number {
    return isVatableCategory(category) ? Number(amount || 0) : 0;
  }

  function nonTaxableBaseFromAmount(amount: number, category: string): number {
    return category && !isVatableCategory(category) ? Number(amount || 0) : 0;
  }

  function expectedEwtAmount(t: { amount: number; atcCode: string }): number {
    const rate = atcRateForCode(t.atcCode);
    if (rate === null) return 0;
    return t.amount * rate / 100;
  }

  function computeAmounts(raw: any) {
    const directAmount = parseMoney(
      raw.amount ??
      raw.purchase_amount ??
      raw.base_amount ??
      raw.tax_base_amount ??
      raw.vatable ??
      raw.vatableAmount ??
      raw.vatable_amount ??
      raw.nonVatable ??
      raw.nonVat ??
      raw.non_vat ??
      raw.non_vat_amount ??
      raw.non_vatable_amount ??
      raw.net ??
      raw.net_amount
    );
    const legacyVat = parseMoney(raw.vat ?? raw.vatAmount ?? raw.vat_amount);
    const legacyGross = parseMoney(raw.gross ?? raw.gross_amount);
    const nonVatVal = parseMoney(raw.nonVatable ?? raw.nonVat ?? raw.non_vat ?? raw.non_vat_amount ?? raw.non_vatable_amount);
    const vatCategory = raw.vatCategory ?? raw.vat_category ?? raw.vat_category_code ?? raw.vatCode ?? raw.vat_code ?? raw.tax_code ?? '';
    let amount = directAmount;
    if (amount === 0 && legacyGross > 0 && legacyVat > 0) amount = legacyGross - legacyVat;
    
    // Inferred vat category if blank
    let finalCat = String(vatCategory).trim().toUpperCase();
    if (!finalCat) {
      if (legacyVat > 0) finalCat = 'S';
      else if (nonVatVal > 0) finalCat = 'SNQ';
    }

    const vatable = taxableBaseFromAmount(amount, finalCat);
    const nonVatable = nonTaxableBaseFromAmount(amount, finalCat);
    const vat = computeVATFromCategory(vatable, finalCat);
    let total = parseMoney(raw.total ?? raw.totalAmount ?? raw.total_amount ?? raw.gross ?? raw.gross_amount);
    if (total === 0) total = amount + vat;
    return { amount, vatable, nonVatable, vat, total, vatCategory: finalCat };
  }

  function normalizeTransaction(t: any): Transaction {
    const a = computeAmounts(t || {});
    const supplierRaw = String(t?.supplier ?? t?.registeredName ?? t?.registered_name ?? t?.supplierName ?? t?.supplier_name ?? '').trim();
    const voucherName = String(t?.voucherName ?? t?.voucher_name ?? t?.voucher ?? t?.voucher_payee ?? t?.payee ?? t?.book_payee ?? t?.booked_payee ?? supplierRaw ?? '').trim();
    const atcCode = normalizeATC(t?.atcCode ?? t?.atc_code ?? t?.atc ?? t?.withholding_atc ?? t?.ewt_rate ?? t?.ewt);
    const ewtAmount = expectedEwtAmount({ amount: a.amount, atcCode });
    const vatReg = a.vat > 0 ? 'VAT-reg' : 'Non-VAT';

    return {
      _id: t?._id || makeId('tx'),
      voucherName: voucherName || supplierRaw || '(No Voucher Name)',
      supplier: supplierRaw,
      tin: formatTIN(t?.tin || t?.supplier_tin || ''),
      cv: String(t?.cv ?? t?.cv_no ?? t?.cv_number ?? '').trim(),
      inv: String(t?.inv ?? t?.invoice_no ?? t?.invoice ?? t?.or_no ?? '').trim(),
      date: String(t?.date ?? t?.payment_date ?? t?.document_date ?? '').trim() || '--',
      description: String(t?.description ?? t?.desc ?? t?.nature ?? t?.particulars ?? '').trim(),
      ...a,
      vatReg,
      ewtAmount,
      atcCode,
      manualStatus: parseVerification(t?.manualStatus ?? t?.status ?? t?.compliance ?? t?.verification ?? t?.document_status),
      reviewNote: String(t?.reviewNote ?? t?.review_note ?? t?.note ?? '').trim(),
      lastReviewed: String(t?.lastReviewed ?? t?.last_reviewed ?? '').trim(),
      accountingTitle: String(t?.accountingTitle ?? t?.accounting_title ?? t?.accounting_titles ?? t?.account_title ?? t?.accounting ?? '').trim(),
      bankAccount: String(t?.bankAccount ?? t?.bank_account ?? t?.bank ?? t?.cash_bank_account ?? '').trim(),
      registeredName: String(t?.registeredName ?? t?.registered_name ?? '').trim(),
      lastName: String(t?.lastName ?? t?.last_name ?? t?.registered_last_name ?? '').trim(),
      firstName: String(t?.firstName ?? t?.first_name ?? t?.registered_first_name ?? '').trim(),
      middleName: String(t?.middleName ?? t?.middle_name ?? t?.registered_middle_name ?? '').trim(),
      address: String(t?.address ?? t?.registeredAddress ?? t?.registered_address ?? '').trim(),
      city: String(t?.city ?? t?.registered_city ?? '').trim(),
      zip: String(t?.zip ?? t?.zip_code ?? t?.registered_zip_code ?? '').trim(),
      supplierManualOverride: Boolean(t?.supplierManualOverride ?? t?.supplier_manual_override)
    };
  }

  // --- Dynamic Month & Year Buckets ---
  const monthBuckets = useMemo<MonthInfo[]>(() => {
    const map = new Map<string, MonthInfo>();
    const add = (dateStr: string) => {
      const info = monthInfoFromDate(dateStr);
      if (!map.has(info.key)) map.set(info.key, info);
    };
    transactions.forEach(t => add(t.date));
    vatLedger.forEach(r => add(r.date));
    ewtLedger.forEach(r => add(r.date));
    return Array.from(map.values()).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [transactions, vatLedger, ewtLedger]);

  const yearBuckets = useMemo<YearInfo[]>(() => {
    const map = new Map<string, YearInfo>();
    monthBuckets.forEach(m => {
      const yr = yearOfKey(m.key) || 'undated';
      if (!map.has(yr)) {
        map.set(yr, { year: yr, order: yr === 'undated' ? 999999 : Number(yr) });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [monthBuckets]);

  // Keep filters in bounds when data changes
  useEffect(() => {
    if (activeYear !== 'all' && !yearBuckets.some(y => y.year === activeYear)) {
      setActiveYear('all');
    }
  }, [yearBuckets, activeYear]);

  useEffect(() => {
    if (activeMonth !== 'all' && !monthBuckets.some(m => m.key === activeMonth)) {
      setActiveMonth('all');
    }
  }, [monthBuckets, activeMonth]);

  // Fiscal match checks
  function recordMatchesActiveMonth(row: { date: string }): boolean {
    const key = recordMonthKey(row);
    if (activeMonth !== 'all') return key === activeMonth;
    if (activeYear !== 'all') return yearOfKey(key) === activeYear;
    return true;
  }

  // Filtered visibility lists
  const visibleTransactions = useMemo(() => transactions.filter(recordMatchesActiveMonth), [transactions, activeMonth, activeYear]);
  const visibleVatLedger = useMemo(() => vatLedger.filter(recordMatchesActiveMonth), [vatLedger, activeMonth, activeYear]);
  const visibleEwtLedger = useMemo(() => ewtLedger.filter(recordMatchesActiveMonth), [ewtLedger, activeMonth, activeYear]);

  // --- Balance Reconciliation Engine ---
  const cvGroups = useMemo(() => {
    const map = new Map<string, {
      cv: string;
      txns: Transaction[];
      vatRows: LedgerRow[];
      ewtRows: LedgerRow[];
      bookVat: number;
      bookEwt: number;
      bookTotal: number;
      vatLedger: number;
      ewtLedger: number;
      vatDiff: number;
      ewtDiff: number;
      voucherNames: string;
      dateDisplay: string;
      accountingTitles: string;
      bankAccounts: string;
      suppliers: string;
      status: { ok: number; warn: number; err: number; unreviewed: number; journal: number; adjusting: number; okPct: number; warnPct: number; errPct: number; journalPct: number; adjustingPct: number; reviewPct: number; status: string };
    }>();

    const ensure = (cv: string) => {
      const key = cv || '(No CV Number)';
      if (!map.has(key)) {
        map.set(key, {
          cv: key,
          txns: [],
          vatRows: [],
          ewtRows: [],
          bookVat: 0,
          bookEwt: 0,
          bookTotal: 0,
          vatLedger: 0,
          ewtLedger: 0,
          vatDiff: 0,
          ewtDiff: 0,
          voucherNames: '',
          dateDisplay: '',
          accountingTitles: '',
          bankAccounts: '',
          suppliers: '',
          status: { ok: 0, warn: 0, err: 0, unreviewed: 0, journal: 0, adjusting: 0, okPct: 0, warnPct: 0, errPct: 0, journalPct: 0, adjustingPct: 0, reviewPct: 0, status: 'unreviewed' }
        });
      }
      return map.get(key)!;
    };

    visibleTransactions.forEach(t => ensure(t.cv).txns.push(t));
    visibleVatLedger.forEach(r => ensure(r.cv).vatRows.push(r));
    visibleEwtLedger.forEach(r => ensure(r.cv).ewtRows.push(r));

    return Array.from(map.values()).map(g => {
      let bookVatSum = 0;
      let bookEwtSum = 0;
      let bookTotalSum = 0;
      g.txns.forEach(t => {
        bookVatSum += t.vat;
        bookEwtSum += t.ewtAmount;
        bookTotalSum += t.total;
      });

      g.bookVat = bookVatSum;
      g.bookEwt = bookEwtSum;
      g.bookTotal = bookTotalSum;
      g.vatLedger = g.vatRows.reduce((a, r) => a + r.amount, 0);
      g.ewtLedger = g.ewtRows.reduce((a, r) => a + r.amount, 0);
      g.vatDiff = g.bookVat - g.vatLedger;
      g.ewtDiff = g.bookEwt - g.ewtLedger;

      g.voucherNames = compactList(g.txns.map(t => t.voucherName), '--');
      g.dateDisplay = compactList(g.txns.map(t => t.date), '--');
      g.accountingTitles = compactList(g.txns.map(t => t.accountingTitle), '--');
      g.bankAccounts = compactList(g.txns.map(t => t.bankAccount), '--');
      g.suppliers = compactList(g.txns.map(t => t.supplier || 'For verification'), '--');
      g.status = groupStatus(g.txns);
      return g;
    });
  }, [visibleTransactions, visibleVatLedger, visibleEwtLedger]);

  function groupStatus(txns: Transaction[]) {
    const total = txns.length || 1;
    const ok = txns.filter(t => t.manualStatus === 'ok').length;
    const warn = txns.filter(t => t.manualStatus === 'warn').length;
    const err = txns.filter(t => t.manualStatus === 'err').length;
    const unreviewed = txns.filter(t => t.manualStatus === 'unreviewed').length;
    const journal = txns.filter(t => t.manualStatus === 'journal').length;
    const adjusting = txns.filter(t => t.manualStatus === 'adjusting').length;

    const okPct = Math.round(ok / total * 100);
    const warnPct = Math.round(warn / total * 100);
    const errPct = Math.round(err / total * 100);
    const journalPct = Math.round(journal / total * 100);
    const adjustingPct = Math.round(adjusting / total * 100);
    const reviewPct = Math.max(0, 100 - okPct - warnPct - errPct - journalPct - adjustingPct);

    let status = 'ok';
    if (err > 0) status = 'err';
    else if (warn > 0) status = 'warn';
    else if (unreviewed > 0) status = 'unreviewed';
    else if (ok > 0) status = 'ok';
    else if (journal > 0) status = 'journal';
    else if (adjusting > 0) status = 'adjusting';

    return { ok, warn, err, unreviewed, journal, adjusting, okPct, warnPct, errPct, journalPct, adjustingPct, reviewPct, status };
  }

  // --- Sorting & Searching Transactions Tab (CV Groups) ---
  const filteredCVGroups = useMemo(() => {
    let result = cvGroups;
    const search = workingSearch.toLowerCase().trim();

    if (search) {
      result = result.filter(g =>
        g.cv.toLowerCase().includes(search) ||
        g.voucherNames.toLowerCase().includes(search) ||
        g.suppliers.toLowerCase().includes(search) ||
        g.txns.some(t =>
          [t.voucherName, t.supplier, t.tin, t.inv, t.date, t.description, t.accountingTitle, t.bankAccount, t.reviewNote]
            .some(v => String(v || '').toLowerCase().includes(search))
        ) ||
        g.vatRows.some(r => [r.cv, r.supplier, r.date, r.amount, r.account].some(v => String(v || '').toLowerCase().includes(search))) ||
        g.ewtRows.some(r => [r.cv, r.supplier, r.date, r.amount, r.account].some(v => String(v || '').toLowerCase().includes(search)))
      );
    }

    if (workStatusFilter) {
      result = result.filter(g => g.txns.some(t => t.manualStatus === workStatusFilter));
    }

    if (varianceFilter === 'vat') {
      result = result.filter(g => !isBalanced(g.vatDiff));
    } else if (varianceFilter === 'ewt') {
      result = result.filter(g => !isBalanced(g.ewtDiff));
    } else if (varianceFilter === 'any') {
      result = result.filter(g => !isBalanced(g.vatDiff) || !isBalanced(g.ewtDiff));
    }

    // Apply Sorting
    const key = workSort.key;
    const dir = workSort.dir === 'desc' ? -1 : 1;
    const getSortVal = (g: any) => {
      switch (key) {
        case 'date':
          return Math.min(...g.txns.map((t: any) => parseWorkSortDate(t.date)).concat([Number.POSITIVE_INFINITY]));
        case 'voucher':
          return g.voucherNames;
        case 'vat':
          return g.bookVat;
        case 'ewt':
          return g.bookEwt;
        case 'total':
          return g.bookTotal;
        case 'balance':
          return (isBalanced(g.vatDiff) && isBalanced(g.ewtDiff)) ? 0 : 1;
        case 'verification':
          const rankMap: Record<string, number> = { ok: 0, journal: 1, adjusting: 2, warn: 3, unreviewed: 4, err: 5 };
          return rankMap[g.status.status] ?? 99;
        case 'cv':
        default:
          return g.cv;
      }
    };

    return [...result].sort((a, b) => {
      const valA = getSortVal(a);
      const valB = getSortVal(b);
      let cmp = 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        cmp = naturalCompareText(valA, valB);
      } else {
        cmp = Number(valA) - Number(valB);
        if (Number.isNaN(cmp)) cmp = 0;
      }
      if (cmp === 0 && key !== 'date') {
        const dateA = Math.min(...a.txns.map((t: any) => parseWorkSortDate(t.date)).concat([Number.POSITIVE_INFINITY]));
        const dateB = Math.min(...b.txns.map((t: any) => parseWorkSortDate(t.date)).concat([Number.POSITIVE_INFINITY]));
        cmp = dateA - dateB;
      }
      return cmp * dir;
    });
  }, [cvGroups, workingSearch, workStatusFilter, varianceFilter, workSort]);

  // --- Filtering & Sorting Summary Tab ---
  function groupKey(t: Transaction, mode: 'supplier' | 'cv'): string {
    const supplier = t.supplier || '(For verification)';
    if (mode === 'cv') return t.cv || '(No CV Number)';
    return supplier;
  }

  const consolidatedSummaryGroups = useMemo(() => {
    const mode = summaryGroupMode;
    const search = summarySearch.toLowerCase().trim();
    let txFiltered = visibleTransactions;

    if (search) {
      txFiltered = txFiltered.filter(t => {
        const searchable = [
          t.supplier,
          t.tin,
          t.address,
          t.city,
          t.zip,
          t.cv,
          t.inv,
          t.date,
          t.description,
          t.reviewNote
        ];
        return searchable.some(v => String(v || '').toLowerCase().includes(search));
      });
    }

    if (activeSummaryStatus) {
      txFiltered = txFiltered.filter(t => t.manualStatus === activeSummaryStatus);
    }

    if (summaryVatTypeFilter) {
      txFiltered = txFiltered.filter(t => (t.vat > 0 ? 'VAT-reg' : 'Non-VAT') === summaryVatTypeFilter);
    }

    const groupMap = new Map<string, {
      key: string;
      txns: Transaction[];
      voucherDisplay: string;
      supplierDisplay: string;
      tinDisplay: string;
      cvDisplay: string;
      vatRegDisplay: 'VAT-reg' | 'Non-VAT';
    }>();

    txFiltered.forEach(t => {
      const key = groupKey(t, mode);
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          txns: [],
          voucherDisplay: '',
          supplierDisplay: '',
          tinDisplay: '',
          cvDisplay: '',
          vatRegDisplay: 'Non-VAT'
        });
      }
      groupMap.get(key)!.txns.push(t);
    });

    const groupsList = Array.from(groupMap.values()).map(g => {
      g.voucherDisplay = compactList(g.txns.map(t => t.voucherName), '(No Voucher Name)');
      g.supplierDisplay = compactList(g.txns.map(t => t.supplier || 'For verification'), '(For verification)');
      g.tinDisplay = compactList(g.txns.map(t => t.tin), '--');
      g.cvDisplay = compactList(g.txns.map(t => t.cv), '(No CV Number)');
      g.vatRegDisplay = g.txns.some(t => t.vat > 0) ? 'VAT-reg' : 'Non-VAT';
      return g;
    });

    // Apply sorting
    const sKey = summarySort.key;
    const sDir = summarySort.dir === 'desc' ? -1 : 1;

    const getSummarySortVal = (g: any) => {
      switch (sKey) {
        case 'first':
          return mode === 'supplier' ? g.supplierDisplay : g.key;
        case 'second':
          return mode === 'supplier' ? g.tinDisplay : g.supplierDisplay;
        case 'vattype':
          return g.vatRegDisplay;
        case 'txn':
          return g.txns.length;
        case 'amount':
          return g.txns.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        case 'vat':
          return g.txns.reduce((sum: number, t: any) => sum + (t.vat || 0), 0);
        case 'total':
          return g.txns.reduce((sum: number, t: any) => sum + (t.total || 0), 0);
        case 'ewt':
          return g.txns.reduce((sum: number, t: any) => sum + (t.ewtAmount || 0), 0);
        case 'score':
          return groupStatus(g.txns).okPct;
        case 'status':
          const rankMap: Record<string, number> = { ok: 0, journal: 1, adjusting: 2, warn: 3, unreviewed: 4, err: 5 };
          return rankMap[groupStatus(g.txns).status] ?? 99;
        default:
          return mode === 'supplier' ? g.supplierDisplay : g.key;
      }
    };

    return groupsList.sort((a, b) => {
      const valA = getSummarySortVal(a);
      const valB = getSummarySortVal(b);
      let cmp = 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        cmp = naturalCompareText(valA, valB);
      } else {
        cmp = Number(valA) - Number(valB);
        if (Number.isNaN(cmp)) cmp = 0;
      }
      if (cmp === 0 && sKey !== 'first') {
        cmp = naturalCompareText(
          mode === 'supplier' ? a.supplierDisplay : a.key,
          mode === 'supplier' ? b.supplierDisplay : b.key
        );
      }
      return cmp * sDir;
    });
  }, [visibleTransactions, summarySearch, activeSummaryStatus, summaryVatTypeFilter, summarySort, summaryGroupMode]);

  // --- LEDGER RECONCILIATION LISTS ---
  const vatLedgerReconciliation = useMemo(() => {
    return ledgerRowsByCV('vat');
  }, [visibleVatLedger, cvGroups, vatSearch, vatBalanceFilter]);

  const ewtLedgerReconciliation = useMemo(() => {
    return ledgerRowsByCV('ewt');
  }, [visibleEwtLedger, cvGroups, ewtSearch, ewtBalanceFilter]);

  function ledgerRowsByCV(type: 'vat' | 'ewt') {
    const rows = type === 'vat' ? visibleVatLedger : visibleEwtLedger;
    const search = (type === 'vat' ? vatSearch : ewtSearch).toLowerCase().trim();
    const filter = type === 'vat' ? vatBalanceFilter : ewtBalanceFilter;

    const map = new Map<string, {
      cv: string;
      rows: LedgerRow[];
      ledgerAmount: number;
      purchaseAmount: number;
      diff: number;
      suppliers: string;
      status: 'balanced' | 'unbalanced';
    }>();

    rows.forEach(r => {
      const cv = r.cv || '(No CV Number)';
      if (!map.has(cv)) {
        map.set(cv, {
          cv,
          rows: [],
          ledgerAmount: 0,
          purchaseAmount: 0,
          diff: 0,
          suppliers: '',
          status: 'unbalanced'
        });
      }
      const g = map.get(cv)!;
      g.rows.push(r);
      g.ledgerAmount += r.amount;
    });

    // Merge in cvGroups totals
    cvGroups.forEach(g => {
      const cv = g.cv;
      if (!map.has(cv)) {
        map.set(cv, {
          cv,
          rows: [],
          ledgerAmount: 0,
          purchaseAmount: 0,
          diff: 0,
          suppliers: '',
          status: 'unbalanced'
        });
      }
      const item = map.get(cv)!;
      item.purchaseAmount = type === 'vat' ? g.bookVat : g.bookEwt;
      item.suppliers = compactList(item.rows.map(r => r.supplier).concat(g.txns.map(t => t.voucherName || t.supplier)));
    });

    let result = Array.from(map.values()).map(item => {
      item.diff = item.purchaseAmount - item.ledgerAmount;
      item.status = isBalanced(item.diff) ? 'balanced' : 'unbalanced';
      return item;
    });

    if (search) {
      result = result.filter(item =>
        item.cv.toLowerCase().includes(search) ||
        item.suppliers.toLowerCase().includes(search) ||
        item.rows.some(r => [r.cv, r.supplier, r.date, r.amount, r.account, r.ref].some(v => String(v || '').toLowerCase().includes(search)))
      );
    }

    if (filter) {
      result = result.filter(item => item.status === filter);
    }

    return result.sort((a, b) => naturalCompareText(a.cv, b.cv));
  }

  // --- QuickBooks Parser & Workbook Auto-Mapper ---
  function parseQuickBooksWorkbook(wb: XLSX.WorkBook): { type: string; syntheticRows: any[][]; count: number } | { error: boolean; type: string; message: string } | null {
    if (!wb || !wb.SheetNames || !wb.SheetNames.length) return null;
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    if (!ws) return null;
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
    
    // Find header row (must contain date, name, no)
    let hi = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const toks = (rows[i] || []).map(cell => String(cell ?? '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/\.$/, ''));
      if (toks.includes('date') && toks.includes('name') && toks.includes('no')) {
        hi = i;
        break;
      }
    }

    // Title context for type guessing
    const titleRows = hi >= 0 ? rows.slice(0, hi) : rows.slice(0, 6);
    const contextText = titleRows.map(r => (r || []).map(cell => String(cell ?? '').trim()).join(' ')).join(' ') + ' ' + sheetName;
    const lowerCtx = contextText.toLowerCase();

    // Map column names
    const colmap: Record<string, number> = {};
    if (hi >= 0) {
      (rows[hi] || []).forEach((cell, idx) => {
        const k = String(cell ?? '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/\.$/, '');
        if (k && colmap[k] === undefined) colmap[k] = idx;
      });
    }

    const has = (k: string) => colmap[k] !== undefined;

    // Detect type
    let type = '';
    if (has('tax name')) {
      type = 'vatLedger';
    } else if (has('account') && has('split') && has('debit') && has('credit')) {
      type = has('balance') ? 'book' : 'ewtLedger';
    } else {
      if (/vat summary report|tax detail report/.test(lowerCtx)) {
        type = 'vatLedger';
      } else if (/transaction detail by account/.test(lowerCtx)) {
        type = 'book';
      } else if (/withholding/.test(lowerCtx)) {
        type = 'ewtLedger';
      }
    }

    if (!type) return null;

    if (hi < 0) {
      return {
        error: true,
        type,
        message: `This looks like a QuickBooks ${type === 'book' ? 'Disbursement Transactions' : type === 'vatLedger' ? 'Input VAT Balances' : 'EWT Balances'} file, but the column header row (with Date, No., Name…) could not be found. Export the standard QuickBooks report without deleting the header rows.`
      };
    }

    const idxOf = (...names: string[]) => {
      for (const n of names) {
        if (colmap[n] !== undefined) return colmap[n];
      }
      return undefined;
    };

    const getv = (r: any[], ...names: string[]) => {
      const idx = idxOf(...names);
      return idx === undefined ? '' : String((r || [])[idx] ?? '').replace(/\s+/g, ' ').trim();
    };

    const requiredCols = {
      book: [['date'], ['no'], ['name'], ['account'], ['split'], ['debit']],
      vatLedger: [['date'], ['no'], ['name'], ['tax name'], ['amount']],
      ewtLedger: [['date'], ['no'], ['name'], ['credit']]
    }[type as 'book' | 'vatLedger' | 'ewtLedger'];

    const missing = requiredCols.filter(alts => !alts.some(a => colmap[a] !== undefined)).map(alts => alts[0]);
    if (missing.length) {
      return {
        error: true,
        type,
        message: `This looks like a QuickBooks ${type === 'book' ? 'Disbursement Transactions' : type === 'vatLedger' ? 'Input VAT Balances' : 'EWT Balances'} file, but these required columns were not found: ${missing.join(', ')}. Export the standard QuickBooks report without removing or renaming columns.`
      };
    }

    const data = rows.slice(hi + 1);
    let header: string[] = [];
    const built: any[][] = [];

    if (type === 'book') {
      header = ['date', 'cv_no', 'voucher_name', 'registered_name', 'description', 'accounting_title', 'bank_account', 'amount', 'invoice_no', 'tin'];
      data.forEach(r => {
        const date = getv(r, 'date');
        if (!date) return; // skip subheaders/totals/blanks
        const account = getv(r, 'account');
        // Skip bank cash-in rows or tax summaries (handled by vat/ewt ledger imports)
        const lowerAcc = account.toLowerCase();
        if (lowerAcc.startsWith('cash in bank') || lowerAcc.includes('vat summary report') || lowerAcc.includes('withholding tax')) return;

        const amount = parseMoney(getv(r, 'debit')) || parseMoney(getv(r, 'credit'));
        if (!amount) return;
        const name = getv(r, 'name');
        built.push([
          date,
          getv(r, 'no'),
          name,
          name,
          getv(r, 'memo/description', 'memo'),
          account,
          getv(r, 'split'),
          Math.abs(amount),
          '',
          ''
        ]);
      });
    } else if (type === 'vatLedger') {
      header = ['cv_no', 'supplier_name', 'date', 'vat_amount', 'ledger_account', 'reference'];
      data.forEach(r => {
        const date = getv(r, 'date');
        if (!date) return;
        if (getv(r, 'tax name').toLowerCase() !== 'tax (purchases)') return; // only input VAT
        const amt = parseMoney(getv(r, 'amount'));
        if (!amt) return;
        built.push([
          getv(r, 'no'),
          getv(r, 'name'),
          date,
          Math.abs(amt),
          'Input VAT',
          getv(r, 'no')
        ]);
      });
    } else { // ewtLedger
      header = ['cv_no', 'supplier_name', 'date', 'ewt_amount', 'ledger_account', 'reference'];
      data.forEach(r => {
        const date = getv(r, 'date');
        if (!date) return;
        const amt = parseMoney(getv(r, 'credit')) || parseMoney(getv(r, 'debit'));
        if (!amt) return;
        built.push([
          getv(r, 'no'),
          getv(r, 'name'),
          date,
          Math.abs(amt),
          getv(r, 'account') || 'Withholding Tax - Expanded',
          getv(r, 'no')
        ]);
      });
    }

    if (!built.length) {
      return {
        error: true,
        type,
        message: `Detected a QuickBooks ${type === 'book' ? 'Disbursement Transactions' : type === 'vatLedger' ? 'Input VAT Balances' : 'EWT Balances'} file, but found no valid data lines to import.`
      };
    }

    return { type, syntheticRows: [header, ...built], count: built.length };
  }

  // --- Batch Import Handler ---
  function importMappedRows(
    syntheticRows: any[][],
    type: 'book' | 'vatLedger' | 'ewtLedger' | 'vatCategoryMaster' | 'atcMaster' | 'supplierMaster',
    replaceOnImport: boolean,
    onSuccess: (added: number, skipped: number, issues: any[]) => void,
    onFailure: (err: string) => void
  ) {
    if (syntheticRows.length < 2) {
      onFailure('Spreadsheet must have a header row and data.');
      return;
    }
    const headers = syntheticRows[0].map((h: any) => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
    let added = 0;
    let skipped = 0;
    const built: any[] = [];
    const issues: any[] = [];

    const pick = (row: any, ...keys: string[]) => {
      for (const key of keys) {
        const k = String(key || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k];
      }
      return '';
    };

    syntheticRows.slice(1).forEach((vals, rowOffset) => {
      const xlsxRowNumber = rowOffset + 2;
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = String(vals[i] ?? '').trim();
      });

      if (!Object.values(row).some(v => String(v ?? '').trim() !== '')) return;

      if (type === 'book') {
        const tin = pick(row, 'tin', 'supplier_tin');
        const found = findSupplierByTIN(tin);
        const supplierFromImport = pick(row, 'registered_name', 'registered_supplier', 'supplier_registered_name', 'supplier_name', 'supplier', 'vendor');
        const supplier = found ? supplierDisplayName(found) : supplierFromImport;
        const voucherName = pick(row, 'voucher_name', 'voucher', 'voucher_payee', 'booked_payee', 'book_payee', 'payee') || supplier;
        const cv = pick(row, 'cv_no', 'cv', 'cv_number', 'voucher_no', 'check_voucher');
        const accountingTitle = pick(row, 'accounting_title', 'accounting_titles', 'account_title', 'accounting', 'gl_account', 'expense_account');
        const bankAccount = pick(row, 'bank_account', 'bank', 'cash_bank_account', 'disbursement_bank');
        const rawDate = pick(row, 'date', 'payment_date', 'document_date');
        const date = normalizeImportDate(rawDate);
        const rawVatCategory = pick(row, 'vat_category', 'vat_category_code', 'vat_code', 'tax_code');
        const vatCategory = normalizeVatCodeRaw(rawVatCategory);
        const rawAtcCode = pick(row, 'atc_code', 'atc', 'withholding_atc', 'ewt_atc');
        const atcCode = normalizeATC(rawAtcCode);

        let bad = false;
        if (!voucherName) {
          issues.push({ rowNumber: xlsxRowNumber, field: 'voucher_name', message: 'Missing voucher name or supplier name.', cv, voucher: voucherName });
          bad = true;
        }
        if (!cv) {
          issues.push({ rowNumber: xlsxRowNumber, field: 'cv_no', message: 'Missing CV number.', cv, voucher: voucherName });
          bad = true;
        }
        if (!rawDate) {
          issues.push({ rowNumber: xlsxRowNumber, field: 'date', message: 'Missing date. Required format is MM/DD/YYYY.', cv, voucher: voucherName });
          bad = true;
        } else if (!date) {
          issues.push({ rowNumber: xlsxRowNumber, field: 'date', message: `Invalid date "${rawDate}". Required format is MM/DD/YYYY.`, cv, voucher: voucherName });
          bad = true;
        }
        if (!accountingTitle) {
          issues.push({ rowNumber: xlsxRowNumber, field: 'accounting_title', message: 'Missing accounting title.', cv, voucher: voucherName });
          bad = true;
        }
        if (!bankAccount) {
          issues.push({ rowNumber: xlsxRowNumber, field: 'bank_account', message: 'Missing bank account.', cv, voucher: voucherName });
          bad = true;
        }

        if (bad) {
          skipped++;
          return;
        }

        const amount = pick(row, 'amount', 'purchase_amount', 'base_amount', 'tax_base_amount', 'vatable_amount', 'vatable', 'non_vatable_amount', 'non_vat_amount');
        const total = pick(row, 'total_amount', 'total', 'gross_amount', 'gross');

        const baseTx = normalizeTransaction({
          _id: makeId('tx'),
          voucherName,
          supplier,
          tin,
          cv,
          inv: pick(row, 'invoice_no', 'invoice', 'or_no'),
          date,
          description: pick(row, 'description', 'particulars', 'nature'),
          accountingTitle,
          bankAccount,
          amount,
          vatCategory,
          total,
          atcCode,
          manualStatus: pick(row, 'compliance', 'verification', 'status') || 'unreviewed',
          reviewNote: pick(row, 'review_note', 'note'),
          lastReviewed: '',
          address: found ? found.address : pick(row, 'registered_address', 'address'),
          city: found ? found.city : pick(row, 'city'),
          zip: found ? found.zip : pick(row, 'zip_code', 'zip'),
          supplierManualOverride: false
        });

        built.push(found ? applySupplierToTransaction(baseTx, found) : baseTx);
        added++;
      } else if (type === 'vatLedger') {
        const cv = pick(row, 'cv_no', 'cv', 'cv_number');
        const rawAmount = pick(row, 'vat_amount', 'amount', 'balance', 'ledger_amount');
        let bad = false;
        if (!cv) { issues.push({ rowNumber: xlsxRowNumber, field: 'cv_no', message: 'Missing CV number.', cv, voucher: pick(row, 'voucher_name', 'supplier_name') }); bad = true; }
        if (!rawAmount) { issues.push({rowNumber: xlsxRowNumber, field: 'vat_amount', message: 'Missing VAT balance amount.', cv, voucher: pick(row, 'voucher_name', 'supplier_name')}); bad = true; }
        if (bad) { skipped++; return; }
        built.push(normalizeLedger({ cv, supplier: pick(row, 'voucher_name', 'supplier_name', 'supplier'), date: pick(row, 'date', 'posting_date'), amount: parseMoney(rawAmount), account: pick(row, 'ledger_account', 'account'), ref: pick(row, 'reference', 'ref') }, 'vat'));
        added++;
      } else if (type === 'ewtLedger') {
        const cv = pick(row, 'cv_no', 'cv', 'cv_number');
        const rawAmount = pick(row, 'ewt_amount', 'amount', 'balance', 'ledger_amount');
        let bad = false;
        if (!cv) { issues.push({ rowNumber: xlsxRowNumber, field: 'cv_no', message: 'Missing CV number.', cv, voucher: pick(row, 'voucher_name', 'supplier_name') }); bad = true; }
        if (!rawAmount) { issues.push({ rowNumber: xlsxRowNumber, field: 'ewt_amount', message: 'Missing EWT balance amount.', cv, voucher: pick(row, 'voucher_name', 'supplier_name') }); bad = true; }
        if (bad) { skipped++; return; }
        built.push(normalizeLedger({ cv, supplier: pick(row, 'voucher_name', 'supplier_name', 'supplier'), date: pick(row, 'date', 'posting_date'), amount: parseMoney(rawAmount), account: pick(row, 'ledger_account', 'account'), ref: pick(row, 'reference', 'ref') }, 'ewt'));
        added++;
      } else if (type === 'vatCategoryMaster') {
        const rawCode = pick(row, 'vat_category', 'vat_category_code', 'code', 'category');
        const code = normalizeVatCodeRaw(rawCode);
        const rawRate = pick(row, 'rate', 'vat_rate', 'percentage');
        const rateIssue = rawRate === '' ? 'missing' : (parseRate(rawRate) === null ? 'invalid' : '');
        let bad = false;
        if (!code) { issues.push({ rowNumber: xlsxRowNumber, field: 'vat_category', message: 'Missing VAT Category code.' }); bad = true; }
        if (rateIssue) { issues.push({ rowNumber: xlsxRowNumber, field: 'rate', message: rateIssue === 'missing' ? 'Missing VAT rate.' : 'Invalid VAT rate. Use 12, 12%, or 0 for non-VAT categories.' }); bad = true; }
        if (bad) { skipped++; return; }
        built.push(normalizeVatCategoryMaster({ code, label: pick(row, 'description', 'label', 'meaning', 'desc'), kind: pick(row, 'vat_type', 'type', 'kind'), rate: parseRate(rawRate) }));
        added++;
      } else if (type === 'atcMaster') {
        const rawCode = pick(row, 'atc_code', 'atc');
        const code = normalizeATC(rawCode);
        const rawRate = pick(row, 'rate', 'ewt_rate', 'percentage');
        const rateIssue = rawRate === '' ? 'missing' : (parseRate(rawRate) === null ? 'invalid' : '');
        let bad = false;
        if (!rawCode) { issues.push({ rowNumber: xlsxRowNumber, field: 'atc_code', message: 'Missing ATC Code.' }); bad = true; }
        else if (!code) { issues.push({ rowNumber: xlsxRowNumber, field: 'atc_code', message: `Invalid ATC Code "${rawCode}".` }); bad = true; }
        if (rateIssue) { issues.push({ rowNumber: xlsxRowNumber, field: 'rate', message: rateIssue === 'missing' ? 'Missing EWT rate.' : 'Invalid EWT rate. Use 2, 2%, or 0.02.' }); bad = true; }
        if (bad) { skipped++; return; }
        built.push(normalizeAtcMaster({ atcCode: code, rate: parseRate(rawRate), description: pick(row, 'description', 'desc'), source: pick(row, 'source', 'reference') }));
        added++;
      } else if (type === 'supplierMaster') {
        const tin = pick(row, 'tin', 'supplier_tin');
        if (!tin) {
          issues.push({ rowNumber: xlsxRowNumber, field: 'tin', message: 'Missing supplier TIN.' });
          skipped++;
          return;
        }
        built.push(normalizeSupplier({ tin, registeredName: pick(row, 'registered_name', 'corporation_name', 'supplier_name'), lastName: pick(row, 'registered_last_name', 'last_name'), firstName: pick(row, 'registered_first_name', 'first_name'), middleName: pick(row, 'registered_middle_name', 'middle_name'), address: pick(row, 'registered_address', 'address'), city: pick(row, 'city'), zip: pick(row, 'zip_code', 'zip') }));
        added++;
      }
    });

    if (type === 'book') {
      setTransactions(prev => replaceOnImport ? built : [...prev, ...built]);
    } else if (type === 'vatLedger') {
      setVatLedger(prev => replaceOnImport ? built : [...prev, ...built]);
    } else if (type === 'ewtLedger') {
      setEwtLedger(prev => replaceOnImport ? built : [...prev, ...built]);
    } else if (type === 'vatCategoryMaster') {
      setVatCategories(prev => {
        const merged = replaceOnImport ? built : [...prev, ...built];
        const map = new Map<string, VATCategory>();
        merged.forEach(c => { if (c.code) map.set(c.code, c); });
        return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
      });
    } else if (type === 'atcMaster') {
      setAtcMaster(prev => {
        const merged = replaceOnImport ? built : [...prev, ...built];
        const map = new Map<string, ATCEntry>();
        merged.forEach(a => { if (a.atcCode) map.set(normalizeATC(a.atcCode), a); });
        return Array.from(map.values()).sort((a, b) => a.atcCode.localeCompare(b.atcCode));
      });
    } else if (type === 'supplierMaster') {
      setSupplierMaster(prev => {
        const merged = replaceOnImport ? built : [...prev, ...built];
        const map = new Map<string, Supplier>();
        merged.forEach(s => { if (normalizeTIN(s.tin)) map.set(normalizeTIN(s.tin), s); });
        return Array.from(map.values()).sort((a, b) => supplierDisplayName(a).localeCompare(supplierDisplayName(b)));
      });
    }

    onSuccess(added, skipped, issues);
  }

  // --- BIR Exports Logic ---
  function slpPeriodInfo() {
    let year = '';
    let month = '';
    if (/^\d{4}-\d{2}$/.test(activeMonth)) {
      year = activeMonth.slice(0, 4);
      month = activeMonth.slice(5, 7);
    }
    if (!year || !month) {
      const row = visibleTransactions[0] || transactions[0] || {};
      const info = monthInfoFromDate(row.date);
      if (/^\d{4}-\d{2}$/.test(info.key)) {
        year = info.key.slice(0, 4);
        month = info.key.slice(5, 7);
      }
    }
    if (!year || !month) {
      const now = new Date();
      year = String(now.getFullYear());
      month = String(now.getMonth() + 1).padStart(2, '0');
    }
    const end = new Date(Number(year), Number(month), 0);
    const mm = String(end.getMonth() + 1).padStart(2, '0');
    const dd = String(end.getDate()).padStart(2, '0');
    return {
      date: `${mm}/${dd}/${end.getFullYear()}`,
      token: `${mm}${end.getFullYear()}`
    };
  }

  function slpDatAmountBuckets(t: Transaction) {
    const amount = t.amount;
    const vat = Number(t.vat || 0);
    const cat = normalizeVatCodeRaw(t.vatCategory);
    const buckets = { exempt: 0, zero: 0, services: 0, capital: 0, goods: 0, inputVat: vat };
    if (cat === 'S') buckets.services = amount;
    else if (cat === 'CG') buckets.capital = amount;
    else if (cat === 'G' || cat === 'I') buckets.goods = amount;
    else if (cat === 'SNQ' || cat === 'GNQ' || !cat) buckets.exempt = amount;
    return buckets;
  }

  function birEligibleTransactions(): Transaction[] {
    return visibleTransactions.filter(t => !isAdjustingEntry(t));
  }

  function birNonCashSourceRows(): Transaction[] {
    return birEligibleTransactions().filter(t => hasVatCategoryCode(t) || hasAtcCode(t));
  }

  function hasVatCategoryCode(t: Transaction): boolean {
    return Boolean(normalizeVatCodeRaw(t.vatCategory));
  }

  function hasAtcCode(t: Transaction): boolean {
    return atcText(t.atcCode) !== '--';
  }

  function slpExcelSourceRows(): Transaction[] {
    return birNonCashSourceRows();
  }

  function validateSLPDatSourceRows(rows: Transaction[]) {
    const issues: any[] = [];
    rows.forEach((t, idx) => {
      const missing: string[] = [];
      const tin = slpTin9(t.tin);
      const nameParts = slpSupplierNameParts(t);
      if (tin.length !== 9) missing.push('9-digit supplier TIN');
      if (!nameParts.hasName) missing.push('supplier registered name or individual name');
      if (!String(t.address || '').trim()) missing.push('registered address');
      if (!t.city) missing.push('city');

      if (missing.length) {
        issues.push({
          row: idx + 1,
          cv: String(t.cv || '(No CV)').trim(),
          voucher: String(t.voucherName || '(No voucher)').trim(),
          invoice: String(t.inv || '(No invoice)').trim(),
          missing
        });
      }
    });
    return issues;
  }

  function slpTin9(value: string) {
    return normalizeTIN(value).slice(0, 9);
  }

  function slpSupplierNameParts(t: Transaction) {
    const last = String(t.lastName || '').trim();
    const first = String(t.firstName || '').trim();
    const middle = String(t.middleName || '').trim();
    const isIndividual = Boolean(last || first);
    const registered = String(t.registeredName || '').trim();
    const corp = isIndividual ? '' : (registered || String(t.supplier || '').trim());
    return {
      corp,
      last: isIndividual ? last : '',
      first: isIndividual ? first : '',
      middle: isIndividual ? middle : '',
      isIndividual,
      hasName: Boolean(corp || last || first)
    };
  }

  // --- Master Manipulation State Actions ---
  function deleteTransaction(id: string) {
    setTransactions(prev => prev.filter(t => t._id !== id));
  }

  function updateTransaction(id: string, updatedFields: Partial<Transaction>) {
    setTransactions(prev => prev.map(t => {
      if (t._id === id) {
        const combined = { ...t, ...updatedFields };
        return normalizeTransaction(combined);
      }
      return t;
    }));
  }

  function addTransaction(row: Partial<Transaction>) {
    const fresh = normalizeTransaction(row);
    setTransactions(prev => [...prev, fresh]);
    return fresh;
  }

  return {
    COMPANY_PROFILE,
    vatCategories,
    setVatCategories,
    atcMaster,
    setAtcMaster,
    supplierMaster,
    setSupplierMaster,
    transactions,
    setTransactions,
    vatLedger,
    setVatLedger,
    ewtLedger,
    setEwtLedger,

    // UI Tab Navigation
    activeTab,
    setActiveTab,
    activeMasterSub,
    setActiveMasterSub,
    activeYear,
    setActiveYear,
    activeMonth,
    setActiveMonth,
    activePurchaseBreakdown,
    setActivePurchaseBreakdown,

    // Filters & Sorting
    workSort,
    setWorkSort,
    summarySort,
    setSummarySort,
    summaryViewMode,
    setSummaryViewMode,
    summaryGroupMode,
    setSummaryGroupMode,
    activeSummaryStatus,
    setActiveSummaryStatus,
    activeBirReport,
    setActiveBirReport,
    focusedCV,
    setFocusedCV,
    activeSummaryReview,
    setActiveSummaryReview,

    // Search query states
    summarySearch,
    setSummarySearch,
    workingSearch,
    setWorkingSearch,
    vatSearch,
    setVatSearch,
    ewtSearch,
    setEwtSearch,
    vatCategorySearch,
    setVatCategorySearch,
    atcSearch,
    setAtcSearch,
    supplierSearch,
    setSupplierSearch,

    // Dropdowns
    vatBalanceFilter,
    setVatBalanceFilter,
    ewtBalanceFilter,
    setEwtBalanceFilter,
    workStatusFilter,
    setWorkStatusFilter,
    varianceFilter,
    setVarianceFilter,
    summaryVatTypeFilter,
    setSummaryVatTypeFilter,

    // Month / Year list buckets
    monthBuckets,
    yearBuckets,
    visibleTransactions,
    visibleVatLedger,
    visibleEwtLedger,

    // Consolidated Data Maps
    cvGroups,
    filteredCVGroups,
    consolidatedSummaryGroups,
    vatLedgerReconciliation,
    ewtLedgerReconciliation,

    // Action creators
    deleteTransaction,
    updateTransaction,
    addTransaction,
    atcLookup,
    atcRateForCode,
    atcRateText,
    vatCategoryLookup,
    vatCategoryText,
    vatRateForCategory,
    findSupplierByTIN,
    parseQuickBooksWorkbook,
    importMappedRows,
    slpPeriodInfo,
    slpExcelSourceRows,
    slpDatAmountBuckets,
    slpSupplierNameParts,
    slpTin9,
    validateSLPDatSourceRows,
    hasAtcCode,
    hasVatCategoryCode,
    birEligibleTransactions,
    birNonCashSourceRows,
    recordMatchesActiveMonth,
    ewtSourceRows: () => birNonCashSourceRows().filter(t => hasAtcCode(t) || Number(t.ewtAmount || 0) > 0),
    birCashSourceRows: () => birEligibleTransactions()
  };
}
