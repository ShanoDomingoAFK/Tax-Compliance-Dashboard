import React from 'react';
import Peso from './Peso';
import { Transaction } from '../types';
import {
  pesoText,
  verificationText
} from '../utils/helpers';

interface SummaryReviewModalProps {
  reviewGroup: { mode: 'supplier' | 'cv'; key: string } | null;
  visibleTransactions: Transaction[];
  onClose: () => void;
}

export default function SummaryReviewModal({
  reviewGroup,
  visibleTransactions,
  onClose
}: SummaryReviewModalProps) {

  if (!reviewGroup) return null;

  const { mode, key } = reviewGroup;
  
  // Filter transactions belonging to this group
  const groupedTxns = visibleTransactions.filter(t => {
    const s = t.supplier || '(For verification)';
    if (mode === 'cv') return (t.cv || '(No CV Number)') === key;
    return s === key;
  });

  const totals = groupedTxns.reduce((a, t) => {
    a.amount += t.amount;
    a.vat += t.vat;
    a.ewt += t.ewtAmount;
    a.total += t.total;
    return a;
  }, { amount: 0, vat: 0, ewt: 0, total: 0 });

  const okCount = groupedTxns.filter(t => t.manualStatus === 'ok').length;
  const totalCount = groupedTxns.length;
  const compliantPct = Math.round((okCount / (totalCount || 1)) * 100);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-md z-[1600] p-4 select-none">
      <div className="w-full max-w-[1200px] max-h-[85vh] bg-slate-50 border border-slate-200/50 rounded-3xl shadow-[0_24px_60px_rgba(15,23,42,0.22)] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Consolidated Group Review</span>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="text-slate-500 font-bold">{mode === 'cv' ? 'Voucher:' : 'Supplier:'}</span>
              <span className="font-mono">{key}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-500 flex items-center justify-center font-bold text-lg hover:bg-slate-50 cursor-pointer shadow-sm shrink-0"
          >
            ×
          </button>
        </div>

        {/* Info panel */}
        <div className="grid grid-cols-2 lg:grid-cols-5 border-b border-slate-200 bg-slate-100/50 p-5 gap-4 shrink-0">
          <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Gross</span>
            <span className="text-sm font-extrabold text-slate-900 font-mono"><Peso value={totals.total} /></span>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tax Base</span>
            <span className="text-sm font-extrabold text-slate-900 font-mono"><Peso value={totals.amount} /></span>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Input VAT</span>
            <span className="text-sm font-extrabold text-slate-900 font-mono"><Peso value={totals.vat} /></span>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Computed EWT</span>
            <span className="text-sm font-extrabold text-slate-900 font-mono"><Peso value={totals.ewt} /></span>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm col-span-2 lg:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Compliance Score</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm font-black font-mono ${
                compliantPct >= 100 ? 'text-emerald-600' : compliantPct >= 50 ? 'text-amber-600' : 'text-rose-600'
              }`}>{compliantPct}%</span>
              <span className="text-[10px] text-slate-500">({okCount}/{totalCount} ok)</span>
            </div>
          </div>
        </div>

        {/* Table list */}
        <div className="flex-1 overflow-y-auto p-5 select-text">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-left">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">CV Number</th>
                    <th className="py-2.5 px-3">Invoice No.</th>
                    <th className="py-2.5 px-3">Supplier Name / TIN</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Base Amount</th>
                    <th className="py-2.5 px-3 text-right">Input VAT</th>
                    <th className="py-2.5 px-3 text-right">EWT Amount</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedTxns.map((t, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/40 font-mono text-slate-700 text-[11px]">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-500">{t.date}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{t.cv || '--'}</td>
                      <td className="py-2.5 px-3">{t.inv || '--'}</td>
                      <td className="py-2.5 px-3 font-sans font-medium">
                        <span className="block text-slate-800">{t.supplier || '(Blank supplier)'}</span>
                        <span className="block text-[10px] text-slate-400">{t.tin || 'No TIN'}</span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-500 max-w-xs truncate" title={t.description}>
                        {t.description || '--'}
                      </td>
                      <td className="py-2.5 px-3 text-right"><Peso value={t.amount} /></td>
                      <td className="py-2.5 px-3 text-right"><Peso value={t.vat} /></td>
                      <td className="py-2.5 px-3 text-right"><Peso value={t.ewtAmount} /></td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900"><Peso value={t.total} /></td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase ${
                          t.manualStatus === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          t.manualStatus === 'warn' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          t.manualStatus === 'err' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          t.manualStatus === 'journal' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          t.manualStatus === 'adjusting' ? 'bg-pink-50 text-pink-700 border-pink-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {verificationText(t.manualStatus)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200/80 px-6 py-3 flex justify-end shrink-0 select-none">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-full text-xs cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}
