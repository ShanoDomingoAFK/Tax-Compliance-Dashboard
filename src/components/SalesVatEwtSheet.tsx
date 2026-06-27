import React, { useMemo } from 'react';
import Peso from './Peso';
import { LedgerRow, Transaction } from '../types';
import {
  pesoText,
  isBalanced,
  recordMonthKey
} from '../utils/helpers';

interface SalesVatEwtSheetProps {
  type: 'vat' | 'ewt';
  visibleSalesTransactions: Transaction[];
  visibleLedgerRows: LedgerRow[];
  ledgerReconciliation: any[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  balanceFilter: string;
  setBalanceFilter: (val: string) => void;
  onClearMonthLedger: () => void;
  activeMonthLabel: string;
}

export default function SalesVatEwtSheet({
  type,
  visibleSalesTransactions,
  visibleLedgerRows,
  ledgerReconciliation,
  searchQuery,
  setSearchQuery,
  balanceFilter,
  setBalanceFilter,
  onClearMonthLedger,
  activeMonthLabel
}: SalesVatEwtSheetProps) {

  const title = type === 'vat' ? 'Output VAT' : 'CWT';
  const label = type === 'vat' ? 'Output VAT Balances' : 'CWT Balances';

  // Summaries
  const salesSum = useMemo(() => {
    return visibleSalesTransactions.reduce((sum, t) => sum + (type === 'vat' ? t.vat : t.ewtAmount), 0);
  }, [visibleSalesTransactions, type]);

  const ledgerSum = useMemo(() => {
    return visibleLedgerRows.reduce((sum, r) => sum + r.amount, 0);
  }, [visibleLedgerRows]);

  const totalDiff = salesSum - ledgerSum;
  const isTotalBalanced = isBalanced(totalDiff);

  const unbalancedCount = useMemo(() => {
    return ledgerReconciliation.filter(item => !isBalanced(item.diff)).length;
  }, [ledgerReconciliation]);

  const balancedCount = useMemo(() => {
    return ledgerReconciliation.filter(item => isBalanced(item.diff)).length;
  }, [ledgerReconciliation]);

  return (
    <div className="flex flex-col gap-4 font-sans">
      {/* Reconciliation metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Invoice / OR Groups</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {ledgerReconciliation.length}
          </div>
          <span className="text-xs text-slate-500">
            {visibleLedgerRows.length} uploaded balance lines
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Sales Book {title}</span>
          <div className="text-base font-bold font-mono tracking-tight text-slate-900 truncate">
            {pesoText(salesSum)}
          </div>
          <span className="text-xs text-slate-500">
            From verified sales
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">{label} Balance</span>
          <div className="text-base font-bold font-mono tracking-tight text-slate-900 truncate">
            {pesoText(ledgerSum)}
          </div>
          <span className="text-xs text-slate-500">
            From uploaded G/L statement
          </span>
        </div>

        <div className={`border rounded-2xl p-4 shadow-sm flex flex-col justify-between ${
          isTotalBalanced ? 'bg-emerald-50/20 border-emerald-200' : 'bg-rose-50/20 border-rose-200'
        }`}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Difference</span>
          <div className={`text-base font-bold font-mono tracking-tight truncate ${
            isTotalBalanced ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            {pesoText(totalDiff)}
          </div>
          <span className="text-xs text-slate-500">
            Tolerance threshold ₱0.51
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Balanced Groups</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600">
            {balancedCount}
          </div>
          <span className="text-xs text-slate-500">
            Voucher groups reconciled
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Unbalanced Groups</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-rose-600">
            {unbalancedCount}
          </div>
          <span className="text-xs text-slate-500">
            Requires journal review
          </span>
        </div>
      </div>

      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-inner">
        <strong>{label} Reconciliation</strong> compares Sales Invoices / Official Receipts against general ledger statements. Clear discrepancies using adjustments or verifying missing invoice attachments.
      </div>

      {/* Control filters bar */}
      <div className="flex flex-wrap gap-3 items-center bg-white/70 border border-slate-200/80 rounded-xl p-3 shadow-sm">
        <div className="relative flex-1 min-width-[280px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Search Invoice/OR, customer, account or reference code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
          />
        </div>
        <select
          value={balanceFilter}
          onChange={(e) => setBalanceFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
        >
          <option value="">All {title} Vouchers</option>
          <option value="balanced">Balanced</option>
          <option value="unbalanced">Not balanced</option>
        </select>
        <button
          onClick={onClearMonthLedger}
          className="bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-600 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer transition-colors"
        >
          Clear Uploaded Ledgers for {activeMonthLabel}
        </button>
      </div>

      {/* Main ledger list table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider select-none">
                <th className="py-3 px-4 text-left font-semibold" style={{ width: '15%' }}>Invoice / OR Number</th>
                <th className="py-3 px-4 text-left font-semibold" style={{ width: '22%' }}>Customer Name</th>
                <th className="py-3 px-4 text-right font-semibold" style={{ width: '15%' }}>Sales Book Amount</th>
                <th className="py-3 px-4 text-right font-semibold" style={{ width: '15%' }}>Uploaded Balance</th>
                <th className="py-3 px-4 text-right font-semibold" style={{ width: '15%' }}>Difference</th>
                <th className="py-3 px-4 text-center font-semibold" style={{ width: '12%' }}>Recon Status</th>
                <th className="py-3 px-4 text-left font-semibold" style={{ width: '18%' }}>References / GL code</th>
              </tr>
            </thead>
            <tbody>
              {ledgerReconciliation.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No balance rows match your filter. Upload matching ledgers in QuickBooks / Excel template formats.
                  </td>
                </tr>
              ) : (
                ledgerReconciliation.map((item, idx) => {
                  const isBal = isBalanced(item.diff);
                  const refs = item.rows.map((r: LedgerRow) => r.ref).filter(Boolean);
                  const displayRefs = refs.length ? refs.join(', ') : '--';

                  return (
                    <React.Fragment key={idx}>
                      {/* CV Group Summary row */}
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <td className="py-2.5 px-4 font-bold text-slate-900 font-mono">
                          {item.cv}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 font-semibold truncate max-w-xs" title={item.suppliers}>
                          {item.suppliers}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Peso value={item.purchaseAmount} />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Peso value={item.ledgerAmount} />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Peso value={item.diff} className={isBal ? 'text-emerald-600 font-medium' : 'text-rose-600 font-bold'} />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            isBal
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {isBal ? 'Balanced' : 'Not balanced'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-400 truncate max-w-xs" title={displayRefs}>
                          {displayRefs}
                        </td>
                      </tr>

                      {/* Constituent Uploaded lines */}
                      {item.rows.map((r: LedgerRow, rIdx: number) => (
                        <tr key={`${idx}-${rIdx}`} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                          <td className="py-2 px-8 font-mono text-xs text-slate-400">
                            └─ line {rIdx + 1}
                          </td>
                          <td className="py-2 px-4 text-slate-500 font-medium text-xs">
                            {r.supplier || '--'}
                          </td>
                          <td className="py-2 px-4 text-right text-slate-300 font-mono text-xs">
                            --
                          </td>
                          <td className="py-2 px-4 text-right">
                            <Peso value={r.amount} className="text-slate-500 font-medium text-xs" />
                          </td>
                          <td className="py-2 px-4 text-right text-slate-300 font-mono text-xs">
                            --
                          </td>
                          <td className="py-2 px-4 text-center text-xs text-slate-400 font-semibold font-mono">
                            {r.account || '--'}
                          </td>
                          <td className="py-2 px-4 font-mono text-xs text-slate-500">
                            Ref: {r.ref || '--'}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            {ledgerReconciliation.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr className="font-bold text-slate-800 text-right">
                  <td colSpan={2} className="py-3 px-4 text-left text-slate-700 font-bold">Grand Total Summary</td>
                  <td className="py-3 px-4">
                    <Peso value={salesSum} />
                  </td>
                  <td className="py-3 px-4">
                    <Peso value={ledgerSum} />
                  </td>
                  <td className="py-3 px-4">
                    <Peso value={totalDiff} className={isTotalBalanced ? 'text-emerald-600' : 'text-rose-600'} />
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
