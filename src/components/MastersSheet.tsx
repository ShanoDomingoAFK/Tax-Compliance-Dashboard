import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { VATCategory, ATCEntry, Supplier, Transaction } from '../types';
import {
  normalizeVatCodeRaw,
  normalizeATC,
  parseRate,
  normalizeSupplier,
  normalizeTIN,
  supplierFieldHasSpecial,
  supplierDisplayName,
  formatTIN
} from '../utils/helpers';
import { COMPANY_PROFILE } from '../data/demo';

interface MastersSheetProps {
  vatCategories: VATCategory[];
  setVatCategories: React.Dispatch<React.SetStateAction<VATCategory[]>>;
  atcMaster: ATCEntry[];
  setAtcMaster: React.Dispatch<React.SetStateAction<ATCEntry[]>>;
  supplierMaster: Supplier[];
  setSupplierMaster: React.Dispatch<React.SetStateAction<Supplier[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  
  activeMasterSub: 'vatCategories' | 'atcRates' | 'suppliers';
  setActiveMasterSub: (val: 'vatCategories' | 'atcRates' | 'suppliers') => void;
  
  vatCategorySearch: string;
  setVatCategorySearch: (val: string) => void;
  atcSearch: string;
  setAtcSearch: (val: string) => void;
  supplierSearch: string;
  setSupplierSearch: (val: string) => void;
}

export default function MastersSheet({
  vatCategories,
  setVatCategories,
  atcMaster,
  setAtcMaster,
  supplierMaster,
  setSupplierMaster,
  setTransactions,

  activeMasterSub,
  setActiveMasterSub,

  vatCategorySearch,
  setVatCategorySearch,
  atcSearch,
  setAtcSearch,
  supplierSearch,
  setSupplierSearch
}: MastersSheetProps) {

  // --- Form State ---
  // VAT Category Form
  const [vcCode, setVcCode] = useState('');
  const [vcLabel, setVcLabel] = useState('');
  const [vcKind, setVcKind] = useState('VAT Registered');
  const [vcRate, setVcRate] = useState('');

  // ATC Form
  const [atcCode, setAtcCode] = useState('');
  const [atcRate, setAtcRate] = useState('');
  const [atcDesc, setAtcDesc] = useState('');
  const [atcSource, setAtcSource] = useState('');

  // Supplier Form
  const [supTin, setSupTin] = useState('');
  const [supRegistered, setSupRegistered] = useState('');
  const [supLast, setSupLast] = useState('');
  const [supFirst, setSupFirst] = useState('');
  const [supMiddle, setSupMiddle] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supCity, setSupCity] = useState('');
  const [supZip, setSupZip] = useState('');

  // Validation feedback
  const [supplierValidationError, setSupplierValidationError] = useState('');

  // --- Handlers ---

  // Save VAT Category
  function handleAddVatCategory() {
    const code = normalizeVatCodeRaw(vcCode);
    if (!code) {
      alert('Please enter a valid VAT Category code.');
      return;
    }
    if (!vcLabel) {
      alert('Please enter a description for the VAT Category.');
      return;
    }

    const rate = parseRate(vcRate) ?? 0;
    const freshCat: VATCategory = {
      _id: 'vc_' + Date.now().toString(36),
      code,
      label: vcLabel.trim(),
      kind: vcKind,
      rate,
      status: 'active'
    };

    setVatCategories(prev => {
      const filtered = prev.filter(c => c.code !== code);
      return [...filtered, freshCat].sort((a, b) => a.code.localeCompare(b.code));
    });

    setVcCode('');
    setVcLabel('');
    setVcRate('');
    alert('VAT Category saved.');
  }

  // Save ATC Entry
  function handleAddATC() {
    const code = normalizeATC(atcCode);
    if (!code) {
      alert('ATC Code must use a format like WC 160 or WI 160.');
      return;
    }
    const rate = parseRate(atcRate);
    if (rate === null) {
      alert('Please enter a valid EWT rate percentage (e.g. 2).');
      return;
    }

    const freshAtc: ATCEntry = {
      _id: 'atc_' + Date.now().toString(36),
      atcCode: code,
      rate,
      description: atcDesc.trim(),
      source: atcSource.trim(),
      status: 'active'
    };

    setAtcMaster(prev => {
      const filtered = prev.filter(a => normalizeATC(a.atcCode) !== code);
      return [...filtered, freshAtc].sort((a, b) => a.atcCode.localeCompare(b.atcCode));
    });

    // Auto update existing transactions computations with new ATC code rates
    setTransactions(prev => prev.map(t => {
      if (normalizeATC(t.atcCode) === code) {
        const ewtVal = t.amount * rate / 100;
        return { ...t, ewtAmount: ewtVal };
      }
      return t;
    }));

    setAtcCode('');
    setAtcRate('');
    setAtcDesc('');
    setAtcSource('');
    alert('ATC Code saved.');
  }

  // Save Supplier (including BIR compliance character blocker)
  function handleAddSupplier() {
    setSupplierValidationError('');
    const cleanTin = formatTIN(supTin);
    if (!normalizeTIN(cleanTin)) {
      alert('Please enter a valid supplier TIN.');
      return;
    }

    const row = {
      _id: 'sup_' + Date.now().toString(36),
      tin: cleanTin,
      registeredName: supRegistered.trim(),
      lastName: supLast.trim(),
      firstName: supFirst.trim(),
      middleName: supMiddle.trim(),
      address: supAddress.trim(),
      city: supCity.trim(),
      zip: supZip.trim()
    };

    // Strict BIR Validation: allowed characters are A-Z, 0-9, space, and . , & ( ) ' / -
    const fieldsToCheck = [
      { key: 'registeredName', label: 'Registered Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'firstName', label: 'First Name' },
      { key: 'middleName', label: 'Middle Name' },
      { key: 'address', label: 'Registered Address' },
      { key: 'city', label: 'City' },
      { key: 'zip', label: 'ZIP Code' }
    ];

    const invalidFields = fieldsToCheck.filter(f => supplierFieldHasSpecial((row as any)[f.key]));

    if (invalidFields.length > 0) {
      const names = invalidFields.map(f => f.label).join(', ');
      setSupplierValidationError(
        `Cannot save: unsupported characters for BIR Compliance. The BIR DAT format only accepts letters, numbers, spaces and . , & ( ) ' / - . Please remove special symbols and accents (ñ, é, #, @, *, :, ;) in: ${names}.`
      );
      return;
    }

    setSupplierMaster(prev => {
      const filtered = prev.filter(s => normalizeTIN(s.tin) !== normalizeTIN(cleanTin));
      return [...filtered, row].sort((a, b) => supplierDisplayName(a).localeCompare(supplierDisplayName(b)));
    });

    setSupTin('');
    setSupRegistered('');
    setSupLast('');
    setSupFirst('');
    setSupMiddle('');
    setSupAddress('');
    setSupCity('');
    setSupZip('');
    alert('Supplier Master record saved.');
  }

  // Edit Supplier Trigger
  function handleEditSupplier(s: Supplier) {
    setSupTin(s.tin);
    setSupRegistered(s.registeredName);
    setSupLast(s.lastName);
    setSupFirst(s.firstName);
    setSupMiddle(s.middleName);
    setSupAddress(s.address);
    setSupCity(s.city);
    setSupZip(s.zip);
    alert(`Loaded TIN ${s.tin} details into manual entry fields for correction.`);
  }

  // --- Deletions ---
  function deleteVatCategory(code: string) {
    setVatCategories(prev => prev.filter(c => c.code !== code));
  }

  function deleteATC(code: string) {
    setAtcMaster(prev => prev.filter(a => normalizeATC(a.atcCode) !== normalizeATC(code)));
  }

  function deleteSupplier(tin: string) {
    setSupplierMaster(prev => prev.filter(s => normalizeTIN(s.tin) !== normalizeTIN(tin)));
  }

  // --- Master Exporters ---
  function exportVatCategoriesExcel() {
    const rows = [['VAT Category', 'Description', 'VAT Type', 'VAT Rate']];
    vatCategories.forEach(c => {
      rows.push([c.code, c.label, c.kind, `${c.rate}%`]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VAT Categories');
    XLSX.writeFile(wb, 'vat_categories_master.xlsx');
  }

  function exportAtcMasterExcel() {
    const rows = [['ATC Code', 'EWT Rate', 'Description', 'Database Reference']];
    atcMaster.forEach(a => {
      rows.push([a.atcCode, `${a.rate}%`, a.description, a.source]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ATC Master');
    XLSX.writeFile(wb, 'atc_master_rates.xlsx');
  }

  function exportSupplierExcel() {
    const rows = [['TIN', 'Registered Name', 'Last Name', 'First Name', 'Middle Name', 'Address', 'City', 'ZIP Code']];
    supplierMaster.forEach(s => {
      rows.push([s.tin, s.registeredName, s.lastName, s.firstName, s.middleName, s.address, s.city, s.zip]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
    XLSX.writeFile(wb, 'supplier_master_database.xlsx');
  }

  // Filtering Lists
  const filteredVatCategories = vatCategories.filter(c => {
    const query = vatCategorySearch.toLowerCase().trim();
    return [c.code, c.label, c.kind].some(v => String(v || '').toLowerCase().includes(query));
  });

  const filteredAtcMaster = atcMaster.filter(a => {
    const query = atcSearch.toLowerCase().trim();
    return [a.atcCode, a.description, a.source].some(v => String(v || '').toLowerCase().includes(query));
  });

  const filteredSupplierMaster = supplierMaster.filter(s => {
    const query = supplierSearch.toLowerCase().trim();
    return [s.tin, s.registeredName, s.lastName, s.firstName, s.middleName, s.address, s.city, s.zip]
      .some(v => String(v || '').toLowerCase().includes(query));
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 flex-wrap bg-white/70 border border-slate-200/80 rounded-xl p-2.5 shadow-sm">
        <button
          onClick={() => setActiveMasterSub('vatCategories')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition ${
            activeMasterSub === 'vatCategories' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          VAT Categories Dictionaries ({vatCategories.length})
        </button>
        <button
          onClick={() => setActiveMasterSub('atcRates')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition ${
            activeMasterSub === 'atcRates' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          ATC Master Rates ({atcMaster.length})
        </button>
        <button
          onClick={() => setActiveMasterSub('suppliers')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition ${
            activeMasterSub === 'suppliers' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Supplier Master Lookup ({supplierMaster.length})
        </button>
      </div>

      {/* 1. VAT CATEGORIES PANE */}
      {activeMasterSub === 'vatCategories' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">VAT Category Reference Codes</h4>
            <button
              onClick={exportVatCategoriesExcel}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs rounded-full hover:bg-slate-50 font-bold shadow-sm"
            >
              📊 Export VAT Categories (XLSX)
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-inner">
            <h5 className="font-bold text-xs text-slate-700 mb-2 uppercase tracking-wide">Manual encode VAT Category</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-400 text-[10px]">VAT Code *</label>
                <input
                  type="text"
                  placeholder="e.g. S, G, I"
                  value={vcCode}
                  onChange={(e) => setVcCode(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="font-bold text-slate-400 text-[10px]">Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Vatable services"
                  value={vcLabel}
                  onChange={(e) => setVcLabel(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-400 text-[10px]">VAT Rate %</label>
                <input
                  type="text"
                  placeholder="12 or 0"
                  value={vcRate}
                  onChange={(e) => setVcRate(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white font-mono"
                />
              </div>
            </div>
            <button
              onClick={handleAddVatCategory}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow"
            >
              Add / Update VAT Category
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search VAT codes or descriptions..."
              value={vatCategorySearch}
              onChange={(e) => setVatCategorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase select-none text-left">
                  <th className="py-2.5 px-3">VAT Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">VAT Type</th>
                  <th className="py-2.5 px-3 text-right">VAT Rate</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredVatCategories.map((c, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/40 font-mono text-slate-700">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{c.code}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{c.label}</td>
                    <td className="py-2.5 px-3 font-sans">{c.kind}</td>
                    <td className="py-2.5 px-3 text-right">{c.rate}%</td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => deleteVatCategory(c.code)}
                        className="text-red-500 hover:text-red-700 font-bold font-sans"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. ATC RATES PANE */}
      {activeMasterSub === 'atcRates' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">Alphanumeric Tax Codes (ATC) Master List</h4>
            <button
              onClick={exportAtcMasterExcel}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs rounded-full hover:bg-slate-50 font-bold shadow-sm"
            >
              📊 Export ATC Master (XLSX)
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-inner">
            <h5 className="font-bold text-xs text-slate-700 mb-2 uppercase tracking-wide">Manual encode ATC Code</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-400 text-[10px]">ATC Code *</label>
                <input
                  type="text"
                  placeholder="e.g. WC 160"
                  value={atcCode}
                  onChange={(e) => setAtcCode(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-400 text-[10px]">EWT Rate % *</label>
                <input
                  type="text"
                  placeholder="e.g. 2"
                  value={atcRate}
                  onChange={(e) => setAtcRate(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white font-mono"
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="font-bold text-slate-400 text-[10px]">Description</label>
                <input
                  type="text"
                  placeholder="Nature of withholding payment"
                  value={atcDesc}
                  onChange={(e) => setAtcDesc(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="font-bold text-slate-400 text-[10px]">Source / Reference Database</label>
                <input
                  type="text"
                  placeholder="Basis legal reference"
                  value={atcSource}
                  onChange={(e) => setAtcSource(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>
            <button
              onClick={handleAddATC}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow"
            >
              Add / Update ATC Code
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search ATC codes, descriptions, references..."
              value={atcSearch}
              onChange={(e) => setAtcSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase select-none text-left">
                  <th className="py-2.5 px-3">ATC Code</th>
                  <th className="py-2.5 px-3 text-right">EWT Rate</th>
                  <th className="py-2.5 px-3">Description / Nature</th>
                  <th className="py-2.5 px-3">Database Reference Source</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAtcMaster.map((a, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/40 font-mono text-slate-700">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{a.atcCode}</td>
                    <td className="py-2.5 px-3 text-right text-slate-900">{a.rate}%</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{a.description || '--'}</td>
                    <td className="py-2.5 px-3 font-sans">{a.source || '--'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => deleteATC(a.atcCode)}
                        className="text-red-500 hover:text-red-700 font-bold font-sans"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SUPPLIER MASTER PANE */}
      {activeMasterSub === 'suppliers' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">Supplier Master Database lookup</h4>
            <button
              onClick={exportSupplierExcel}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs rounded-full hover:bg-slate-50 font-bold shadow-sm"
            >
              📊 Export Supplier Database (XLSX)
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-inner">
            <h5 className="font-bold text-xs text-slate-700 mb-2 uppercase tracking-wide">Manual encode Supplier master</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-400 text-[10px]">TIN *</label>
                <input
                  type="text"
                  placeholder="000-000-000-000"
                  value={supTin}
                  onChange={(e) => setSupTin(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-400 text-[10px]">Registered Name (Corporate)</label>
                <input
                  type="text"
                  placeholder="Corporation Name"
                  value={supRegistered}
                  onChange={(e) => setSupRegistered(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-400 text-[10px]">LastName (Individual)</label>
                <input
                  type="text"
                  value={supLast}
                  onChange={(e) => setSupLast(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-400 text-[10px]">FirstName (Individual)</label>
                <input
                  type="text"
                  value={supFirst}
                  onChange={(e) => setSupFirst(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-400 text-[10px]">MiddleName (Individual)</label>
                <input
                  type="text"
                  value={supMiddle}
                  onChange={(e) => setSupMiddle(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="font-bold text-slate-400 text-[10px]">Registered Address</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-400 text-[10px]">City</label>
                <input
                  type="text"
                  value={supCity}
                  onChange={(e) => setSupCity(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-400 text-[10px]">ZIP Code</label>
                <input
                  type="text"
                  value={supZip}
                  onChange={(e) => setSupZip(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-white font-mono"
                />
              </div>
            </div>

            {/* Invalidation error box for special characters */}
            {supplierMasterValidationIssues(supTin, supRegistered, supLast, supFirst, supMiddle, supAddress, supCity, supZip)}

            <button
              onClick={handleAddSupplier}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow"
            >
              Add / Update Supplier master
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search TIN, registered names, addresses, cities..."
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase select-none text-left">
                    <th className="py-2.5 px-3">TIN</th>
                    <th className="py-2.5 px-3">Registered Name</th>
                    <th className="py-2.5 px-3">Last Name</th>
                    <th className="py-2.5 px-3">First Name</th>
                    <th className="py-2.5 px-3">Middle Name</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3">City</th>
                    <th className="py-2.5 px-3">ZIP Code</th>
                    <th className="py-2.5 px-3 text-center">BIR Alert</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSupplierMaster.map((s, i) => {
                    const hasAlert = [
                      s.registeredName, s.lastName, s.firstName, s.middleName, s.address, s.city, s.zip
                    ].some(val => supplierFieldHasSpecial(val));

                    return (
                      <tr
                        key={i}
                        className={`border-b border-slate-100 hover:bg-slate-50/40 text-slate-700 ${
                          hasAlert ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{s.tin}</td>
                        <td className={`py-2.5 px-3 ${supplierFieldHasSpecial(s.registeredName) ? 'bg-amber-100/50 text-amber-700 font-bold' : ''}`}>
                          {s.registeredName || '--'}
                        </td>
                        <td className={`py-2.5 px-3 ${supplierFieldHasSpecial(s.lastName) ? 'bg-amber-100/50 text-amber-700 font-bold' : ''}`}>
                          {s.lastName || '--'}
                        </td>
                        <td className={`py-2.5 px-3 ${supplierFieldHasSpecial(s.firstName) ? 'bg-amber-100/50 text-amber-700 font-bold' : ''}`}>
                          {s.firstName || '--'}
                        </td>
                        <td className={`py-2.5 px-3 ${supplierFieldHasSpecial(s.middleName) ? 'bg-amber-100/50 text-amber-700 font-bold' : ''}`}>
                          {s.middleName || '--'}
                        </td>
                        <td className={`py-2.5 px-3 ${supplierFieldHasSpecial(s.address) ? 'bg-amber-100/50 text-amber-700 font-bold' : ''}`}>
                          {s.address || '--'}
                        </td>
                        <td className={`py-2.5 px-3 ${supplierFieldHasSpecial(s.city) ? 'bg-amber-100/50 text-amber-700 font-bold' : ''}`}>
                          {s.city || '--'}
                        </td>
                        <td className={`py-2.5 px-3 font-mono ${supplierFieldHasSpecial(s.zip) ? 'bg-amber-100/50 text-amber-700 font-bold' : ''}`}>
                          {s.zip || '--'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {hasAlert ? (
                            <span className="px-2 py-0.5 text-[9px] bg-amber-100 text-amber-800 border border-amber-200 rounded-full font-bold">
                              Needs Correction
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex gap-2 justify-center items-center">
                            <button
                              onClick={() => handleEditSupplier(s)}
                              className="text-blue-600 hover:text-blue-800 font-bold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteSupplier(s.tin)}
                              className="text-red-500 hover:text-red-700 font-bold"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper supplier error checker UI
  function supplierMasterValidationIssues(
    tin: string, registered: string, last: string, first: string, middle: string, addr: string, city: string, zip: string
  ) {
    const row = { tin, registeredName: registered, lastName: last, firstName: first, middleName: middle, address: addr, city, zip };
    const fieldsToCheck = [
      { key: 'registeredName', label: 'Registered Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'firstName', label: 'First Name' },
      { key: 'middleName', label: 'Middle Name' },
      { key: 'address', label: 'Registered Address' },
      { key: 'city', label: 'City' },
      { key: 'zip', label: 'ZIP Code' }
    ];

    const invalidFields = fieldsToCheck.filter(f => supplierFieldHasSpecial((row as any)[f.key]));

    if (invalidFields.length === 0) return null;

    const names = invalidFields.map(f => f.label).join(', ');
    return (
      <div className="mt-3 p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl leading-relaxed">
        <strong className="block mb-1 font-bold text-red-900">🚫 Invalid Characters for BIR compliance detected:</strong>
        The BIR DAT format only accepts letters, numbers, spaces, and the symbols: <code>. , &amp; ( ) &apos; / -</code>.
        Please correct: <span className="font-bold underline">{names}</span> (remove accents like ñ, é, or characters like #, @, *, :, ;).
      </div>
    );
  }
}
