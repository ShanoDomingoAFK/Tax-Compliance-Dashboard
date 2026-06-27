import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';
import Peso from './Peso';
import { Transaction, VATCategory, ATCEntry } from '../types';
import {
  pesoText,
  birSanitize,
  formatTIN,
  normalizeTIN,
  isExemptEntry,
  isAdjustingEntry,
  atcText,
  normalizeATC
} from '../utils/helpers';
import { COMPANY_PROFILE } from '../data/demo';

interface BirSheetProps {
  visibleTransactions: Transaction[];
  transactions: Transaction[];
  vatCategories: VATCategory[];
  atcMaster: ATCEntry[];
  activeMonth: string;
  activeMonthLabel: string;
  slpPeriodInfo: () => { date: string; token: string };
  slpExcelSourceRows: () => Transaction[];
  slpDatAmountBuckets: (t: Transaction) => any;
  slpSupplierNameParts: (t: Transaction) => any;
  slpTin9: (value: string) => string;
  validateSLPDatSourceRows: (rows: Transaction[]) => any[];
  hasAtcCode: (t: Transaction) => boolean;
  hasVatCategoryCode: (t: Transaction) => boolean;
  birNonCashSourceRows: () => Transaction[];
  birCashSourceRows: () => Transaction[];
  ewtSourceRows: () => Transaction[];
  birEligibleTransactions: () => Transaction[];
}

export default function BirSheet({
  visibleTransactions,
  transactions,
  vatCategories,
  atcMaster,
  activeMonth,
  activeMonthLabel,
  slpPeriodInfo,
  slpExcelSourceRows,
  slpDatAmountBuckets,
  slpSupplierNameParts,
  slpTin9,
  validateSLPDatSourceRows,
  hasAtcCode,
  hasVatCategoryCode,
  birNonCashSourceRows,
  birCashSourceRows,
  ewtSourceRows,
  birEligibleTransactions
}: BirSheetProps) {

  const [activeBirReport, setActiveBirReport] = React.useState<string>('slpExcel');
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  // Helper date serializers
  function excelSerialFromDate(d: Date): number {
    const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    const epoch = Date.UTC(1899, 11, 30);
    return Math.round((utc - epoch) / 86400000);
  }

  function slpExcelPeriodEndDate(): Date {
    const period = slpPeriodInfo();
    const [mm, dd, yyyy] = period.date.split('/').map(v => Number(v));
    return new Date(yyyy, mm - 1, dd);
  }

  function formatTin9Hyphen(value: string) {
    const tin = slpTin9(value);
    return tin.length === 9 ? `${tin.slice(0, 3)}-${tin.slice(3, 6)}-${tin.slice(6, 9)}` : tin;
  }

  function slpExcelSupplierAddress(t: Transaction): string {
    return birSanitize([t.address, t.city, t.zip].map(v => String(v || '').trim()).filter(Boolean).join(' '));
  }

  function slpExcelNameFields(t: Transaction) {
    const parts = slpSupplierNameParts(t);
    const individual = [parts.last, parts.first, parts.middle].filter(Boolean).join(', ');
    return {
      registeredName: birSanitize(parts.corp ? parts.corp : ''),
      individualName: birSanitize(parts.corp ? '' : (individual || String(t.supplier || '').trim()))
    };
  }

  // --- Core Exporters ---

  // 1. SLP Excel Export
  function exportSLPExcel() {
    if (activeMonth === 'all') {
      alert('Select one month before exporting SLP Excel.');
      return;
    }
    const sourceRows = slpExcelSourceRows();
    if (!sourceRows.length) {
      alert(`No SLP Excel rows to export for ${activeMonthLabel}.`);
      return;
    }
    const issues = validateSLPDatSourceRows(sourceRows);
    if (issues.length) {
      alert('Cannot export SLP Excel yet. Resolve outstanding supplier master errors first.');
      return;
    }

    const period = slpPeriodInfo();
    const monthEnd = slpExcelPeriodEndDate();
    const monthSerial = excelSerialFromDate(monthEnd);

    const rows: any[][] = [
      ['PURCHASE TRANSACTION', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['RECONCILIATION OF LISTING FOR ENFORCEMENT', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [`TIN : ${slpTin9(COMPANY_PROFILE.tin)}`, '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [`OWNER'S NAME: ${COMPANY_PROFILE.registeredName}`, '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [`OWNER'S TRADE NAME : ${COMPANY_PROFILE.tradeName}`, '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [`OWNER'S ADDRESS:  ${[COMPANY_PROFILE.address, COMPANY_PROFILE.cityZip].filter(Boolean).join(' ')}`, '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['TAXABLE', 'TAXPAYER', 'REGISTERED NAME', 'NAME OF SUPPLIER', "SUPPLIER'S ADDRESS", 'AMOUNT OF', 'AMOUNT OF', 'AMOUNT OF', 'AMOUNT OF', 'AMOUNT OF', 'AMOUNT OF', 'AMOUNT OF', 'AMOUNT OF', 'AMOUNT OF'],
      ['MONTH', 'IDENTIFICATION', '', '(Last Name, First Name, Middle Name)', '', 'GROSS PURCHASE', 'EXEMPT PURCHASE', 'ZERO-RATED PURCHASE', 'TAXABLE PURCHASE', 'PURCHASE OF SERVICES', 'PURCHASE OF CAPITAL GOODS', 'PURCHASE OF GOODS OTHER THAN CAPITAL GOODS', 'INPUT TAX', 'GROSS TAXABLE PURCHASE'],
      ['', 'NUMBER', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)', '(10)', '(11)', '(12)', '(13)', '(14)']
    ];

    const totals = { gross: 0, exempt: 0, zero: 0, taxable: 0, services: 0, capital: 0, goods: 0, inputVat: 0, grossTaxable: 0 };

    sourceRows.forEach(t => {
      const b = slpDatAmountBuckets(t);
      const amount = t.amount;
      const vat = Number(t.vat || 0);
      const taxable = b.services + b.capital + b.goods;
      const grossTaxable = taxable + vat;
      const names = slpExcelNameFields(t);

      const row = [
        monthSerial,
        formatTin9Hyphen(t.tin),
        names.registeredName,
        names.individualName,
        slpExcelSupplierAddress(t),
        amount,
        b.exempt,
        b.zero,
        taxable,
        b.services,
        b.capital,
        b.goods,
        vat,
        grossTaxable
      ];
      rows.push(row);

      totals.gross += Number(row[5] || 0);
      totals.exempt += Number(row[6] || 0);
      totals.zero += Number(row[7] || 0);
      totals.taxable += Number(row[8] || 0);
      totals.services += Number(row[9] || 0);
      totals.capital += Number(row[10] || 0);
      totals.goods += Number(row[11] || 0);
      totals.inputVat += Number(row[12] || 0);
      totals.grossTaxable += Number(row[13] || 0);
    });

    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Grand Total :', '', '', '', '', totals.gross, totals.exempt, totals.zero, totals.taxable, totals.services, totals.capital, totals.goods, totals.inputVat, totals.grossTaxable]);
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['END OF REPORT', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    const cleanRows = rows.map(r => r.map(v => v == null ? '' : v));
    const ws = XLSX.utils.aoa_to_sheet(cleanRows);
    ws['!cols'] = [
      { wch: 12 }, { wch: 16 }, { wch: 38 }, { wch: 38 }, { wch: 54 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 22 }, { wch: 34 }, { wch: 16 }, { wch: 22 }
    ];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 13 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: 13 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: 13 } },
      { s: { r: 8, c: 0 }, e: { r: 8, c: 13 } }
    ];

    for (let r = 14; r < cleanRows.length; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
      if (cell) {
        cell.t = 'n';
        cell.z = 'm/d/yyyy';
      }
      for (let c = 5; c <= 13; c++) {
        const moneyCell = ws[XLSX.utils.encode_cell({ r, c })];
        if (moneyCell) moneyCell.z = '#,##0.00';
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const fileMonth = activeMonth.replace('-', '_');
    XLSX.writeFile(wb, `${slpTin9(COMPANY_PROFILE.tin)}_SLP_PURCHASES_${fileMonth}.xlsx`);
  }

  // 2. SLP DAT Export
  function exportSLPDAT() {
    if (activeMonth === 'all') {
      alert('Select one month before exporting SLP DAT.');
      return;
    }
    const sourceRows = slpExcelSourceRows();
    const validationIssues = validateSLPDatSourceRows(sourceRows);
    if (validationIssues.length) {
      alert('Cannot export SLP DAT yet. Complete supplier master requirements first.');
      return;
    }
    if (sourceRows.length === 0) {
      alert(`No SLP DAT detail rows to export for ${activeMonthLabel}.`);
      return;
    }

    const period = slpPeriodInfo();
    const companyTin = slpTin9(COMPANY_PROFILE.tin);
    const detailMap = new Map<string, any>();

    sourceRows.forEach(t => {
      const tin = slpTin9(t.tin);
      const name = slpSupplierNameParts(t);
      const corp = name.corp;
      const last = name.last;
      const first = name.first;
      const middle = name.middle;
      const address = String(t.address || '').trim();
      const city = String(t.city || '').trim();
      const key = [tin, corp, last, first, middle, address, city].join('|');

      if (!detailMap.has(key)) {
        detailMap.set(key, { tin, corp, last, first, middle, address, city, exempt: 0, zero: 0, services: 0, capital: 0, goods: 0, inputVat: 0 });
      }
      const item = detailMap.get(key);
      const b = slpDatAmountBuckets(t);
      item.exempt += b.exempt;
      item.zero += b.zero;
      item.services += b.services;
      item.capital += b.capital;
      item.goods += b.goods;
      item.inputVat += b.inputVat;
    });

    const details = Array.from(detailMap.values()).sort((a, b) => (a.corp || a.last).localeCompare(b.corp || b.last) || a.tin.localeCompare(b.tin));
    const totals = details.reduce((a, r) => {
      a.exempt += r.exempt;
      a.zero += r.zero;
      a.services += r.services;
      a.capital += r.capital;
      a.goods += r.goods;
      a.inputVat += r.inputVat;
      return a;
    }, { exempt: 0, zero: 0, services: 0, capital: 0, goods: 0, inputVat: 0 });

    const slpDatQuote = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const slpDatNum = (val: number) => val.toFixed(2);

    const header = [
      'H',
      COMPANY_PROFILE.filingType,
      slpDatQuote(companyTin),
      slpDatQuote(birSanitize(COMPANY_PROFILE.registeredName)),
      slpDatQuote(birSanitize(COMPANY_PROFILE.lastName)),
      slpDatQuote(birSanitize(COMPANY_PROFILE.firstName)),
      slpDatQuote(birSanitize(COMPANY_PROFILE.middleName)),
      slpDatQuote(birSanitize(COMPANY_PROFILE.tradeName)),
      slpDatQuote(birSanitize(COMPANY_PROFILE.address)),
      slpDatQuote(birSanitize(COMPANY_PROFILE.cityZip)),
      slpDatNum(totals.exempt),
      slpDatNum(totals.zero),
      slpDatNum(totals.services),
      slpDatNum(totals.capital),
      slpDatNum(totals.goods),
      slpDatNum(totals.inputVat),
      slpDatNum(totals.inputVat),
      slpDatNum(0),
      COMPANY_PROFILE.branchCode,
      period.date,
      COMPANY_PROFILE.taxRateCode
    ].join(',');

    const lines = [header];
    details.forEach(r => {
      lines.push([
        'D',
        COMPANY_PROFILE.filingType,
        slpDatQuote(r.tin),
        slpDatQuote(r.corp),
        slpDatQuote(r.last),
        slpDatQuote(r.first),
        slpDatQuote(r.middle),
        slpDatQuote(r.address),
        slpDatQuote(r.city),
        slpDatNum(r.exempt),
        slpDatNum(r.zero),
        slpDatNum(r.services),
        slpDatNum(r.capital),
        slpDatNum(r.goods),
        slpDatNum(r.inputVat),
        companyTin,
        period.date
      ].join(','));
    });

    const text = lines.join('\r\n') + '\r\n';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${companyTin}P${period.token}.DAT`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Helper QAP data builders
  function qapPeriodText() {
    const info = slpPeriodInfo();
    return `${info.token.slice(0, 2)}/${info.token.slice(2)}`;
  }

  function qapAtcCompact(code: string) {
    return normalizeATC(code).replace(/\s+/g, '');
  }

  function qapTinBranch(value: string) {
    const digits = normalizeTIN(value);
    if (digits.length >= 13) return digits.slice(9, 13);
    if (digits.length >= 12) return digits.slice(9, 12).padStart(4, '0');
    return '0000';
  }

  function qapCompanyBranch() {
    return qapTinBranch(COMPANY_PROFILE.tin);
  }

  function qapDetailRows() {
    const period = qapPeriodText();
    const detailMap = new Map<string, any>();
    
    ewtSourceRows().forEach(t => {
      const names = slpSupplierNameParts(t);
      const tin = slpTin9(t.tin);
      const branch = qapTinBranch(t.tin);
      const atc = qapAtcCompact(t.atcCode);
      const atcFound = atcMaster.find(a => normalizeATC(a.atcCode) === atcText(t.atcCode));
      const rate = atcFound && atcFound.rate !== null ? atcFound.rate : 0;
      const key = [tin, branch, names.corp, names.last, names.first, names.middle, period, atc, rate].join('|');

      if (!detailMap.has(key)) {
        detailMap.set(key, { tin, branch, corp: names.corp, last: names.last, first: names.first, middle: names.middle, period, atc, rate, base: 0, ewt: 0, count: 0 });
      }
      const item = detailMap.get(key);
      item.base += t.amount;
      item.ewt += t.ewtAmount;
      item.count += 1;
    });

    return Array.from(detailMap.values()).sort((a, b) => (a.corp || a.last).localeCompare(b.corp || b.last) || a.tin.localeCompare(b.tin) || a.atc.localeCompare(b.atc));
  }

  // 3. QAP 1601EQ Excel Export
  function exportQAP1601EQExcel() {
    if (activeMonth === 'all') {
      alert('Select one month before exporting QAP Excel.');
      return;
    }
    const source = ewtSourceRows();
    if (!source.length) {
      alert(`No EWT rows to export for ${activeMonthLabel}.`);
      return;
    }
    const details = qapDetailRows();
    const monthEnd = slpExcelPeriodEndDate();
    const monthSerial = excelSerialFromDate(monthEnd);

    const qapExcelPeriodHeading = () => {
      const d = monthEnd;
      const month = d.toLocaleString('en-US', { month: 'long' }).toUpperCase();
      return `FOR THE MONTH ENDING ${month} ${d.getDate()}, ${d.getFullYear()}`;
    };

    const rows: any[][] = [
      ['Attachment to BIR Form 1601-EQ', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['MONTHLY ALPHABETICAL LIST OF PAYEES SUBJECTED TO EXPANDED WITHHOLDING TAX & PAYEES WHOSE INCOME PAYMENTS ARE EXEMPT', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [qapExcelPeriodHeading(), '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [`TIN : ${qapFullTin(slpTin9(COMPANY_PROFILE.tin), qapCompanyBranch())}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [`WITHHOLDING AGENT'S NAME: ${COMPANY_PROFILE.registeredName}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '1ST MONTH OF THE QUARTER', '', '', '2ND MONTH OF THE QUARTER', '', '', '3RD MONTH OF THE QUARTER', '', '', 'TOTAL FOR THE QUARTER', ''],
      ['SEQ', 'TAXPAYER', 'CORPORATION', 'INDIVIDUAL', 'ATC CODE', 'NATURE OF PAYMENT', '', '', '', '', 'AMOUNT OF', 'TAX RATE', 'AMOUNT OF', 'AMOUNT OF', 'TAX RATE', 'AMOUNT OF', 'AMOUNT OF', 'TAX RATE', 'AMOUNT OF', 'TOTAL', 'TOTAL'],
      ['NO', 'IDENTIFICATION', '(Registered Name)', '(Last Name, First Name, Middle Name)', '', '', '', '', '', '', 'INCOME PAYMENT', '', 'TAX WITHHELD', 'INCOME PAYMENT', '', 'TAX WITHHELD', 'INCOME PAYMENT', '', 'TAX WITHHELD', 'INCOME PAYMENT', 'TAX WITHHELD'],
      ['', 'NUMBER', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['(1)', '(2)', '(3)', '(4)', '(5)', '', '', '', '', '', '(6)', '(7)', '(8)', '(9)', '(10)', '(11)', '(12)', '(13)', '(14)', '(15)', '(16)'],
      ['------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------', '------------------------------']
    ];

    const totals = { base: 0, ewt: 0 };
    details.forEach((r, idx) => {
      const name = [r.last, r.first, r.middle].filter(Boolean).join(', ');
      const base = Number(r.base || 0);
      const ewt = Number(r.ewt || 0);
      const rate = Number(r.rate || 0);
      totals.base += base;
      totals.ewt += ewt;

      const atcLookupFound = atcMaster.find(a => normalizeATC(a.atcCode) === r.atc);

      rows.push([
        idx + 1,
        qapFullTin(r.tin, r.branch),
        r.corp || '',
        r.corp ? '' : name,
        r.atc,
        atcLookupFound?.description || '',
        monthSerial,
        base,
        rate,
        ewt,
        base,
        rate,
        ewt,
        0, 0, 0,
        0, 0, 0,
        base,
        ewt
      ]);
    });

    rows.push(['', '', '', '', '', '', '------------------', '------------------', '------------------', '------------------', '------------------', '------------------', '------------------', '------------------', '------------------', '------------------', '------------------', '------------------', '------------------', '------------------', '------------------']);
    rows.push(['Grand Total :', '', '', '', '', '', monthSerial, totals.base, '', totals.ewt, totals.base, '', totals.ewt, 0, '', 0, 0, '', 0, totals.base, totals.ewt]);

    const cleanRows = rows.map(r => r.map(v => v == null ? '' : v));
    const ws = XLSX.utils.aoa_to_sheet(cleanRows);
    ws['!cols'] = [
      { wch: 8 }, { wch: 20 }, { wch: 42 }, { wch: 42 }, { wch: 12 }, { wch: 62 },
      { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 16 },
      { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 18 }
    ];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 20 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 20 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 20 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 20 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: 20 } }
    ];

    const moneyCols = [7, 9, 10, 12, 13, 15, 16, 18, 19, 20];
    const rateCols = [8, 11, 14, 17];
    for (let r = 15; r < cleanRows.length; r++) {
      const dateCell = ws[XLSX.utils.encode_cell({ r, c: 6 })];
      if (dateCell && typeof dateCell.v === 'number') {
        dateCell.t = 'n';
        cellFormatDate(dateCell);
      }
      moneyCols.forEach(c => {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.v !== '' && typeof cell.v === 'number') cell.z = '#,##0.00';
      });
      rateCols.forEach(c => {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.v !== '' && typeof cell.v === 'number') cell.z = '0.00';
      });
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'QAP 1601EQ Schedule 1');
    const token = slpPeriodInfo().token;
    XLSX.writeFile(wb, `${slpTin9(COMPANY_PROFILE.tin)}${qapCompanyBranch()}${token}1601EQ_QAP_Schedule1.xlsx`);
  }

  function cellFormatDate(cell: any) {
    cell.z = 'm/d/yyyy';
  }

  function qapFullTin(tin: string, branch: string) {
    const base = formatTin9Hyphen(tin);
    const b = String(branch || '0000').replace(/\D/g, '').padStart(4, '0').slice(0, 4);
    return base ? `${base}-${b}` : b;
  }

  // 4. QAP 1601EQ DAT Export
  function exportQAP1601EQDAT() {
    if (activeMonth === 'all') {
      alert('Select one month before exporting QAP DAT.');
      return;
    }
    const details = qapDetailRows();
    if (!details.length) {
      alert(`No EWT rows to export for ${activeMonthLabel}.`);
      return;
    }

    const period = slpPeriodInfo();
    const companyTin = slpTin9(COMPANY_PROFILE.tin);
    const companyBranch = qapCompanyBranch();
    const qapPeriod = qapPeriodText();

    const qapTextQuote = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const slpDatNum = (val: number) => val.toFixed(2);

    const totalBase = details.reduce((a, r) => a + Number(r.base || 0), 0);
    const totalEwt = details.reduce((a, r) => a + Number(r.ewt || 0), 0);

    const lines = [
      ['HQAP', 'H1601EQ', companyTin, companyBranch, qapTextQuote(birSanitize(COMPANY_PROFILE.registeredName)), qapPeriod, COMPANY_PROFILE.branchCode].join(',')
    ];

    details.forEach((r, idx) => {
      lines.push([
        'D1',
        '1601EQ',
        idx + 1,
        r.tin,
        r.branch,
        qapTextQuote(r.corp),
        qapTextQuote(r.last),
        qapTextQuote(r.first),
        qapTextQuote(r.middle),
        r.period,
        r.atc,
        r.rate.toFixed(2),
        slpDatNum(r.base),
        slpDatNum(r.ewt)
      ].join(','));
    });

    lines.push(['C1', '1601EQ', companyTin, companyBranch, qapPeriod, slpDatNum(totalBase), slpDatNum(totalEwt)].join(','));

    const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${companyTin}${companyBranch}${period.token}1601EQ.DAT`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Helper book detail converters
  function bookFullTin(value: string) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length >= 12) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9, 12)}`;
    if (digits.length === 9) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
    return String(value || '').trim();
  }

  function supplierBookAddress(t: Transaction): string {
    return birSanitize([t.address, t.city, t.zip].map(v => String(v || '').trim()).filter(Boolean).join(' '));
  }

  function purchaseBookReference(t: Transaction): string {
    return String(t.inv || t.cv || '').trim();
  }

  function parseBookDate(value: any) {
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    const raw = String(value || '').trim();
    if (!raw || raw === '--') return '';
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed;
    return raw;
  }

  function bookDateCell(value: any) {
    const d = parseBookDate(value);
    if (d instanceof Date) return excelSerialFromDate(d);
    return d;
  }

  function subsidiaryPurchaseBookDetailRow(t: Transaction): any[] {
    const amount = t.amount;
    const vat = Number(t.vat || 0);
    const vatable = Number(t.vatable || 0);
    const nonVatable = Number(t.nonVatable || 0);
    const gross = Number(t.total || 0) || amount + vat;
    return [
      bookDateCell(t.date),
      bookFullTin(t.tin),
      slpRegisteredName(t),
      supplierBookAddress(t),
      purchaseBookReference(t),
      String(t.description || '').trim(),
      vatable > 0 ? vatable : '',
      nonVatable > 0 ? nonVatable : '',
      vat > 0 ? vat : '',
      gross || '',
      String(t.accountingTitle ? 'GL-EX' : '').trim(),
      String(t.accountingTitle || '').trim(),
      '',
      ''
    ];
  }

  function slpRegisteredName(t: Transaction) {
    const parts = slpSupplierNameParts(t);
    if (parts.corp) return birSanitize(parts.corp);
    return birSanitize([parts.last, parts.first, parts.middle].filter(Boolean).join(' '));
  }

  // 5. Subsidiary Purchase Book Export
  function exportSubsidiaryPurchaseBookExcel() {
    if (activeMonth === 'all') {
      alert('Select one month before exporting Subsidiary Purchase Book.');
      return;
    }
    const sourceRows = slpExcelSourceRows();
    if (!sourceRows.length) {
      alert(`No purchase rows to export for ${activeMonthLabel}.`);
      return;
    }

    const rows: any[][] = [
      ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['NAME:', `: ${COMPANY_PROFILE.bookName}`, '', '', '', '', '', '', '', '', '', ''],
      ["OWNER'S ADDRESS", `: ${COMPANY_PROFILE.bookAddress}`, '', '', '', '', '', '', '', '', '', ''],
      ['VAT Reg. TIN', `: ${formatTIN(COMPANY_PROFILE.bookTin)}`, '', 'SUBSIDIARY PURCHASE JOURNAL', '', '', '', '', '', '', '', ''],
      ['PERIOD', `: ${activeMonthLabel}`, '', '', '', '', '', '', '', '', '', ''],
      ['PERMIT TO USE NO.', `: ${COMPANY_PROFILE.permitToUseNo}`, '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '0', '', '', '', '', '', '', ''],
      ['DATE', 'TIN', 'VENDOR NAME', 'VENDOR ADDRESS', 'Reference No. *', 'DESCRIPTION', 'VATABLE AMOUNT', 'NON VATABLE AMOUNT', 'TAX AMOUNT', 'GROSS AMOUNT', 'COA CODE', 'COA TITLE', '', '']
    ];

    sourceRows.forEach(t => rows.push(subsidiaryPurchaseBookDetailRow(t)));

    const cleanRows = rows.map(r => r.map(v => v == null ? '' : v));
    const ws = XLSX.utils.aoa_to_sheet(cleanRows);
    ws['!cols'] = [{ wch: 13 }, { wch: 18 }, { wch: 34 }, { wch: 48 }, { wch: 24 }, { wch: 55 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 34 }, { wch: 10 }, { wch: 10 }];
    ws['!merges'] = [{ s: { r: 3, c: 3 }, e: { r: 3, c: 8 } }];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:N1');
    for (let r = 8; r <= range.e.r + 1; r++) {
      const dateCell = ws['A' + r];
      if (dateCell && typeof dateCell.v === 'number') dateCell.z = 'mm/dd/yyyy';
      ['G', 'H', 'I', 'J'].forEach(col => {
        const cell = ws[col + r];
        if (cell && cell.v !== '' && cell.v != null) cell.z = '#,##0.00';
      });
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Journal');
    XLSX.writeFile(wb, `${slpTin9(COMPANY_PROFILE.tin)}_Subsidiary_Purchase_Book_${slpPeriodInfo().token}.xlsx`);
  }

  // 6. Cash Disbursement Book Export
  function exportCashDisbursementBookExcel() {
    if (activeMonth === 'all') {
      alert('Select one month before exporting Cash Disbursement Book.');
      return;
    }
    const sourceRows = birCashSourceRows();
    if (!sourceRows.length) {
      alert(`No cash disbursement rows to export for ${activeMonthLabel}.`);
      return;
    }

    const cashDisbursementBookDetailRow = (t: Transaction) => {
      const gross = Number(t.total || 0) || t.amount + Number(t.vat || 0);
      const ewt = Number(t.ewtAmount || 0);
      const withheld = ewt ? -Math.abs(ewt) : 0;
      const cashAmount = gross + withheld;
      return [
        bookDateCell(t.date),
        bookFullTin(t.tin) || '0',
        slpRegisteredName(t) || '',
        String(t.cv || '').trim(),
        String(t.description || '').trim(),
        cashAmount || '',
        withheld || 0,
        gross || '',
        String(t.bankAccount || '').trim()
      ];
    };

    const details = sourceRows.map(cashDisbursementBookDetailRow);
    const totals = details.reduce((a, r) => {
      a.cash += Number(r[5] || 0);
      a.withheld += Number(r[6] || 0);
      a.gross += Number(r[7] || 0);
      return a;
    }, { cash: 0, withheld: 0, gross: 0 });

    const rows: any[][] = [
      ['', '', '', '', '', '', '', '', ''],
      ['NAME:', `: ${COMPANY_PROFILE.bookName}`, '', '', '', '', '', '', ''],
      ["OWNER'S ADDRESS", `: ${COMPANY_PROFILE.bookAddress}`, '', '', '', '', '', '', ''],
      ['VAT Reg. TIN', `: ${formatTIN(COMPANY_PROFILE.bookTin)}`, '', 'CASH DISBURSEMENT JOURNAL', '', '', '', '', ''],
      ['PERIOD', `: ${activeMonthLabel}`, '', '', '', '', '', '', ''],
      ['PERMIT TO USE NO.', `: ${COMPANY_PROFILE.permitToUseNo}`, '', '', '', '', '', '', ''],
      ['', '', '', '0', '', totals.cash, totals.withheld, totals.gross, ''],
      ['DATE', 'TIN', 'VENDOR NAME', 'CDJ (CV number)', 'DESCRIPTION', 'CASH ACCOUNT', 'WITHHELD TAX', 'GROSS AMOUNT', 'Cash Account']
    ];

    details.forEach(r => rows.push(r));

    const cleanRows = rows.map(r => r.map(v => v == null ? '' : v));
    const ws = XLSX.utils.aoa_to_sheet(cleanRows);
    ws['!cols'] = [{ wch: 13 }, { wch: 18 }, { wch: 34 }, { wch: 24 }, { wch: 60 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 42 }];
    ws['!merges'] = [{ s: { r: 3, c: 3 }, e: { r: 3, c: 7 } }];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:I1');
    for (let r = 9; r <= range.e.r + 1; r++) {
      const dateCell = ws['A' + r];
      if (dateCell && typeof dateCell.v === 'number') dateCell.z = 'mm/dd/yyyy';
      ['F', 'G', 'H'].forEach(col => {
        const cell = ws[col + r];
        if (cell && cell.v !== '' && cell.v != null) cell.z = '#,##0.00';
      });
    }
    ['F7', 'G7', 'H7'].forEach(addr => {
      if (ws[addr]) ws[addr].z = '#,##0.00';
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Disbursement Journal');
    XLSX.writeFile(wb, `${slpTin9(COMPANY_PROFILE.tin)}_Cash_Disbursement_Book_${slpPeriodInfo().token}.xlsx`);
  }

  // Trigger exporter based on selection
  function handleExportSelected() {
    const fnMap: Record<string, () => void> = {
      slpExcel: exportSLPExcel,
      slpDat: exportSLPDAT,
      qapExcel: exportQAP1601EQExcel,
      qapDat: exportQAP1601EQDAT,
      purchaseBook: exportSubsidiaryPurchaseBookExcel,
      cashBook: exportCashDisbursementBookExcel
    };
    const fn = fnMap[activeBirReport];
    if (fn) {
      fn();
    } else {
      alert(`Report export currently not implemented for ${activeBirReport}`);
    }
  }

  // --- Preview Generator Logic ---
  const previewPayload = useMemo(() => {
    // Redraw preview whenever tab, month, or trigger updates
    const t = refreshTrigger; 

    let headers: string[] = [];
    let rows: any[][] = [];
    let issues: any[] = [];
    let note = '';
    let sourceCount = 0;

    const isMonthWideAll = activeMonth === 'all';

    if (activeBirReport === 'slpExcel') {
      const source = slpExcelSourceRows();
      sourceCount = source.length;
      
      const valIssues = validateSLPDatSourceRows(source);
      issues = valIssues.map(i => ({ cv: i.cv, voucher: i.voucher, invoice: i.invoice, message: `Missing or unresolved: ${i.missing.join(', ')}` }));

      headers = ['Taxable Month', 'Supplier TIN', 'Registered Name', 'Name of Supplier', 'Supplier Address', 'Gross Purchase', 'Exempt Purchase', 'Taxable Purchase', 'Services', 'Capital Goods', 'Other Goods', 'Input Tax', 'Gross Taxable'];
      const monthSerial = excelSerialFromDate(slpExcelPeriodEndDate());

      rows = source.slice(0, 15).map(t => {
        const b = slpDatAmountBuckets(t);
        const taxable = b.services + b.capital + b.goods;
        const names = slpExcelNameFields(t);
        return [
          activeMonthLabel,
          formatTin9Hyphen(t.tin),
          names.registeredName,
          names.individualName,
          slpExcelSupplierAddress(t),
          pesoText(t.amount),
          pesoText(b.exempt),
          pesoText(taxable),
          pesoText(b.services),
          pesoText(b.capital),
          pesoText(b.goods),
          pesoText(b.inputVat),
          pesoText(taxable + b.inputVat)
        ];
      });
      note = 'Preview filters out rows missing both VAT Category and ATC Code. Checks supplier details and formats to the BIR SLP monthly Excel sheet.';
    } else if (activeBirReport === 'slpDat') {
      const source = slpExcelSourceRows();
      sourceCount = source.length;
      const valIssues = validateSLPDatSourceRows(source);
      issues = valIssues.map(i => ({ cv: i.cv, voucher: i.voucher, invoice: i.invoice, message: `Missing or unresolved: ${i.missing.join(', ')}` }));

      headers = ['Record', 'Filing', 'Supplier TIN', 'Registered Name', 'Address', 'City', 'Exempt', 'Services', 'Capital Goods', 'Other Goods', 'Input VAT'];
      rows = source.slice(0, 15).map(t => {
        const b = slpDatAmountBuckets(t);
        return [
          'D',
          COMPANY_PROFILE.filingType,
          slpTin9(t.tin),
          slpRegisteredName(t),
          birSanitize(t.address),
          birSanitize(t.city),
          pesoText(b.exempt),
          pesoText(b.services),
          pesoText(b.capital),
          pesoText(b.goods),
          pesoText(b.inputVat)
        ];
      });
      note = 'Exports into comma-separated layout matching the .DAT layout required by RELIEF. Excludes incomplete TINs.';
    } else if (activeBirReport === 'qapExcel') {
      const source = ewtSourceRows();
      sourceCount = source.length;
      issues = validateQAPSourceRows(source);

      headers = ['Seq', 'Taxpayer ID Number', 'Corporation / Individual Name', 'ATC Code', 'Nature of Payment', 'Income Payment', 'Tax Rate', 'Tax Withheld'];
      const details = qapDetailRows();
      rows = details.slice(0, 15).map((r, idx) => {
        const atcLookupFound = atcMaster.find(a => normalizeATC(a.atcCode) === r.atc);
        return [
          idx + 1,
          qapFullTin(r.tin, r.branch),
          r.corp || [r.last, r.first, r.middle].filter(Boolean).join(', '),
          r.atc,
          atcLookupFound?.description || '',
          pesoText(r.base),
          `${r.rate.toFixed(2)}%`,
          pesoText(r.ewt)
        ];
      });
      note = 'Preview follows Quarterly Alphalist of Payees Schedule 1 (expanded). Incomplete entries block exports.';
    } else if (activeBirReport === 'qapDat') {
      const source = ewtSourceRows();
      sourceCount = source.length;
      issues = validateQAPSourceRows(source);

      headers = ['Record', 'Seq', 'Supplier TIN', 'Branch', 'Corporation / Individual Name', 'Period', 'ATC Code', 'Rate', 'Tax Base Amount', 'Computed EWT'];
      const details = qapDetailRows();
      rows = details.slice(0, 15).map((r, idx) => [
        'D1',
        idx + 1,
        formatTin9Hyphen(r.tin),
        r.branch,
        r.corp || [r.last, r.first, r.middle].filter(Boolean).join(', '),
        r.period,
        r.atc,
        `${r.rate.toFixed(2)}%`,
        pesoText(r.base),
        pesoText(r.ewt)
      ]);
      note = 'DAT builder packages records with HQAP headers and Quarterly C1 control totals for 1601-EQ submission portals.';
    } else if (activeBirReport === 'purchaseBook') {
      const source = birEligibleTransactions();
      sourceCount = source.length;
      issues = validateBookSourceRows(source, 'purchase');

      headers = ['Date', 'TIN', 'Vendor Name', 'Vendor Address', 'Reference No.', 'Description', 'Vatable Amount', 'Non-Vatable Amount', 'Tax Amount', 'Gross Amount'];
      rows = source.slice(0, 15).map(t => {
        const r = subsidiaryPurchaseBookDetailRow(t);
        return [
          t.date,
          r[1],
          r[2],
          r[3],
          r[4],
          r[5],
          pesoText(Number(r[6] || 0)),
          pesoText(Number(r[7] || 0)),
          pesoText(Number(r[8] || 0)),
          pesoText(Number(r[9] || 0))
        ];
      });
      note = 'Outputs to the official Subsidiary Purchase Book format. Each item must have a registered vendor and COA accounting title.';
    } else {
      const source = birCashSourceRows();
      sourceCount = source.length;
      issues = validateBookSourceRows(source, 'cash');

      headers = ['Date', 'TIN', 'Vendor Name', 'CDJ (CV number)', 'Description', 'Cash Account (Disbursement)', 'Withheld Tax', 'Gross Amount'];
      rows = source.slice(0, 15).map(t => {
        const vatable = Number(t.vatable || 0);
        const nonVatable = Number(t.nonVatable || 0);
        const vat = Number(t.vat || 0);
        const gross = Number(t.total || 0) || vatable + nonVatable + vat;
        const ewt = Number(t.ewtAmount || 0);
        const withheld = ewt ? -Math.abs(ewt) : 0;
        const cashAmount = gross + withheld;

        return [
          t.date,
          bookFullTin(t.tin),
          slpRegisteredName(t),
          String(t.cv || '').trim(),
          String(t.description || '').trim(),
          pesoText(cashAmount),
          pesoText(withheld),
          pesoText(gross)
        ];
      });
      note = 'Renders Cash Disbursement Book. This ledger contains all disbursements, including lines with zero tax classification (exempt postings).';
    }

    // Append month-wide all block warning if activeMonth is 'all'
    if (isMonthWideAll) {
      issues = [{ cv: 'Period', voucher: 'All Months', invoice: '', message: 'Select a specific month from the tabs before exporting to validate BIR compliance requirements.' }];
    }

    return { headers, rows, issues, note, sourceCount };
  }, [activeBirReport, visibleTransactions, transactions, activeMonth, refreshTrigger, atcMaster, vatCategories]);

  function validateQAPSourceRows(rows: Transaction[]): any[] {
    const issues: any[] = [];
    rows.forEach(t => {
      const missing: string[] = [];
      if (slpTin9(t.tin).length !== 9) missing.push('9-digit supplier TIN');
      if (!slpRegisteredName(t)) missing.push('supplier registered name');
      if (!t.atcCode || t.atcCode === '--') missing.push('ATC Code');
      
      const atcFound = atcMaster.find(a => normalizeATC(a.atcCode) === atcText(t.atcCode));
      if (!atcFound || atcFound.rate === null) missing.push('ATC Master rate');
      if (!(t.amount > 0)) missing.push('amount');

      if (missing.length) {
        issues.push({
          cv: t.cv,
          voucher: t.voucherName,
          invoice: t.inv,
          message: `Missing or unresolved: ${missing.join(', ')}`
        });
      }
    });
    return issues;
  }

  function validateBookSourceRows(rows: Transaction[], kind: 'purchase' | 'cash'): any[] {
    const issues: any[] = [];
    rows.forEach(t => {
      const missing: string[] = [];
      if (!String(t.date || '').trim() || String(t.date || '').trim() === '--') missing.push('date');
      if (!String(t.cv || '').trim()) missing.push('CV No.');
      if (!String(t.voucherName || '').trim()) missing.push('voucher name');

      if (kind === 'purchase') {
        if (normalizeTIN(t.tin).length < 9) missing.push('supplier TIN');
        if (!slpRegisteredName(t)) missing.push('vendor name');
        if (!supplierBookAddress(t)) missing.push('vendor address');
        if (!String(t.accountingTitle || '').trim()) missing.push('accounting title');
        if (!String(t.description || '').trim()) missing.push('description');
      }

      if (kind === 'cash') {
        if (!String(t.accountingTitle || '').trim()) missing.push('accounting title');
        if (!String(t.bankAccount || '').trim()) missing.push('bank account');
        if (!String(t.description || '').trim()) missing.push('description');
        if (!(Number(t.total || 0) > 0)) missing.push('total amount');
      }

      if (missing.length) {
        issues.push({
          cv: t.cv,
          voucher: t.voucherName,
          invoice: t.inv,
          message: `Missing or unresolved: ${missing.join(', ')}`
        });
      }
    });
    return issues;
  }

  // Split out "Blocked/Attention Required" lines from the normal rows so they can be frozen at the top
  const { normalPreviewRows, attentionPreviewRows } = useMemo(() => {
    const issues = previewPayload.issues;
    const isExportBlocked = issues.length > 0;

    if (!isExportBlocked) {
      return { normalPreviewRows: previewPayload.rows, attentionPreviewRows: [] };
    }

    // Collect CV numbers of flagged transactions to isolate them
    const flaggedCvs = new Set(issues.map(i => i.cv));
    const attention: any[][] = [];
    const normal: any[][] = [];

    previewPayload.rows.forEach(r => {
      // Index 1 (tin/cv) or other indices can tell us if it corresponds to a flagged CV
      const rowMatchesFlagged = Array.from(flaggedCvs).some(cv => r.some(cell => String(cell).includes(String(cv))));
      if (rowMatchesFlagged) {
        attention.push(r);
      } else {
        normal.push(r);
      }
    });

    return {
      normalPreviewRows: normal.length ? normal : previewPayload.rows,
      attentionPreviewRows: attention
    };
  }, [previewPayload]);

  return (
    <div className="flex flex-col gap-4">
      {/* Picker Controls */}
      <div className="flex flex-wrap items-end gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex-1 min-w-[280px] flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Compliance Document</label>
          <select
            value={activeBirReport}
            onChange={(e) => setActiveBirReport(e.target.value)}
            className="w-full p-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-white font-semibold text-slate-800"
          >
            <option value="slpExcel">Summary List of Purchases (SLP) — Excel</option>
            <option value="slpDat">Summary List of Purchases (SLP) — RELIEF DAT</option>
            <option value="qapExcel">QAP 1601EQ Schedule 1 alphalist — Excel</option>
            <option value="qapDat">QAP 1601EQ Schedule 1 alphalist — 1601EQ DAT</option>
            <option value="purchaseBook">Subsidiary Purchase Book journal ledger</option>
            <option value="cashBook">Cash Disbursement Book CDJ journal</option>
          </select>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="px-4 py-2.5 text-sm border border-slate-200 text-slate-700 bg-slate-50 rounded-xl hover:bg-slate-100 font-bold"
          >
            🔄 Refresh Preview
          </button>
          <button
            onClick={handleExportSelected}
            disabled={previewPayload.issues.length > 0}
            className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition ${
              previewPayload.issues.length > 0
                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5'
            }`}
          >
            📥 Export Selected Report
          </button>
        </div>
      </div>

      {/* Validation Warning Alert Box */}
      {previewPayload.issues.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs shadow-inner">
          <div className="flex items-center gap-2 mb-2 text-rose-800 font-bold">
            <span className="text-base">🚫</span>
            <span>Export Blocked: {previewPayload.issues.length} compliance issue(s) detected.</span>
          </div>
          <p className="text-slate-600 mb-3 leading-relaxed">
            Every exported line must correspond to a complete Supplier Master record (9-digit TIN, registered name, city, zip, and address) and contain valid calculations before the BIR system accepts downloads. Please fix the records flagged below:
          </p>
          <div className="max-h-40 overflow-y-auto flex flex-col gap-1.5 font-mono text-[10px] text-rose-700">
            {previewPayload.issues.slice(0, 10).map((issue, idx) => (
              <div key={idx} className="border-l-2 border-rose-300 pl-2">
                • CV <span className="font-bold">{issue.cv}</span> ({issue.voucher}): {issue.message}
              </div>
            ))}
            {previewPayload.issues.length > 10 && (
              <div className="text-slate-400 italic font-sans pl-2">
                + {previewPayload.issues.length - 10} more blocker warnings.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Title */}
      <div>
        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          {activeBirReport === 'slpExcel' ? 'Summary List of Purchases (SLP) Excel Draft' :
           activeBirReport === 'slpDat' ? 'Summary List of Purchases (SLP) RELIEF DAT format' :
           activeBirReport === 'qapExcel' ? 'QAP 1601EQ Schedule 1 alphalist' :
           activeBirReport === 'qapDat' ? 'QAP 1601EQ Schedule 1 alphalist DAT layout' :
           activeBirReport === 'purchaseBook' ? 'Subsidiary Purchase Book' : 'Cash Disbursement Book CDJ'}
        </h4>
        <span className="text-xs text-slate-400 block mt-1">
          {previewPayload.note}
        </span>
      </div>

      {/* Preview Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider select-none">
                {previewPayload.headers.map((h, i) => (
                  <th key={i} className="py-2.5 px-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Frozen Attention Rows */}
              {attentionPreviewRows.length > 0 && (
                <>
                  <tr className="bg-amber-100/60 border-b border-amber-200 text-amber-900 font-extrabold select-none">
                    <td colSpan={previewPayload.headers.length} className="py-2 px-3">
                      ⚠️ Attention Required Queue (flagged transaction lines pinned below)
                    </td>
                  </tr>
                  {attentionPreviewRows.map((row, idx) => (
                    <tr key={`att-${idx}`} className="bg-amber-50/60 border-b border-amber-100 text-amber-950 font-medium">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="py-2 px-3 truncate max-w-[220px] font-mono text-[11px]" title={String(cell)}>
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold select-none">
                    <td colSpan={previewPayload.headers.length} className="py-2 px-3">
                      ✓ Draft Document Preview rows (First {normalPreviewRows.length} lines of export)
                    </td>
                  </tr>
                </>
              )}

              {normalPreviewRows.length === 0 ? (
                <tr>
                  <td colSpan={previewPayload.headers.length} className="py-8 text-center text-slate-400 font-medium">
                    No preview lines generated.
                  </td>
                </tr>
              ) : (
                normalPreviewRows.map((row, idx) => (
                  <tr key={`normal-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/40 font-mono text-slate-700 text-[11px]">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 truncate max-w-[220px]" title={String(cell)}>
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
