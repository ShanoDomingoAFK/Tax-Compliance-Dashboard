import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Peso from './Peso';
import { Transaction, VATCategory, ATCEntry, Supplier, LedgerRow } from '../types';
import {
  pesoText,
  verificationText,
  isBalanced,
  makeId,
  parseMoney,
  normalizeImportDate,
  normalizeATC,
  atcText,
  parseRate,
  normalizeVatCodeRaw,
  formatTIN,
  normalizeTIN,
  supplierDisplayName,
  supplierFieldHasSpecial
} from '../utils/helpers';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface WorkingSheetProps {
  visibleTransactions: Transaction[];
  filteredCVGroups: any[];
  vatCategories: VATCategory[];
  atcMaster: ATCEntry[];
  supplierMaster: Supplier[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setVatLedger: React.Dispatch<React.SetStateAction<LedgerRow[]>>;
  setEwtLedger: React.Dispatch<React.SetStateAction<LedgerRow[]>>;
  setVatCategories: React.Dispatch<React.SetStateAction<VATCategory[]>>;
  setAtcMaster: React.Dispatch<React.SetStateAction<ATCEntry[]>>;
  setSupplierMaster: React.Dispatch<React.SetStateAction<Supplier[]>>;
  
  activePurchaseBreakdown: 'vat' | 'ewt' | null;
  setActivePurchaseBreakdown: (val: 'vat' | 'ewt' | null) => void;
  workSort: { key: string; dir: 'asc' | 'desc' };
  setWorkSort: (sort: { key: string; dir: 'asc' | 'desc' }) => void;
  
  focusedCV: string | null;
  setFocusedCV: (cv: string | null) => void;
  
  workingSearch: string;
  setWorkingSearch: (val: string) => void;
  workStatusFilter: string;
  setWorkStatusFilter: (val: string) => void;
  varianceFilter: string;
  setVarianceFilter: (val: string) => void;

  findSupplierByTIN: (tin: string) => Supplier | null;
  addTransaction: (tx: Partial<Transaction>) => Transaction;
  parseQuickBooksWorkbook: (wb: XLSX.WorkBook) => any;
  importMappedRows: any;
}

export default function WorkingSheet({
  visibleTransactions,
  filteredCVGroups,
  vatCategories,
  atcMaster,
  supplierMaster,
  setTransactions,
  setVatLedger,
  setEwtLedger,
  setVatCategories,
  setAtcMaster,
  setSupplierMaster,

  activePurchaseBreakdown,
  setActivePurchaseBreakdown,
  workSort,
  setWorkSort,

  focusedCV,
  setFocusedCV,

  workingSearch,
  setWorkingSearch,
  workStatusFilter,
  setWorkStatusFilter,
  varianceFilter,
  setVarianceFilter,

  findSupplierByTIN,
  addTransaction,
  parseQuickBooksWorkbook,
  importMappedRows
}: WorkingSheetProps) {

  // Collapsible panels
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Manual Add Form State
  const [fDate, setFDate] = useState('');
  const [fCv, setFCv] = useState('');
  const [fVoucher, setFVoucher] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fAccountingTitle, setFAccountingTitle] = useState('');
  const [fBankAccount, setFBankAccount] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fVatCategory, setFVatCategory] = useState('');
  const [fAtcCode, setFAtcCode] = useState('');
  const [fInv, setFInv] = useState('');
  const [fTin, setFTin] = useState('');
  const [matchedSupplierLabel, setMatchedSupplierLabel] = useState('');

  // Import State
  const [importType, setImportType] = useState<'book' | 'vatLedger' | 'ewtLedger' | 'vatCategoryMaster' | 'atcMaster' | 'supplierMaster'>('book');
  const [replaceOnImport, setReplaceOnImport] = useState(false);
  const [importIssues, setImportIssues] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState<string>('');

  // Derived variables for warnings/alerts
  const bookVatTotal = useMemo(() => visibleTransactions.reduce((sum, t) => sum + t.vat, 0), [visibleTransactions]);
  const bookEwtTotal = useMemo(() => visibleTransactions.reduce((sum, t) => sum + t.ewtAmount, 0), [visibleTransactions]);
  
  const unreviewedCount = useMemo(() => visibleTransactions.filter(t => t.manualStatus === 'unreviewed').length, [visibleTransactions]);
  const blankSuppliersCount = useMemo(() => visibleTransactions.filter(t => !t.supplier || !t.tin).length, [visibleTransactions]);

  const supplierSpecialCount = useMemo(() => {
    return visibleTransactions.filter(t => {
      return [
        t.supplier, t.registeredName, t.lastName, t.firstName, t.middleName, t.address, t.city, t.zip
      ].some(val => supplierFieldHasSpecial(val));
    }).length;
  }, [visibleTransactions]);

  // Tax breakdowns calculations
  const vatBreakdownRows = useMemo(() => {
    const map = new Map<string, { code: string; label: string; count: number; amount: number; vat: number; total: number }>();
    visibleTransactions.forEach(t => {
      const code = normalizeVatCodeRaw(t.vatCategory) || 'Uncoded';
      const label = code === 'Uncoded' ? 'Uncoded VAT Category' : (vatCategories.find(c => c.code === code)?.label || code);
      if (!map.has(code)) {
        map.set(code, { code, label, count: 0, amount: 0, vat: 0, total: 0 });
      }
      const g = map.get(code)!;
      g.count++;
      g.amount += t.amount;
      g.vat += t.vat;
      g.total += t.total;
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount || a.code.localeCompare(b.code));
  }, [visibleTransactions, vatCategories]);

  const ewtBreakdownRows = useMemo(() => {
    const map = new Map<string, { code: string; label: string; rate: string; count: number; amount: number; total: number; ewt: number; net: number }>();
    visibleTransactions.forEach(t => {
      const code = normalizeATC(t.atcCode) || 'Uncoded';
      const atcFound = atcMaster.find(a => normalizeATC(a.atcCode) === code);
      const rateVal = atcFound && atcFound.rate !== null ? `${atcFound.rate}%` : '--';
      const label = code === 'Uncoded' ? 'Uncoded ATC' : `${code} · ${atcFound?.description || ''}`;
      
      if (!map.has(code)) {
        map.set(code, { code, label, rate: rateVal, count: 0, amount: 0, total: 0, ewt: 0, net: 0 });
      }
      const g = map.get(code)!;
      g.count++;
      g.amount += t.amount;
      g.total += t.total;
      g.ewt += t.ewtAmount;
      g.net += (t.total - t.ewtAmount);
    });
    return Array.from(map.values()).sort((a, b) => b.ewt - a.ewt || b.amount - a.amount || a.code.localeCompare(b.code));
  }, [visibleTransactions, atcMaster]);

  // Handle Excel upload
  function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      let wb: XLSX.WorkBook;
      try {
        wb = XLSX.read(evt.target?.result, { type: 'array', cellDates: false });
      } catch (_) {
        alert('Unable to read Excel file. Please verify it is a valid .xlsx workbook.');
        return;
      }

      // QuickBooks auto-detector
      let qb: any = null;
      try {
        qb = parseQuickBooksWorkbook(wb);
      } catch (_) {}

      if (qb && qb.error) {
        setImportIssues([{ rowNumber: 'File', field: 'Auto-detect', message: qb.message }]);
        setShowImport(true);
        return;
      }

      if (qb && qb.type) {
        setImportType(qb.type);
        importMappedRows(
          qb.syntheticRows,
          qb.type,
          replaceOnImport,
          (added: number, skipped: number, issues: any[]) => {
            setImportSummary(`QuickBooks file auto-mapped: Imported ${added} rows successfully, skipped ${skipped} rows.`);
            setImportIssues(issues);
          },
          (err: string) => {
            alert(err);
          }
        );
        return;
      }

      // Normal template reader
      const targetSheet = wb.SheetNames[0];
      const ws = wb.Sheets[targetSheet];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

      importMappedRows(
        rows,
        importType,
        replaceOnImport,
        (added: number, skipped: number, issues: any[]) => {
          setImportSummary(`Import Completed: Added ${added} rows successfully, skipped ${skipped} rows.`);
          setImportIssues(issues);
        },
        (err: string) => {
          alert(err);
        }
      );
    };
    reader.readAsArrayBuffer(file);
  }

  // Handle Supplier lookup inside add-form
  function handleTinChange(val: string) {
    setFTin(val);
    const matched = findSupplierByTIN(val);
    if (matched) {
      setMatchedSupplierLabel(`Linked: ${supplierDisplayName(matched)}`);
      // Auto prefill some details if found
      if (!fVoucher) setFVoucher(supplierDisplayName(matched));
    } else {
      setMatchedSupplierLabel('');
    }
  }

  // Handle Manual Add Submit
  function handleManualAdd() {
    if (!fCv || !fVoucher) {
      alert('Please fill in check voucher number (CV no.) and voucher name.');
      return;
    }
    const cleanDate = normalizeImportDate(fDate);
    if (fDate && !cleanDate) {
      alert('Please enter a valid date in MM/DD/YYYY format (e.g., 04/15/2026).');
      return;
    }

    const amt = parseMoney(fAmount);
    const fresh = addTransaction({
      date: cleanDate || '--',
      cv: fCv.trim(),
      voucherName: fVoucher.trim(),
      description: fDesc.trim(),
      accountingTitle: fAccountingTitle.trim(),
      bankAccount: fBankAccount.trim(),
      amount: amt,
      vatCategory: fVatCategory,
      atcCode: fAtcCode,
      inv: fInv.trim(),
      tin: fTin.trim(),
      manualStatus: 'unreviewed',
      lastReviewed: new Date().toISOString()
    });

    // Reset Form
    setFDate('');
    setFCv('');
    setFVoucher('');
    setFDesc('');
    setFAccountingTitle('');
    setFBankAccount('');
    setFAmount('');
    setFVatCategory('');
    setFAtcCode('');
    setFInv('');
    setFTin('');
    setMatchedSupplierLabel('');
    setShowAdd(false);

    // Expand this CV immediately
    setFocusedCV(fresh.cv);
  }

  // Add 5 test transactions
  function handleAddFiveTest() {
    const baseDate = new Date();
    const samples = [
      { voucherName: 'Voucher - Office Depot', cv: 'TEST-CV-101', description: 'Office supplies procurement', amount: 8500, vatCategory: 'G', atcCode: 'WC 158' },
      { voucherName: 'Voucher - SG Tax Consulting', cv: 'TEST-CV-102', description: 'Monthly audit services', amount: 25000, vatCategory: 'S', atcCode: 'WC 160' },
      { voucherName: 'Voucher - Shell Gas Station', cv: 'TEST-CV-103', description: 'Delivery truck fuel', amount: 4800, vatCategory: 'G', atcCode: '' },
      { voucherName: 'Petty Cash - Jan Reimbursement', cv: 'TEST-PCF-005', description: 'Client meeting taxi fare', amount: 650, vatCategory: 'SNQ', atcCode: '' },
      { voucherName: 'Voucher - Ace Hardware Inc', cv: 'TEST-CV-105', description: 'Warehouse capital tools', amount: 14500, vatCategory: 'CG', atcCode: 'WC 158' }
    ];

    samples.forEach((s, i) => {
      const dateObj = new Date(baseDate.getFullYear(), baseDate.getMonth(), Math.min(28, i + 5));
      const dateStr = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}/${dateObj.getFullYear()}`;
      
      addTransaction({
        date: dateStr,
        cv: s.cv,
        voucherName: s.voucherName,
        description: s.description,
        amount: s.amount,
        vatCategory: s.vatCategory,
        atcCode: s.atcCode,
        manualStatus: 'unreviewed',
        lastReviewed: new Date().toISOString()
      });
    });

    alert('5 sample transactions created successfully under the current month.');
  }

  // Trigger sorting
  function handleSort(key: string) {
    if (workSort.key === key) {
      setWorkSort({ key, dir: workSort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      setWorkSort({ key, dir: 'asc' });
    }
  }

  function renderSortArrow(key: string) {
    if (workSort.key !== key) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-blue-600 ml-1">{workSort.dir === 'asc' ? '▲' : '▼'}</span>;
  }

  // Download template helper
  function handleDownloadTemplate() {
    const headers = {
      book: ['voucher_name','cv_no','date','description','accounting_title','bank_account','tin','invoice_no','amount','total_amount','vat_category','atc_code','compliance','review_note'],
      vatLedger: ['cv_no','voucher_name','date','vat_amount','ledger_account'],
      ewtLedger: ['cv_no','voucher_name','date','ewt_amount','ledger_account'],
      vatCategoryMaster: ['vat_category','description','vat_type','rate'],
      atcMaster: ['atc_code','rate','description','source'],
      supplierMaster: ['tin','registered_name','registered_last_name','registered_first_name','registered_middle_name','registered_address','city','zip_code']
    }[importType];

    const sampleRow = {
      book: ['Sample Supplier Inc', 'CV-0012', '06/15/2026', 'Office server purchase', 'Equipment Expense', 'BDO Checking 12', '123-456-789-000', 'SI-9921', 12000, 13440, 'S', 'WC 160', 'Compliant', 'No issues'],
      vatLedger: ['CV-0012', 'Sample Supplier Inc', '06/15/2026', 1440, 'Input VAT'],
      ewtLedger: ['CV-0012', 'Sample Supplier Inc', '06/15/2026', 240, 'EWT Expanded'],
      vatCategoryMaster: ['S', 'Vatable services', 'VAT Registered', 12],
      atcMaster: ['WC 160', 2, 'Professional services', 'BIR 2307 Table'],
      supplierMaster: ['123-456-789-000', 'Sample Supplier Inc', '', '', '', '123 Ayala St', 'Makati', '1226']
    }[importType];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${importType}_import_template.xlsx`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">CV Groups</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {filteredCVGroups.length}
          </div>
          <span className="text-xs text-slate-500">
            Across <strong>{visibleTransactions.length}</strong> purchase rows
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Supplier Data Needed</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-amber-600">
            {blankSuppliersCount}
          </div>
          <span className="text-xs text-slate-500">
            Blank Supplier TIN or Name
          </span>
        </div>

        {/* Purchase VAT Card */}
        <div
          onClick={() => setActivePurchaseBreakdown(activePurchaseBreakdown === 'vat' ? null : 'vat')}
          className={`border rounded-2xl p-4 shadow-sm flex flex-col justify-between cursor-pointer transition-all ${
            activePurchaseBreakdown === 'vat' ? 'ring-2 ring-blue-500 bg-blue-50/10 border-blue-500' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Purchase VAT</span>
          <div className="text-base font-bold font-mono tracking-tight text-slate-900 truncate">
            {pesoText(bookVatTotal)}
          </div>
          <span className="text-xs text-blue-600 font-bold block mt-1 hover:underline">
            {activePurchaseBreakdown === 'vat' ? '▲ Hide breakdown' : '▼ View categories'}
          </span>
        </div>

        {/* Purchase EWT Card */}
        <div
          onClick={() => setActivePurchaseBreakdown(activePurchaseBreakdown === 'ewt' ? null : 'ewt')}
          className={`border rounded-2xl p-4 shadow-sm flex flex-col justify-between cursor-pointer transition-all ${
            activePurchaseBreakdown === 'ewt' ? 'ring-2 ring-blue-500 bg-blue-50/10 border-blue-500' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Purchase EWT</span>
          <div className="text-base font-bold font-mono tracking-tight text-slate-900 truncate">
            {pesoText(bookEwtTotal)}
          </div>
          <span className="text-xs text-blue-600 font-bold block mt-1 hover:underline">
            {activePurchaseBreakdown === 'ewt' ? '▲ Hide breakdown' : '▼ View ATC codes'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Unreviewed</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-600">
            {unreviewedCount}
          </div>
          <span className="text-xs text-slate-500">
            Requires verification status
          </span>
        </div>

        <div className={`border rounded-2xl p-4 shadow-sm flex flex-col justify-between ${
          supplierSpecialCount > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'
        }`}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Supplier Warning</span>
          <div className={`text-2xl font-bold font-mono tracking-tight ${supplierSpecialCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {supplierSpecialCount}
          </div>
          <span className="text-xs text-slate-500">
            Special character alert
          </span>
        </div>
      </div>

      {/* Breakdown Panel: VAT */}
      {activePurchaseBreakdown === 'vat' && (
        <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-md transition-all">
          <div className="mb-2">
            <h4 className="text-sm font-bold text-slate-900">Purchase VAT by VAT Category Code</h4>
            <p className="text-xs text-slate-500">Calculated sum based on transactions for the selected period.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-2 px-3 font-bold" style={{ width: '15%' }}>VAT Category</th>
                  <th className="py-2 px-3 font-bold" style={{ width: '45%' }}>Description</th>
                  <th className="py-2 px-3 text-right font-bold" style={{ width: '20%' }}>Base Amount</th>
                  <th className="py-2 px-3 text-right font-bold" style={{ width: '20%' }}>VAT Amount</th>
                </tr>
              </thead>
              <tbody>
                {vatBreakdownRows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 font-mono text-slate-700">
                    <td className="py-2 px-3 font-bold text-slate-900">{r.code}</td>
                    <td className="py-2 px-3 font-sans text-slate-600">{r.label}</td>
                    <td className="py-2 px-3 text-right">{pesoText(r.amount)}</td>
                    <td className="py-2 px-3 text-right text-blue-600 font-semibold">{pesoText(r.vat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Breakdown Panel: EWT */}
      {activePurchaseBreakdown === 'ewt' && (
        <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-md transition-all">
          <div className="mb-2">
            <h4 className="text-sm font-bold text-slate-900">Purchase EWT by ATC Code</h4>
            <p className="text-xs text-slate-500">ATC Withholding EWT summaries for the selected period.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-2 px-3 font-bold" style={{ width: '15%' }}>ATC Code</th>
                  <th className="py-2 px-3 font-bold" style={{ width: '10%' }}>Rate</th>
                  <th className="py-2 px-3 font-bold" style={{ width: '35%' }}>Description</th>
                  <th className="py-2 px-3 text-right font-bold" style={{ width: '20%' }}>Base Amount</th>
                  <th className="py-2 px-3 text-right font-bold" style={{ width: '20%' }}>EWT Amount</th>
                </tr>
              </thead>
              <tbody>
                {ewtBreakdownRows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 font-mono text-slate-700">
                    <td className="py-2 px-3 font-bold text-slate-900">{r.code}</td>
                    <td className="py-2 px-3">{r.rate}</td>
                    <td className="py-2 px-3 font-sans text-slate-600">{r.label}</td>
                    <td className="py-2 px-3 text-right">{pesoText(r.amount)}</td>
                    <td className="py-2 px-3 text-right text-blue-600 font-semibold">{pesoText(r.ewt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action buttons triggers */}
      <div className="flex gap-2">
        <button
          onClick={() => { setTransactions([]); alert('Transactions cleared!'); }}
          className="btn btn-danger text-xs font-bold py-1.5 px-3 rounded-full hover:bg-slate-50 border-slate-200"
        >
          🗑️ Clear All Transactions
        </button>
        <button
          onClick={() => { setShowImport(!showImport); setShowAdd(false); }}
          className="btn text-xs font-bold py-1.5 px-3 rounded-full hover:bg-slate-50 border-slate-200"
        >
          📂 Import XLSX / QuickBooks
        </button>
        <button
          onClick={() => { setShowAdd(!showAdd); setShowImport(false); }}
          className="btn btn-primary text-xs font-bold py-1.5 px-3 rounded-full text-white"
        >
          ➕ Add Transaction Manually
        </button>
      </div>

      {/* XLSX IMPORT PANEL */}
      {showImport && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-inner">
          <h3 className="font-bold text-slate-800 text-sm mb-2">Import XLSX for Purchase Transactions</h3>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            <strong>QuickBooks reports are detected automatically.</strong> You can drag & drop or upload the raw QuickBooks <em>Transaction Detail by Account</em> (expense list), <em>VAT Summary / Tax Detail Report</em>, or <em>Withholding Transaction Report</em>. The system will map headers automatically!
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Import Template Type (Fallback)</label>
              <select
                value={importType}
                onChange={(e: any) => setImportType(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none bg-white text-xs"
              >
                <option value="book">Purchase transactions / verification sheet</option>
                <option value="vatLedger">VAT Balances</option>
                <option value="ewtLedger">EWT Balances</option>
                <option value="vatCategoryMaster">VAT Categories</option>
                <option value="atcMaster">ATC Master / Database EWT Rates</option>
                <option value="supplierMaster">Supplier Master</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={replaceOnImport}
                  onChange={(e) => setReplaceOnImport(e.target.checked)}
                  className="rounded text-blue-500"
                />
                Replace existing data for this import type
              </label>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div className="group border-2 border-dashed border-slate-200 hover:border-blue-500/60 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 bg-slate-50/50 hover:bg-blue-50/10 flex flex-col items-center justify-center gap-2">
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors duration-200" />
            <label className="text-xs font-bold text-slate-700 cursor-pointer group-hover:text-slate-900 transition-colors duration-200">
              Click to select or drag your spreadsheet file here
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
            </label>
            <span className="text-[10px] font-medium text-slate-400">Supports .xlsx or .xls Excel files</span>
          </div>

          <div className="flex justify-between items-center gap-3 mt-4">
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs rounded-full hover:bg-slate-50 font-semibold"
            >
              📥 Download Sample Template File
            </button>
            <button
              onClick={() => setShowImport(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full font-bold"
            >
              Close Panel
            </button>
          </div>

          {importSummary && (
            <div className="mt-4 p-3 bg-blue-50 text-blue-800 border border-blue-100 rounded-xl text-xs font-semibold">
              {importSummary}
            </div>
          )}

          {importIssues.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 text-red-800 border border-red-100 rounded-xl text-xs">
              <strong className="block mb-1 text-red-900 font-bold">Import Issues found ({importIssues.length} rows affected):</strong>
              <div className="max-h-36 overflow-y-auto font-mono text-[10px] flex flex-col gap-1">
                {importIssues.map((issue, idx) => (
                  <div key={idx}>
                    Row {issue.rowNumber} (CV {issue.cv || 'N/A'}): Column <span className="font-bold">{issue.field}</span> — {issue.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD TRANSACTION PANEL */}
      {showAdd && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-inner">
          <h3 className="font-bold text-slate-800 text-sm mb-3">Add Purchase Transaction Manually</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Date</label>
              <input
                type="text"
                placeholder="MM/DD/YYYY"
                value={fDate}
                onChange={(e) => setFDate(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">CV no. *</label>
              <input
                type="text"
                placeholder="e.g. CV-0001"
                value={fCv}
                onChange={(e) => setFCv(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Supplier TIN</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="000-000-000"
                  value={fTin}
                  onChange={(e) => handleTinChange(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500 font-mono"
                />
                {matchedSupplierLabel && (
                  <span className="absolute left-1 -bottom-4 text-[9px] text-emerald-600 font-bold truncate max-w-[150px]">
                    {matchedSupplierLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Voucher name *</label>
              <input
                type="text"
                placeholder="e.g. Petty Cash / Supplier Name"
                value={fVoucher}
                onChange={(e) => setFVoucher(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1 col-span-2">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Description</label>
              <input
                type="text"
                placeholder="Particulars of purchase"
                value={fDesc}
                onChange={(e) => setFDesc(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Accounting Title</label>
              <input
                type="text"
                placeholder="e.g. Supplies Expense"
                value={fAccountingTitle}
                onChange={(e) => setFAccountingTitle(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Bank Account</label>
              <input
                type="text"
                placeholder="e.g. Petty cash bank"
                value={fBankAccount}
                onChange={(e) => setFBankAccount(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Amount</label>
              <input
                type="text"
                placeholder="₱ 10,000.00"
                value={fAmount}
                onChange={(e) => setFAmount(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500 text-right font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">VAT Category</label>
              <select
                value={fVatCategory}
                onChange={(e) => setFVatCategory(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none bg-white"
              >
                <option value="">Select Category</option>
                {vatCategories.map(c => (
                  <option key={c.code} value={c.code}>{c.code} - {c.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">ATC Code</label>
              <select
                value={fAtcCode}
                onChange={(e) => setFAtcCode(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none bg-white font-mono"
              >
                <option value="">Select ATC</option>
                {atcMaster.map(a => (
                  <option key={a.atcCode} value={a.atcCode}>{a.atcCode} ({a.rate}%)</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Invoice No.</label>
              <input
                type="text"
                placeholder="SI-001 or OR"
                value={fInv}
                onChange={(e) => setFInv(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 text-xs font-semibold">
            <button
              onClick={handleAddFiveTest}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full text-slate-700"
            >
              🧪 Generate 5 Realistic Sample Rows
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full"
            >
              Cancel
            </button>
            <button
              onClick={handleManualAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow"
            >
              Save Transaction Draft
            </button>
          </div>
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div className="flex flex-wrap gap-3 items-center bg-white/70 border border-slate-200/80 rounded-xl p-3 shadow-sm">
        <div className="relative flex-1 min-width-[280px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Search CV, voucher, supplier, TIN, invoice, or description..."
            value={workingSearch}
            onChange={(e) => setWorkingSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
          />
        </div>
        <select
          value={workStatusFilter}
          onChange={(e) => setWorkStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
        >
          <option value="">All verification statuses</option>
          <option value="ok">Compliant</option>
          <option value="warn">Without Invoice</option>
          <option value="err">Non-Compliant</option>
          <option value="unreviewed">Unreviewed</option>
          <option value="journal">Journal Entry</option>
          <option value="adjusting">Adjusting Entry</option>
        </select>
        <select
          value={varianceFilter}
          onChange={(e) => setVarianceFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
        >
          <option value="">All CVs</option>
          <option value="vat">With VAT balance issue</option>
          <option value="ewt">With EWT balance issue</option>
          <option value="any">With any balance issue</option>
        </select>
      </div>

      <div className="text-[11px] text-slate-400 px-1 flex gap-4 select-none">
        <span>✨ CV rows are consolidated automatically by CV Number</span>
        <span>🔴 VAT / EWT amounts turn red when the CV reconciliation contains differences</span>
      </div>

      {/* CV CONSOLIDATED GROUPS TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider select-none">
                <th className="py-3 px-4 text-left font-semibold">
                  <button onClick={() => handleSort('date')} className="flex items-center text-slate-700">
                    Date {renderSortArrow('date')}
                  </button>
                </th>
                <th className="py-3 px-4 text-left font-semibold">
                  <button onClick={() => handleSort('cv')} className="flex items-center text-slate-700">
                    CV Number {renderSortArrow('cv')}
                  </button>
                </th>
                <th className="py-3 px-4 text-left font-semibold" style={{ width: '22%' }}>
                  <button onClick={() => handleSort('voucher')} className="flex items-center text-slate-700">
                    Voucher name {renderSortArrow('voucher')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-semibold">
                  <button onClick={() => handleSort('vat')} className="flex items-center justify-end text-slate-700 w-full">
                    Purchase VAT {renderSortArrow('vat')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-semibold">
                  <button onClick={() => handleSort('ewt')} className="flex items-center justify-end text-slate-700 w-full">
                    Purchase EWT {renderSortArrow('ewt')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-semibold">
                  <button onClick={() => handleSort('total')} className="flex items-center justify-end text-slate-700 w-full">
                    Total Amount {renderSortArrow('total')}
                  </button>
                </th>
                <th className="py-3 px-4 text-center font-semibold">
                  <button onClick={() => handleSort('balance')} className="flex items-center justify-center text-slate-700 w-full">
                    Balance check {renderSortArrow('balance')}
                  </button>
                </th>
                <th className="py-3 px-4 text-center font-semibold" style={{ width: '130px' }}>
                  <button onClick={() => handleSort('verification')} className="flex items-center justify-center text-slate-700 w-full">
                    Verification {renderSortArrow('verification')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCVGroups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No CV groups match your filters.
                  </td>
                </tr>
              ) : (
                filteredCVGroups.map((g, idx) => {
                  const vatOk = isBalanced(g.vatDiff);
                  const ewtOk = isBalanced(g.ewtDiff);
                  const isCvFocused = focusedCV === g.cv;

                  // Trigger highlight if blockers exist for BIR reports
                  const hasSupplierAlert = g.txns.some((t: Transaction) => {
                    return [
                      t.supplier, t.registeredName, t.lastName, t.firstName, t.middleName, t.address, t.city, t.zip
                    ].some(val => supplierFieldHasSpecial(val));
                  });

                  return (
                    <tr
                      key={idx}
                      onClick={() => setFocusedCV(g.cv)}
                      className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer ${
                        isCvFocused ? 'bg-blue-50/50' : ''
                      } ${hasSupplierAlert ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {g.dateDisplay}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isCvFocused ? 'rotate-90 text-blue-500' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                          <span className="font-mono">{g.cv}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium max-w-xs truncate" title={g.voucherNames}>
                        {g.voucherNames}
                      </td>
                      <td className={`py-3 px-4 text-right ${!vatOk ? 'text-rose-600 font-bold' : ''}`}>
                        <Peso value={g.bookVat} className={!vatOk ? 'text-rose-600 font-bold' : ''} />
                      </td>
                      <td className={`py-3 px-4 text-right ${!ewtOk ? 'text-rose-600 font-bold' : ''}`}>
                        <Peso value={g.bookEwt} className={!ewtOk ? 'text-rose-600 font-bold' : ''} />
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        <Peso value={g.bookTotal} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                          (vatOk && ewtOk)
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {vatOk && ewtOk ? 'Balanced' : 'Review balances'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <div className="bg-emerald-500" style={{ width: `${g.status.okPct}%` }}></div>
                            <div className="bg-amber-400" style={{ width: `${g.status.warnPct}%` }}></div>
                            <div className="bg-rose-500" style={{ width: `${g.status.errPct}%` }}></div>
                            <div className="bg-blue-600" style={{ width: `${g.status.journalPct}%` }}></div>
                            <div className="bg-pink-600" style={{ width: `${g.status.adjustingPct}%` }}></div>
                            <div className="bg-slate-400" style={{ width: `${g.status.reviewPct}%` }}></div>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 font-mono mt-0.5 uppercase tracking-wide">
                            {verificationText(g.status.status)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredCVGroups.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr className="font-bold text-slate-800 text-right">
                  <td colSpan={3} className="py-3 px-4 text-left text-slate-700 font-bold">Grand Total</td>
                  <td className="py-3 px-4">
                    <Peso value={bookVatTotal} />
                  </td>
                  <td className="py-3 px-4">
                    <Peso value={bookEwtTotal} />
                  </td>
                  <td className="py-3 px-4">
                    <Peso value={visibleTransactions.reduce((a, t) => a + t.total, 0)} />
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
