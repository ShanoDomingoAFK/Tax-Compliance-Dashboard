import React, { useState, useEffect } from 'react';
import Peso from './Peso';
import { Transaction, VATCategory, ATCEntry, Supplier, LedgerRow } from '../types';
import {
  pesoText,
  verificationText,
  supplierFieldHasSpecial,
  isBalanced,
  normalizeTIN,
  normalizeATC,
  normalizeVatCodeRaw
} from '../utils/helpers';

interface CVReviewModalProps {
  cvGroup: any;
  vatCategories: VATCategory[];
  atcMaster: ATCEntry[];
  supplierMaster: Supplier[];
  onClose: () => void;
  updateTransaction: (id: string, fields: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  findSupplierByTIN: (tin: string) => Supplier | null;
  setFocusedCV: (cv: string | null) => void;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setVatLedger: React.Dispatch<React.SetStateAction<LedgerRow[]>>;
  setEwtLedger: React.Dispatch<React.SetStateAction<LedgerRow[]>>;
}

export default function CVReviewModal({
  cvGroup,
  vatCategories,
  atcMaster,
  supplierMaster,
  onClose,
  updateTransaction,
  deleteTransaction,
  findSupplierByTIN,
  setFocusedCV,
  setTransactions,
  setVatLedger,
  setEwtLedger
}: CVReviewModalProps) {

  const atcRateText = (code: string) => {
    const a = atcMaster.find(x => x.atcCode === code);
    return a ? `${a.rate}%` : '--';
  };

  // Global CV Name Editor
  const [isEditingCvName, setIsEditingCvName] = useState(false);
  const [editedCvName, setEditedCvName] = useState('');

  useEffect(() => {
    if (cvGroup) {
      setEditedCvName(cvGroup.cv);
    }
  }, [cvGroup]);

  // Line-level description edit trackers
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [editedDescVal, setEditedDescVal] = useState('');

  if (!cvGroup) return null;

  // Handle global CV number rename
  function handleRenameCV() {
    const nextCv = editedCvName.trim();
    if (!nextCv) {
      alert('CV Number cannot be blank.');
      return;
    }
    const prevCv = cvGroup.cv;
    if (nextCv === prevCv) {
      setIsEditingCvName(false);
      return;
    }

    // Rename on all transaction lines
    setTransactions(prev => prev.map(t => {
      if (t.cv === prevCv) {
        return { ...t, cv: nextCv };
      }
      return t;
    }));

    // Rename G/L matching rows
    setVatLedger(prev => prev.map(r => {
      if (r.cv === prevCv) return { ...r, cv: nextCv };
      return r;
    }));

    setEwtLedger(prev => prev.map(r => {
      if (r.cv === prevCv) return { ...r, cv: nextCv };
      return r;
    }));

    setFocusedCV(nextCv);
    setIsEditingCvName(false);
    alert('Check Voucher code updated across all transaction lines and ledger matching rows.');
  }

  // Handle Supplier TIN update
  function handleLineTinChange(id: string, tinVal: string) {
    const s = findSupplierByTIN(tinVal);
    const updates: Partial<Transaction> = { tin: tinVal };

    if (s) {
      updates.supplier = s.registeredName || `${s.firstName} ${s.middleName} ${s.lastName}`.trim();
      updates.registeredName = s.registeredName;
      updates.lastName = s.lastName;
      updates.firstName = s.firstName;
      updates.middleName = s.middleName;
      updates.address = s.address;
      updates.city = s.city;
      updates.zip = s.zip;
      updates.supplierManualOverride = false;
    }

    updateTransaction(id, updates);
  }

  // Apply supplier manual override fields
  function handleSupplierManualEdit(id: string, key: string, val: string) {
    updateTransaction(id, {
      [key]: val,
      supplierManualOverride: true
    });
  }

  // Handle line numerical updates
  function handleAmountUpdate(id: string, amountStr: string) {
    const amt = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;
    updateTransaction(id, { amount: amt });
  }

  function handleTotalUpdate(id: string, totalStr: string) {
    const tot = parseFloat(totalStr.replace(/[^0-9.-]/g, '')) || 0;
    updateTransaction(id, { total: tot });
  }

  function handleVatCatUpdate(id: string, catCode: string) {
    updateTransaction(id, { vatCategory: catCode });
  }

  function handleAtcUpdate(id: string, atc: string) {
    updateTransaction(id, { atcCode: atc });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-md z-[1600] p-4 overflow-hidden select-none">
      <div className="w-full max-w-[1700px] h-[85vh] bg-slate-50 border border-slate-200/50 rounded-3xl shadow-[0_24px_60px_rgba(15,23,42,0.22)] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              {/* CV Code Title Inline Editor */}
              {isEditingCvName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedCvName}
                    onChange={(e) => setEditedCvName(e.target.value)}
                    className="p-1 text-sm font-bold border border-slate-300 rounded font-mono outline-none w-44"
                  />
                  <button onClick={handleRenameCV} className="px-2.5 py-1 text-xs bg-slate-900 text-white rounded font-bold">Save</button>
                  <button onClick={() => { setIsEditingCvName(false); setEditedCvName(cvGroup.cv); }} className="px-2.5 py-1 text-xs bg-slate-200 text-slate-700 rounded font-bold">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-slate-900 tracking-tight font-mono">{cvGroup.cv}</span>
                  <button
                    onClick={() => setIsEditingCvName(true)}
                    className="px-2 py-0.5 text-[10px] font-bold border border-slate-300 text-slate-600 rounded-md hover:bg-slate-50 shadow-sm"
                  >
                    Edit CV Code
                  </button>
                </div>
              )}

              <span className="text-slate-400 text-sm">|</span>
              <span className="text-slate-500 font-semibold text-sm max-w-lg truncate" title={cvGroup.voucherNames}>{cvGroup.voucherNames}</span>
            </div>

            <div className="flex flex-wrap gap-2.5 mt-2.5 select-none">
              <span className="px-3 py-0.5 bg-slate-100 border border-slate-200/60 rounded-full text-[11px] font-bold text-slate-500">
                Date: <strong>{cvGroup.dateDisplay}</strong>
              </span>
              <span className="px-3 py-0.5 bg-slate-100 border border-slate-200/60 rounded-full text-[11px] font-bold text-slate-500">
                Lines count: <strong>{cvGroup.txns.length}</strong>
              </span>
              <span className="px-3 py-0.5 bg-slate-100 border border-slate-200/60 rounded-full text-[11px] font-bold text-slate-500">
                VAT: <strong>{pesoText(cvGroup.bookVat)}</strong>
              </span>
              <span className="px-3 py-0.5 bg-slate-100 border border-slate-200/60 rounded-full text-[11px] font-bold text-slate-500">
                EWT: <strong>{pesoText(cvGroup.bookEwt)}</strong>
              </span>
              <span className="px-3 py-0.5 bg-slate-100 border border-slate-200/60 rounded-full text-[11px] font-bold text-slate-500">
                Total: <strong>{pesoText(cvGroup.bookTotal)}</strong>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-500 flex items-center justify-center font-bold text-lg hover:bg-slate-50 cursor-pointer shadow-sm shrink-0"
          >
            ×
          </button>
        </div>

        {/* Modal Scrollable Workspace body */}
        <div className="flex-1 overflow-y-auto p-5 select-text">
          <div className="grid grid-cols-1 gap-4 pb-20">
            {cvGroup.txns.map((t: Transaction, idx: number) => {
              const matchedSup = findSupplierByTIN(t.tin);
              const isOverridden = t.supplierManualOverride;

              const isVatBalanced = isBalanced(cvGroup.vatDiff);
              const isEwtBalanced = isBalanced(cvGroup.ewtDiff);

              // Warnings trigger
              const hasLineSpecialAlert = [
                t.supplier, t.registeredName, t.lastName, t.firstName, t.middleName, t.address, t.city, t.zip
              ].some(val => supplierFieldHasSpecial(val));

              return (
                <div
                  key={t._id}
                  className={`bg-white border border-slate-200/90 rounded-2xl p-4 shadow-md border-l-[6px] transition-all relative ${
                    hasLineSpecialAlert ? 'border-l-amber-500 bg-amber-50/10' : 'border-l-blue-500'
                  }`}
                >
                  {/* Top description row */}
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 mb-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      {editingDescId === t._id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editedDescVal}
                            onChange={(e) => setEditedDescVal(e.target.value)}
                            className="p-1 border border-slate-300 rounded font-bold text-sm text-slate-800 w-full"
                          />
                          <button
                            onClick={() => { updateTransaction(t._id, { description: editedDescVal }); setEditingDescId(null); }}
                            className="px-2 py-1 text-xs bg-slate-900 text-white rounded font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingDescId(null)}
                            className="px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <p className="text-slate-900 font-bold text-[13.5px] leading-snug">
                            {t.description || '(No description provided)'}
                          </p>
                          <button
                            onClick={() => { setEditingDescId(t._id); setEditedDescVal(t.description); }}
                            className="px-2 py-0.5 text-[9px] font-bold border border-slate-300 text-slate-500 rounded hover:bg-slate-50 shrink-0"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                      
                      <div className="flex gap-4 text-[11px] text-slate-400 mt-1 flex-wrap">
                        <span>Accounting Title: <strong>{t.accountingTitle || '--'}</strong></span>
                        <span>Bank Account: <strong>{t.bankAccount || '--'}</strong></span>
                        {t.lastReviewed && <span className="italic">Last edited: {new Date(t.lastReviewed).toLocaleDateString()}</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => { if (confirm('Are you sure you want to remove this line?')) deleteTransaction(t._id); }}
                      className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-full font-bold select-none cursor-pointer"
                    >
                      Delete Line
                    </button>
                  </div>

                  {/* Form fields Grid: 4 wide columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs select-none">
                    
                    {/* Column 1: Supplier */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Supplier Details</span>
                      
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-400 text-[9px]">TIN</label>
                        <input
                          type="text"
                          value={t.tin}
                          onChange={(e) => handleLineTinChange(t._id, e.target.value)}
                          placeholder="Link Supplier TIN"
                          className="p-1.5 border border-slate-200 rounded bg-white font-mono"
                        />
                        <div className="text-[9.5px] font-bold">
                          {matchedSup ? (
                            <span className="text-emerald-600">✓ Linked Supplier Master</span>
                          ) : t.tin ? (
                            <span className="text-rose-500">❌ Not in Master Data</span>
                          ) : (
                            <span className="text-slate-400">Blank TIN</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-400 text-[9px]">Registered Supplier Name</label>
                        <input
                          type="text"
                          value={t.supplier}
                          onChange={(e) => handleSupplierManualEdit(t._id, 'supplier', e.target.value)}
                          placeholder="Auto-filled from TIN"
                          disabled={!isOverridden && !!matchedSup}
                          className={`p-1.5 border border-slate-200 rounded bg-white ${
                            !isOverridden && !!matchedSup ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>

                      {hasLineSpecialAlert && (
                        <div className="bg-amber-100/50 text-amber-800 border border-amber-200 rounded p-1.5 text-[10px] leading-normal font-medium">
                          ⚠️ Special characters present. Clean addresses before RELIEF exports.
                        </div>
                      )}

                      {/* Manual address toggle button */}
                      <button
                        onClick={() => updateTransaction(t._id, { supplierManualOverride: !isOverridden })}
                        className="text-left text-[9.5px] font-bold text-blue-600 hover:underline mt-1"
                      >
                        {isOverridden ? '✓ Disable manual address overrides' : '✏️ Override supplier address manually'}
                      </button>

                      {isOverridden && (
                        <div className="flex flex-col gap-2 border-t border-slate-200 pt-2 bg-slate-50 p-2 rounded">
                          <input
                            type="text"
                            placeholder="Manual Street"
                            value={t.address}
                            onChange={(e) => handleSupplierManualEdit(t._id, 'address', e.target.value)}
                            className="p-1 border border-slate-200 rounded font-medium text-[11px] bg-white"
                          />
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              type="text"
                              placeholder="City"
                              value={t.city}
                              onChange={(e) => handleSupplierManualEdit(t._id, 'city', e.target.value)}
                              className="p-1 border border-slate-200 rounded font-medium text-[11px] bg-white"
                            />
                            <input
                              type="text"
                              placeholder="ZIP"
                              value={t.zip}
                              onChange={(e) => handleSupplierManualEdit(t._id, 'zip', e.target.value)}
                              className="p-1 border border-slate-200 rounded font-medium text-[11px] bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Column 2: Invoice / Codes */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Invoices & Codes</span>
                      
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-400 text-[9px]">Invoice / OR Number</label>
                        <input
                          type="text"
                          value={t.inv}
                          onChange={(e) => updateTransaction(t._id, { inv: e.target.value })}
                          placeholder="SI-0000 or Cash receipt"
                          className="p-1.5 border border-slate-200 rounded bg-white font-mono"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-400 text-[9px]">VAT Category</label>
                        <select
                          value={t.vatCategory}
                          onChange={(e) => handleVatCatUpdate(t._id, e.target.value)}
                          className="p-1.5 border border-slate-200 rounded bg-white"
                        >
                          <option value="">Select Category</option>
                          {vatCategories.map(c => (
                            <option key={c.code} value={c.code}>{c.code} - {c.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-400 text-[9px]">ATC Code & Rate</label>
                        <select
                          value={t.atcCode}
                          onChange={(e) => handleAtcUpdate(t._id, e.target.value)}
                          className="p-1.5 border border-slate-200 rounded bg-white font-mono text-[11px]"
                        >
                          <option value="">Select ATC</option>
                          {atcMaster.map(a => (
                            <option key={a.atcCode} value={a.atcCode}>{a.atcCode} ({a.rate}%)</option>
                          ))}
                        </select>
                        <span className="text-[10px] font-mono text-slate-400 block mt-1 leading-normal">
                          Rate: {atcRateText(t.atcCode)}
                        </span>
                      </div>
                    </div>

                    {/* Column 3: Amounts (blue tinted for distinct weight) */}
                    <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-3 flex flex-col gap-2.5">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Computed Amounts</span>
                      
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-blue-500 text-[9px]">Base Disbursement Amount</label>
                        <input
                          type="text"
                          value={pesoText(t.amount)}
                          onChange={(e) => handleAmountUpdate(t._id, e.target.value)}
                          className="p-1.5 border border-blue-200 rounded bg-white font-mono text-right font-bold text-[12px]"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-blue-500 text-[9px]">Computed input VAT</label>
                        <input
                          type="text"
                          value={pesoText(t.vat)}
                          readOnly
                          className={`p-1.5 border rounded font-mono text-right text-slate-500 font-semibold bg-slate-100/80 cursor-default ${
                            !isVatBalanced ? 'border-rose-200 text-rose-700 bg-rose-50/20' : 'border-slate-200'
                          }`}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-blue-500 text-[9px]">Total Amount</label>
                        <input
                          type="text"
                          value={pesoText(t.total)}
                          onChange={(e) => handleTotalUpdate(t._id, e.target.value)}
                          className="p-1.5 border border-blue-200 rounded bg-white font-mono text-right font-bold text-[12px]"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-blue-500 text-[9px]">Computed EWT</label>
                        <input
                          type="text"
                          value={pesoText(t.ewtAmount)}
                          readOnly
                          className={`p-1.5 border rounded font-mono text-right text-slate-500 font-semibold bg-slate-100/80 cursor-default ${
                            !isEwtBalanced ? 'border-rose-200 text-rose-700 bg-rose-50/20' : 'border-slate-200'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Column 4: Verification status (colored based on status) */}
                    <div className={`border rounded-xl p-3 flex flex-col gap-2.5 ${
                      t.manualStatus === 'ok' ? 'bg-emerald-50/30 border-emerald-200' :
                      t.manualStatus === 'warn' ? 'bg-amber-50/30 border-amber-200' :
                      t.manualStatus === 'err' ? 'bg-rose-50/30 border-rose-200' :
                      t.manualStatus === 'journal' ? 'bg-blue-50/30 border-blue-200' :
                      t.manualStatus === 'adjusting' ? 'bg-pink-50/30 border-pink-200' :
                      'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Manual Verification Review</span>
                      
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-400 text-[9px]">Status Tag</label>
                        <select
                          value={t.manualStatus}
                          onChange={(e) => updateTransaction(t._id, { manualStatus: e.target.value as any })}
                          className={`p-1.5 border rounded-full font-bold text-center ${
                            t.manualStatus === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                            t.manualStatus === 'warn' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                            t.manualStatus === 'err' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                            t.manualStatus === 'journal' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                            t.manualStatus === 'adjusting' ? 'bg-pink-50 text-pink-700 border-pink-300' :
                            'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="unreviewed">Unreviewed</option>
                          <option value="ok">Compliant</option>
                          <option value="warn">Without Invoice</option>
                          <option value="err">Non-Compliant</option>
                          <option value="journal">Journal Entry</option>
                          <option value="adjusting">Adjusting Entry</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-400 text-[9px]">Reviewer Notes / Action logs</label>
                        <textarea
                          placeholder="Add details, auditor queries, or justification notes..."
                          value={t.reviewNote}
                          onChange={(e) => updateTransaction(t._id, { reviewNote: e.target.value, lastReviewed: new Date().toISOString() })}
                          className="w-full p-1.5 border border-slate-200 bg-white rounded-lg outline-none resize-none text-[11px] h-20"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-white border-t border-slate-200/80 px-6 py-3 flex items-center justify-between shrink-0 select-none">
          <button
            onClick={() => {
              const prevCv = cvGroup.cv;
              const voucherName = cvGroup.voucherNames;
              const dateVal = cvGroup.dateDisplay !== '--' ? cvGroup.dateDisplay : '';
              
              // Create a fully-formed new Transaction object
              const dupe: Transaction = {
                _id: 'tx_' + Date.now().toString(36),
                voucherName,
                supplier: '',
                tin: '',
                cv: prevCv,
                inv: '',
                date: dateVal,
                description: `Additional transaction line for ${voucherName}`,
                amount: 0,
                vatable: 0,
                nonVatable: 0,
                vat: 0,
                total: 0,
                vatReg: 'Non-VAT',
                vatCategory: '',
                ewtAmount: 0,
                atcCode: '',
                manualStatus: 'unreviewed',
                reviewNote: '',
                lastReviewed: new Date().toISOString(),
                accountingTitle: '',
                bankAccount: '',
                registeredName: '',
                lastName: '',
                firstName: '',
                middleName: '',
                address: '',
                city: '',
                zip: '',
                supplierManualOverride: false
              };

              setTransactions(prev => [...prev, dupe]);
              alert('Additional transaction line attached to this Check Voucher.');
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-full text-xs shadow"
          >
            ➕ Attach Additional Line to CV
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-full text-xs"
          >
            Close Workspace
          </button>
        </div>

      </div>
    </div>
  );
}
