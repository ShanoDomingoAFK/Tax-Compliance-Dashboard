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
import { Upload, FileSpreadsheet, Search, Filter, AlertCircle, CheckCircle, Edit, Trash2, Plus, ArrowUpDown, ChevronDown, ChevronRight, HelpCircle, Calendar, Users, Percent, Scale, TrendingUp } from 'lucide-react';

interface SalesTransactionsSheetProps {
  visibleSalesTransactions: Transaction[];
  filteredSalesCvGroups: any[];
  vatCategories: VATCategory[];
  atcMaster: ATCEntry[];
  supplierMaster: Supplier[];
  setSalesTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setOutputVatLedger: React.Dispatch<React.SetStateAction<LedgerRow[]>>;
  setCwtLedger: React.Dispatch<React.SetStateAction<LedgerRow[]>>;
  setVatCategories: React.Dispatch<React.SetStateAction<VATCategory[]>>;
  setAtcMaster: React.Dispatch<React.SetStateAction<ATCEntry[]>>;
  setSupplierMaster: React.Dispatch<React.SetStateAction<Supplier[]>>;
  
  activeSalesBreakdown: 'vat' | 'ewt' | null;
  setActiveSalesBreakdown: (val: 'vat' | 'ewt' | null) => void;
  salesSort: { key: string; dir: 'asc' | 'desc' };
  setSalesSort: (sort: { key: string; dir: 'asc' | 'desc' }) => void;
  
  focusedCV: string | null;
  setFocusedCV: (cv: string | null) => void;
  
  salesSearch: string;
  setSalesSearch: (val: string) => void;
  salesStatusFilter: string;
  setSalesStatusFilter: (val: string) => void;
  salesVarianceFilter: string;
  setSalesVarianceFilter: (val: string) => void;

  findSupplierByTIN: (tin: string) => Supplier | null;
  addSalesTransaction: (tx: Partial<Transaction>) => Transaction;
  parseQuickBooksWorkbook: (wb: XLSX.WorkBook) => any;
  importMappedRows: any;
}

export default function SalesTransactionsSheet({
  visibleSalesTransactions,
  filteredSalesCvGroups,
  vatCategories,
  atcMaster,
  supplierMaster,
  setSalesTransactions,
  setOutputVatLedger,
  setCwtLedger,
  setVatCategories,
  setAtcMaster,
  setSupplierMaster,

  activeSalesBreakdown,
  setActiveSalesBreakdown,
  salesSort,
  setSalesSort,

  focusedCV,
  setFocusedCV,

  salesSearch,
  setSalesSearch,
  salesStatusFilter,
  setSalesStatusFilter,
  salesVarianceFilter,
  setSalesVarianceFilter,

  findSupplierByTIN,
  addSalesTransaction,
  parseQuickBooksWorkbook,
  importMappedRows
}: SalesTransactionsSheetProps) {

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
  const [importType, setImportType] = useState<'salesBook' | 'outputVatLedger' | 'cwtLedger' | 'supplierMaster'>('salesBook');
  const [replaceOnImport, setReplaceOnImport] = useState(false);
  const [importIssues, setImportIssues] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState<string>('');

  // Editing state for existing transaction
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  // Derived variables for warnings/alerts
  const bookVatTotal = useMemo(() => visibleSalesTransactions.reduce((sum, t) => sum + t.vat, 0), [visibleSalesTransactions]);
  const bookEwtTotal = useMemo(() => visibleSalesTransactions.reduce((sum, t) => sum + t.ewtAmount, 0), [visibleSalesTransactions]);
  
  const unreviewedCount = useMemo(() => visibleSalesTransactions.filter(t => t.manualStatus === 'unreviewed').length, [visibleSalesTransactions]);
  const blankSuppliersCount = useMemo(() => visibleSalesTransactions.filter(t => !t.supplier || !t.tin).length, [visibleSalesTransactions]);

  const supplierSpecialCount = useMemo(() => {
    return visibleSalesTransactions.filter(t => {
      return [
        t.supplier, t.registeredName, t.lastName, t.firstName, t.middleName, t.address, t.city, t.zip
      ].some(val => supplierFieldHasSpecial(val));
    }).length;
  }, [visibleSalesTransactions]);

  // Tax breakdowns calculations
  const vatBreakdownRows = useMemo(() => {
    const map = new Map<string, { code: string; label: string; count: number; amount: number; vat: number; total: number }>();
    visibleSalesTransactions.forEach(t => {
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
  }, [visibleSalesTransactions, vatCategories]);

  const ewtBreakdownRows = useMemo(() => {
    const map = new Map<string, { code: string; label: string; rate: string; count: number; amount: number; total: number; ewt: number; net: number }>();
    visibleSalesTransactions.forEach(t => {
      const code = normalizeATC(t.atcCode) || 'Uncoded';
      const found = atcMaster.find(a => normalizeATC(a.atcCode) === code);
      const label = code === 'Uncoded' ? 'Uncoded EWT Rate' : (found?.description || code);
      const rateText = code === 'Uncoded' ? '--' : (found ? `${(found.rate * 100).toFixed(1).replace(/\.0$/, '')}%` : '--');
      if (!map.has(code)) {
        map.set(code, { code, label, rate: rateText, count: 0, amount: 0, total: 0, ewt: 0, net: 0 });
      }
      const g = map.get(code)!;
      g.count++;
      g.amount += t.amount;
      g.total += t.total;
      g.ewt += t.ewtAmount;
      g.net += t.amount - t.ewtAmount;
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount || a.code.localeCompare(b.code));
  }, [visibleSalesTransactions, atcMaster]);

  // Handle manual input TIN change to lookup registered name
  const handleTinChange = (val: string) => {
    setFTin(val);
    const cleaned = normalizeTIN(val);
    if (cleaned.length >= 9) {
      const found = findSupplierByTIN(cleaned);
      if (found) {
        setMatchedSupplierLabel(supplierDisplayName(found));
        setFVoucher(supplierDisplayName(found));
      } else {
        setMatchedSupplierLabel('');
      }
    } else {
      setMatchedSupplierLabel('');
    }
  };

  // Handle excel workbook file drops / selections
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportIssues([]);
    setImportSummary('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        // Check if it matches QuickBooks pattern
        const qbMatch = parseQuickBooksWorkbook(wb);
        if (qbMatch) {
          if ('error' in qbMatch && qbMatch.error) {
            alert(qbMatch.message);
            return;
          }
          // Mapping standard QB formats to our system
          let finalType: 'salesBook' | 'outputVatLedger' | 'cwtLedger' = 'salesBook';
          if (qbMatch.type === 'vatLedger') finalType = 'outputVatLedger';
          else if (qbMatch.type === 'ewtLedger') finalType = 'cwtLedger';
          else finalType = 'salesBook';

          importMappedRows(
            qbMatch.syntheticRows,
            finalType,
            replaceOnImport,
            (added: number, skipped: number, issues: any[]) => {
              setImportSummary(`QuickBooks auto-detected as "${qbMatch.type}". Successfully mapped and uploaded ${added} rows. Skipped ${skipped} rows.`);
              setImportIssues(issues);
            },
            (err: string) => {
              alert(`Mapping error: ${err}`);
            }
          );
          return;
        }

        // Handle generic templates
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];

        importMappedRows(
          rows,
          importType,
          replaceOnImport,
          (added: number, skipped: number, issues: any[]) => {
            setImportSummary(`Successfully imported ${added} rows. Skipped ${skipped} rows due to validation flags.`);
            setImportIssues(issues);
          },
          (err: string) => {
            alert(`Generic import failed: ${err}`);
          }
        );
      } catch (err: any) {
        alert(`Error parsing Excel workbook file: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit manual transaction
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fDate || !fCv || !fVoucher || !fAmount || !fAccountingTitle || !fBankAccount) {
      alert('Missing required fields: Date, Invoice/OR No, Customer/Voucher Name, Gross Amount, Revenue Account, and Cash/Clearing Account are mandatory.');
      return;
    }

    const cleanedTin = normalizeTIN(fTin);
    const found = findSupplierByTIN(cleanedTin);

    const rowData: Partial<Transaction> = {
      _id: editingTxId || makeId('tx'),
      date: normalizeImportDate(fDate) || fDate,
      cv: fCv,
      voucherName: fVoucher,
      supplier: found ? supplierDisplayName(found) : (fVoucher || 'For verification'),
      tin: cleanedTin,
      description: fDesc,
      accountingTitle: fAccountingTitle,
      bankAccount: fBankAccount,
      amount: parseMoney(fAmount) || 0,
      vatCategory: fVatCategory || 'VAT-12',
      atcCode: fAtcCode || '',
      inv: fInv || fCv,
      manualStatus: 'unreviewed',
      supplierManualOverride: false
    };

    if (editingTxId) {
      setSalesTransactions(prev => prev.map(t => t._id === editingTxId ? { ...t, ...rowData } : t));
      setEditingTxId(null);
    } else {
      addSalesTransaction(rowData);
    }

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
  };

  // Edit existing row
  const startEditTransaction = (t: Transaction) => {
    setEditingTxId(t._id);
    setFDate(t.date);
    setFCv(t.cv);
    setFVoucher(t.voucherName);
    setFDesc(t.description || '');
    setFAccountingTitle(t.accountingTitle);
    setFBankAccount(t.bankAccount);
    setFAmount(String(t.total || t.amount));
    setFVatCategory(t.vatCategory);
    setFAtcCode(t.atcCode || '');
    setFInv(t.inv || '');
    setFTin(t.tin || '');
    const cleaned = normalizeTIN(t.tin || '');
    const found = findSupplierByTIN(cleaned);
    setMatchedSupplierLabel(found ? supplierDisplayName(found) : '');
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete individual transaction
  const deleteRow = (id: string) => {
    if (confirm('Delete this transaction permanently?')) {
      setSalesTransactions(prev => prev.filter(t => t._id !== id));
    }
  };

  // Sort change triggers
  const handleSortChange = (key: string) => {
    if (salesSort.key === key) {
      setSalesSort({ key, dir: salesSort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      setSalesSort({ key, dir: 'asc' });
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {/* Top Banner Summaries & Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric Card: Output VAT */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Output VAT (Book)</span>
            <Scale className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight leading-none">
              <Peso value={bookVatTotal} />
            </h3>
            <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-none">
              From {visibleSalesTransactions.length} recorded sales vouchers
            </p>
          </div>
        </div>

        {/* Metric Card: CWT Withheld */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CWT Amount (Book)</span>
            <Percent className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight leading-none">
              <Peso value={bookEwtTotal} />
            </h3>
            <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-none">
              Tax withheld by customers
            </p>
          </div>
        </div>

        {/* Status: Unreviewed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unreviewed Entries</span>
            <AlertCircle className={`w-4 h-4 ${unreviewedCount > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
          </div>
          <div className="mt-2.5">
            <h3 className={`text-xl font-bold tracking-tight leading-none ${unreviewedCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {unreviewedCount}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-none">
              Awaiting verification review
            </p>
          </div>
        </div>

        {/* Status: Missing Customer Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Missing customer Info</span>
            <Users className={`w-4 h-4 ${blankSuppliersCount > 0 ? 'text-rose-500' : 'text-slate-300'}`} />
          </div>
          <div className="mt-2.5">
            <h3 className={`text-xl font-bold tracking-tight leading-none ${blankSuppliersCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {blankSuppliersCount}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-none">
              Vouchers missing name / TIN mapping
            </p>
          </div>
        </div>
      </div>

      {/* Control Buttons (Add & Import) */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setShowAdd(!showAdd); if (showImport) setShowImport(false); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all duration-150 ${
            showAdd
              ? 'bg-slate-800 text-white shadow-sm'
              : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          {showAdd ? 'Close Editor' : 'Create Sales Voucher'}
        </button>

        <button
          onClick={() => { setShowImport(!showImport); if (showAdd) setShowAdd(false); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all duration-150 ${
            showImport
              ? 'bg-slate-800 text-white shadow-sm'
              : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          {showImport ? 'Close Importer' : 'Import QuickBooks / Excel'}
        </button>
      </div>

      {/* Form: Manual Creation & Edit Panel */}
      {showAdd && (
        <form onSubmit={handleAddSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-5 animate-fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">
              {editingTxId ? 'Modify Sales Voucher Entry' : 'Manual Sales Voucher creation form'}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Supply standard revenue voucher parameters below. Base taxable amount, Output VAT, and totals are computed dynamically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date (MM/DD/YYYY) *</label>
              <input
                type="text"
                placeholder="06/25/2026"
                value={fDate}
                onChange={e => setFDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Invoice/OR No */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoice / OR No *</label>
              <input
                type="text"
                placeholder="INV-2026-001"
                value={fCv}
                onChange={e => setFCv(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Customer TIN */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer TIN</label>
              <input
                type="text"
                placeholder="123-456-789-000"
                value={fTin}
                onChange={e => handleTinChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              {matchedSupplierLabel && (
                <span className="text-[9px] text-emerald-600 font-semibold leading-none">
                  ✓ Matched: {matchedSupplierLabel}
                </span>
              )}
            </div>

            {/* Customer Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer Name *</label>
              <input
                type="text"
                placeholder="Acme Sales Corp"
                value={fVoucher}
                onChange={e => setFVoucher(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Gross Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gross Amount *</label>
              <input
                type="text"
                placeholder="5000.00"
                value={fAmount}
                onChange={e => setFAmount(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Revenue Account */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Revenue Account *</label>
              <input
                type="text"
                placeholder="4000 - Service Revenues"
                value={fAccountingTitle}
                onChange={e => setFAccountingTitle(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Cash/Clearing Account */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cash/Clearing Account *</label>
              <input
                type="text"
                placeholder="1010 - BDO Cash in Bank"
                value={fBankAccount}
                onChange={e => setFBankAccount(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Output VAT Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Output VAT Category</label>
              <select
                value={fVatCategory}
                onChange={e => setFVatCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">(Select Category)</option>
                {vatCategories.map(cat => (
                  <option key={cat.code} value={cat.code}>
                    {cat.code} - {cat.label} ({(cat.rate * 100)}%)
                  </option>
                ))}
              </select>
            </div>

            {/* ATC Code */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ATC Code (CWT Withheld)</label>
              <select
                value={fAtcCode}
                onChange={e => setFAtcCode(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">No Tax Withheld (0%)</option>
                {atcMaster.map(a => (
                  <option key={a.atcCode} value={a.atcCode}>
                    {a.atcCode} - {a.description.slice(0, 45)}... ({(a.rate * 100)}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5 md:col-span-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Line description / Remarks</label>
              <input
                type="text"
                placeholder="Service rendering for Q2 milestones..."
                value={fDesc}
                onChange={e => setFDesc(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setEditingTxId(null); setShowAdd(false); }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all duration-150 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all duration-150 shadow-sm shadow-blue-600/10 cursor-pointer"
            >
              {editingTxId ? 'Apply Changes' : 'Record Voucher'}
            </button>
          </div>
        </form>
      )}

      {/* Importer Panel */}
      {showImport && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-5 animate-fade-in">
          <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">QuickBooks or Excel template Import Engine</h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Import standard sales logs, Output VAT GL ledger maps, or CWT withholding files in Excel or CSV.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mode:</span>
              <select
                value={importType}
                onChange={e => setImportType(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white focus:outline-none cursor-pointer"
              >
                <option value="salesBook">Sales Transactions Book</option>
                <option value="outputVatLedger">Output VAT Balances</option>
                <option value="cwtLedger">CWT Withheld Ledger</option>
                <option value="supplierMaster">Customer / Supplier Directory</option>
              </select>
            </div>
          </div>

          {/* Import Upload Field */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="flex flex-col gap-4">
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mb-3" />
                <span className="text-xs font-semibold text-slate-700">Drop or Select Spreadsheet</span>
                <span className="text-[10px] text-slate-400 mt-1">XLSX, XLS or CSV files only</span>
              </div>

              {/* Replace on Import Switch */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none px-1">
                <input
                  type="checkbox"
                  checked={replaceOnImport}
                  onChange={e => setReplaceOnImport(e.target.checked)}
                  className="rounded border-slate-200 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-[10px] font-semibold text-slate-600">
                  Wipe current active database rows before mapping this import file
                </span>
              </label>
            </div>

            {/* Information Tips */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/40 text-slate-500 leading-relaxed text-[11px] flex flex-col gap-3">
              <h4 className="font-bold text-slate-700 text-xs">Spreadsheet Columns Guideline:</h4>
              <p>
                <strong>Sales Transactions Book</strong> column mappings look for: <code>Date, Invoice/OR No, Customer Name, Gross Amount, Revenue Account</code>.
              </p>
              <p>
                <strong>Output VAT / CWT Ledger</strong> balance files search for: <code>Invoice/OR No, Customer/Supplier, Posting Date, Ledger Amount</code>.
              </p>
              <p className="text-blue-600 font-medium">
                💡 Auto-detects QuickBooks transaction journals or tax detail files on load.
              </p>
            </div>
          </div>

          {/* Import Outputs */}
          {importSummary && (
            <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-emerald-800 text-[11px] font-semibold leading-relaxed animate-fade-in flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>{importSummary}</div>
            </div>
          )}

          {importIssues.length > 0 && (
            <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl animate-fade-in flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Import Validation Flags / Skipped lines list:</span>
              </div>
              <div className="max-h-40 overflow-y-auto text-[10px] text-amber-700 leading-normal font-mono flex flex-col gap-1.5 divide-y divide-amber-100/40">
                {importIssues.map((iss, i) => (
                  <div key={i} className="pt-1">
                    Row {iss.rowNumber}: <span className="font-bold uppercase">[{iss.field}]</span> {iss.message} {iss.cv ? `(INV: ${iss.cv})` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Breakdown / Listing Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Breakdowns */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Tax Categories Breakdown Panel */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <button
              onClick={() => setActiveSalesBreakdown(activeSalesBreakdown === 'vat' ? null : 'vat')}
              className="w-full px-5 py-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Output VAT breakdown</h3>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {vatBreakdownRows.length}
                </span>
                {activeSalesBreakdown === 'vat' ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {activeSalesBreakdown === 'vat' && (
              <div className="p-4 flex flex-col gap-3 max-h-96 overflow-y-auto">
                {vatBreakdownRows.map(row => (
                  <div key={row.code} className="bg-slate-50/60 p-3 rounded-xl border border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 leading-tight">{row.code}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{row.count} sales</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">{row.label}</p>
                    <div className="flex items-center justify-between mt-1 text-[11px] font-semibold border-t border-slate-100 pt-1.5">
                      <div className="text-slate-400 font-normal">VAT: <span className="font-semibold text-emerald-600"><Peso value={row.vat} /></span></div>
                      <div className="text-slate-600">Total: <Peso value={row.total} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CWT Breakdown Panel */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <button
              onClick={() => setActiveSalesBreakdown(activeSalesBreakdown === 'ewt' ? null : 'ewt')}
              className="w-full px-5 py-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50/40 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">CWT Withheld breakdown</h3>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {ewtBreakdownRows.length}
                </span>
                {activeSalesBreakdown === 'ewt' ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {activeSalesBreakdown === 'ewt' && (
              <div className="p-4 flex flex-col gap-3 max-h-96 overflow-y-auto">
                {ewtBreakdownRows.map(row => (
                  <div key={row.code} className="bg-slate-50/60 p-3 rounded-xl border border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 leading-tight">{row.code} ({row.rate})</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{row.count} sales</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">{row.label}</p>
                    <div className="flex items-center justify-between mt-1 text-[11px] font-semibold border-t border-slate-100 pt-1.5">
                      <div className="text-slate-400 font-normal">Withheld: <span className="font-semibold text-blue-600"><Peso value={row.ewt} /></span></div>
                      <div className="text-slate-600">Base: <Peso value={row.amount} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Main Interactive List table */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* List Search & Filter Area */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Invoice, Customer name, TIN, account title, split bank..."
                value={salesSearch}
                onChange={e => setSalesSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200/80 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={salesStatusFilter}
                onChange={e => setSalesStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none cursor-pointer"
              >
                <option value="">(All Verification Statuses)</option>
                <option value="unreviewed">Unreviewed</option>
                <option value="ok">Ok / Balanced</option>
                <option value="warn">Warning / Variance</option>
                <option value="err">Critical Error</option>
              </select>

              <select
                value={salesVarianceFilter}
                onChange={e => setSalesVarianceFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none cursor-pointer"
              >
                <option value="">(All Variance Filters)</option>
                <option value="vat">Output VAT Variance</option>
                <option value="ewt">CWT Withholding Variance</option>
                <option value="any">Any Ledger Variance</option>
              </select>
            </div>
          </div>

          {/* Table list view */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider select-none">
                    <th onClick={() => handleSortChange('cv')} className="p-4 cursor-pointer hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-center gap-1">
                        <span>Invoice / OR No</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSortChange('date')} className="p-4 cursor-pointer hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-center gap-1">
                        <span>Posting Date</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSortChange('voucher')} className="p-4 cursor-pointer hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-center gap-1">
                        <span>Customer Name</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSortChange('vat')} className="p-4 text-right cursor-pointer hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-center justify-end gap-1">
                        <span>Output VAT</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSortChange('ewt')} className="p-4 text-right cursor-pointer hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-center justify-end gap-1">
                        <span>CWT Amount</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSortChange('total')} className="p-4 text-right cursor-pointer hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-center justify-end gap-1">
                        <span>Gross Total</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-4 text-center">Compliance</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredSalesCvGroups.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                        No recorded revenue transactions match your active month and filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSalesCvGroups.map((g, idx) => {
                      const t = g.txns[0] || {};
                      const matchedStatus = verificationText(g.status.status);
                      const isVatDiff = !isBalanced(g.vatDiff);
                      const isEwtDiff = !isBalanced(g.ewtDiff);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold font-mono text-slate-800">{g.cv}</td>
                          <td className="p-4 text-slate-500">{g.dateDisplay}</td>
                          <td className="p-4 font-semibold text-slate-700">
                            {g.voucherNames}
                            {t.tin && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{formatTIN(t.tin)}</div>}
                          </td>
                          <td className={`p-4 text-right font-bold font-mono ${isVatDiff ? 'text-rose-600' : 'text-slate-800'}`}>
                            <Peso value={g.bookVat} />
                          </td>
                          <td className={`p-4 text-right font-bold font-mono ${isEwtDiff ? 'text-amber-600' : 'text-slate-800'}`}>
                            <Peso value={g.bookEwt} />
                          </td>
                          <td className="p-4 text-right font-extrabold font-mono text-slate-800">
                            <Peso value={g.bookTotal} />
                          </td>
                          <td className="p-4 text-center">
                            {(() => {
                              const status = g.status.status;
                              let badgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
                              if (status === 'ok') badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                              else if (status === 'warn') badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                              else if (status === 'err') badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                              else if (status === 'journal') badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                              else if (status === 'adjusting') badgeClass = 'bg-pink-50 text-pink-700 border-pink-200';

                              return (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[9px] font-extrabold uppercase border ${badgeClass}`}>
                                  {verificationText(status)}
                                </span>
                              );
                            })()}
                            {(isVatDiff || isEwtDiff) && (
                              <div className="text-[9px] text-rose-500 font-bold mt-1 leading-none uppercase">
                                Variance alert
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => startEditTransaction(t)}
                                title="Edit Sales Transaction"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteRow(t._id)}
                                title="Delete permanently"
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
