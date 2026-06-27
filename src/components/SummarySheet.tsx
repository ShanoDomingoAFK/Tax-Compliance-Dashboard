import React, { useMemo } from 'react';
import Peso from './Peso';
import { Transaction } from '../types';
import {
  pesoText,
  verificationText,
  isBalanced
} from '../utils/helpers';

interface SummarySheetProps {
  visibleTransactions: Transaction[];
  consolidatedSummaryGroups: any[];
  summarySearch: string;
  setSummarySearch: (val: string) => void;
  summaryViewMode: 'count' | 'amount';
  setSummaryViewMode: (mode: 'count' | 'amount') => void;
  activeSummaryStatus: string;
  setActiveSummaryStatus: (status: string) => void;
  summaryVatTypeFilter: string;
  setSummaryVatTypeFilter: (val: string) => void;
  summaryGroupMode: 'supplier' | 'cv';
  setSummaryGroupMode: (val: 'supplier' | 'cv') => void;
  summarySort: { key: string; dir: 'asc' | 'desc' };
  setSummarySort: (sort: { key: string; dir: 'asc' | 'desc' }) => void;
  setActiveSummaryReview: (review: { mode: 'supplier' | 'cv'; key: string } | null) => void;
}

export default function SummarySheet({
  visibleTransactions,
  consolidatedSummaryGroups,
  summarySearch,
  setSummarySearch,
  summaryViewMode,
  setSummaryViewMode,
  activeSummaryStatus,
  setActiveSummaryStatus,
  summaryVatTypeFilter,
  setSummaryVatTypeFilter,
  summaryGroupMode,
  setSummaryGroupMode,
  summarySort,
  setSummarySort,
  setActiveSummaryReview
}: SummarySheetProps) {

  // Sum helpers
  const totalAmount = useMemo(() => visibleTransactions.reduce((sum, t) => sum + t.total, 0), [visibleTransactions]);
  const vatAmount = useMemo(() => visibleTransactions.reduce((sum, t) => sum + t.vat, 0), [visibleTransactions]);

  // Count/Amount metrics stats
  const stats = useMemo(() => {
    const total = visibleTransactions.length || 1;
    const groups: Record<string, { count: number; vatable: number; vat: number; total: number }> = {
      ok: { count: 0, vatable: 0, vat: 0, total: 0 },
      warn: { count: 0, vatable: 0, vat: 0, total: 0 },
      err: { count: 0, vatable: 0, vat: 0, total: 0 },
      unreviewed: { count: 0, vatable: 0, vat: 0, total: 0 },
      journal: { count: 0, vatable: 0, vat: 0, total: 0 },
      adjusting: { count: 0, vatable: 0, vat: 0, total: 0 }
    };

    visibleTransactions.forEach(t => {
      const s = t.manualStatus || 'unreviewed';
      if (groups[s]) {
        groups[s].count++;
        groups[s].vatable += t.vatable;
        groups[s].vat += t.vat;
        groups[s].total += t.total;
      }
    });

    return groups;
  }, [visibleTransactions]);

  const totalCount = visibleTransactions.length;

  function pctText(part: number, total: number): string {
    return total ? ((part / total) * 100).toFixed(1).replace(/\.0$/, '') + '%' : '0%';
  }

  function handleSort(key: string) {
    if (summarySort.key === key) {
      setSummarySort({ key, dir: summarySort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      setSummarySort({ key, dir: 'asc' });
    }
  }

  function renderSortArrow(key: string) {
    if (summarySort.key !== key) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-blue-600 ml-1">{summarySort.dir === 'asc' ? '▲' : '▼'}</span>;
  }

  // Group status helper
  function getGroupStatusDetails(txns: Transaction[]) {
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

  // Summary Card renderer
  const renderMetricCard = (statusKey: string, label: string, colorClass: string, dotColor: string) => {
    const cardData = stats[statusKey] || { count: 0, total: 0, vat: 0 };
    const isActive = activeSummaryStatus === statusKey;
    const countPct = pctText(cardData.count, totalCount);
    const amountPct = pctText(cardData.vat, vatAmount);

    const displayValue = summaryViewMode === 'amount' ? amountPct : `${cardData.count} / ${totalCount}`;
    const subText = summaryViewMode === 'amount' ? (
      <span className="text-xs text-slate-500">
        <strong className={`${colorClass}`}>{pesoText(cardData.vat)}</strong> input VAT
      </span>
    ) : (
      <span className="text-xs text-slate-500">
        <strong>{countPct}</strong> of total transactions
      </span>
    );

    return (
      <div
        onClick={() => setActiveSummaryStatus(activeSummaryStatus === statusKey ? '' : statusKey)}
        className={`bg-white border rounded-xl p-4 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:border-slate-300 relative flex flex-col justify-between ${
          isActive ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20' : 'border-slate-200'
        }`}
      >
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
          </div>
          <div className={`text-xl font-bold font-mono tracking-tight ${colorClass} mb-1`}>
            {displayValue}
          </div>
        </div>
        <div>
          {subText}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* View bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white/60 border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="text-sm font-bold text-slate-700">Compliance Summary Metrics</div>
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-full border border-slate-200 shadow-inner">
          <button
            onClick={() => setSummaryViewMode('count')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              summaryViewMode === 'count' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Count View
          </button>
          <button
            onClick={() => setSummaryViewMode('amount')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              summaryViewMode === 'amount' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Amount View
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-8 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Groups</span>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {consolidatedSummaryGroups.length}
            </div>
          </div>
          <span className="text-xs text-slate-500">
            Across <strong>{totalCount}</strong> transactions
          </span>
        </div>

        {renderMetricCard('ok', 'Compliant', 'text-emerald-700', 'bg-emerald-500')}
        {renderMetricCard('warn', 'Without Invoice', 'text-amber-600', 'bg-amber-400')}
        {renderMetricCard('err', 'Non-Compliant', 'text-rose-700', 'bg-rose-500')}
        {renderMetricCard('unreviewed', 'Unreviewed', 'text-slate-600', 'bg-slate-400')}
        {renderMetricCard('journal', 'Journal Entry', 'text-blue-700', 'bg-blue-600')}
        {renderMetricCard('adjusting', 'Adjusting Entry', 'text-pink-700', 'bg-pink-600')}

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Gross / VAT</span>
            <div className="text-base font-bold text-slate-900 truncate">
              {pesoText(totalAmount)}
            </div>
          </div>
          <div className="text-xs text-slate-500 truncate">
            VAT: <strong className="text-blue-600 font-mono">{pesoText(vatAmount)}</strong>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-inner">
        This compliance view is aggregated from active Purchase Transactions filtered by month and year. Adjusting entries and journal postings are reflected with custom exemptions. Click on individual rows below to open the complete details list.
      </div>

      {/* Filtering Controls */}
      <div className="flex flex-wrap gap-3 items-center bg-white/70 border border-slate-200/80 rounded-xl p-3 shadow-sm">
        <div className="relative flex-1 min-width-[280px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Search supplier, TIN, CV, invoice, or description..."
            value={summarySearch}
            onChange={(e) => setSummarySearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
          />
        </div>
        <select
          value={summaryGroupMode}
          onChange={(e) => setSummaryGroupMode(e.target.value as 'supplier' | 'cv')}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
        >
          <option value="supplier">Consolidate by Registered Supplier</option>
          <option value="cv">Consolidate by CV Number</option>
        </select>
        <select
          value={summaryVatTypeFilter}
          onChange={(e) => setSummaryVatTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500"
        >
          <option value="">All VAT Types</option>
          <option value="VAT-reg">VAT Registered</option>
          <option value="Non-VAT">Not VAT Registered</option>
        </select>
      </div>

      {/* Main Consolidated Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider select-none">
                <th className="py-3.5 px-4 text-left font-semibold">
                  <button onClick={() => handleSort('first')} className="flex items-center text-slate-700 hover:text-blue-600">
                    {summaryGroupModeLabel(summaryGroupMode)} {summarySort.key === 'first' && (summarySort.dir === 'asc' ? '▲' : '▼')}
                  </button>
                </th>
                <th className="py-3 px-4 text-left font-semibold">
                  <button onClick={() => setSummarySort({ key: 'vattype', dir: summarySort.dir === 'asc' ? 'desc' : 'asc' })} className="flex items-center text-slate-700">
                    VAT Type {renderSortArrow('vattype')}
                  </button>
                </th>
                <th className="py-3 px-4 text-left font-semibold">
                  <button onClick={() => handleSort('second')} className="flex items-center text-slate-700 hover:text-blue-600">
                    {summaryGroupMode === 'supplier' ? 'TIN & CVs' : 'Registered Supplier'} {summarySort.key === 'second' && (summarySort.dir === 'asc' ? '▲' : '▼')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-semibold">
                  <button onClick={() => handleSort('txn')} className="flex items-center justify-end text-slate-700 hover:text-blue-600 w-full">
                    Txn {summarySort.key === 'txn' && (summarySort.dir === 'asc' ? '▲' : '▼')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-semibold">
                  <button onClick={() => handleSort('amount')} className="flex items-center justify-end text-slate-700 hover:text-blue-600 w-full">
                    Base Amount {summarySort.key === 'amount' && (summarySort.dir === 'asc' ? '▲' : '▼')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-semibold">
                  <button onClick={() => handleSort('vat')} className="flex items-center justify-end text-slate-700 hover:text-blue-600 w-full">
                    VAT Amount {summarySort.key === 'vat' && (summarySort.dir === 'asc' ? '▲' : '▼')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-semibold">
                  <button onClick={() => handleSort('total')} className="flex items-center justify-end text-slate-700 hover:text-blue-600 w-full">
                    Total Amount {summarySort.key === 'total' && (summarySort.dir === 'asc' ? '▲' : '▼')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-semibold">
                  <button onClick={() => handleSort('ewt')} className="flex items-center justify-end text-slate-700 hover:text-blue-600 w-full">
                    EWT Amount {summarySort.key === 'ewt' && (summarySort.dir === 'asc' ? '▲' : '▼')}
                  </button>
                </th>
                <th className="py-3 px-4 text-center font-semibold" style={{ width: '130px' }}>
                  <button onClick={() => handleSort('score')} className="flex items-center justify-center text-slate-700 hover:text-blue-600 w-full">
                    Score {summarySort.key === 'score' && (summarySort.dir === 'asc' ? '▲' : '▼')}
                  </button>
                </th>
                <th className="py-3 px-4 text-center font-semibold" style={{ width: '130px' }}>
                  <button onClick={() => handleSort('status')} className="flex items-center justify-center text-slate-700 hover:text-blue-600 w-full">
                    Status {summarySort.key === 'status' && (summarySort.dir === 'asc' ? '▲' : '▼')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {consolidatedSummaryGroups.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No transactions match your compliance filters.
                  </td>
                </tr>
              ) : (
                consolidatedSummaryGroups.map((g, idx) => {
                  const st = getGroupStatusDetails(g.txns);
                  const sums = g.txns.reduce(
                    (acc: any, t: Transaction) => {
                      acc.amount += t.amount;
                      acc.vat += t.vat;
                      acc.total += t.total;
                      acc.ewt += t.ewtAmount;
                      return acc;
                    },
                    { amount: 0, vat: 0, total: 0, ewt: 0 }
                  );

                  let firstLabel = g.key;
                  let secondLabelComponent;

                  if (summaryGroupMode === 'supplier') {
                    firstLabel = g.supplierDisplay;
                    secondLabelComponent = (
                      <div>
                        <div className="text-slate-500 font-mono text-xs">{g.tinDisplay}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">CV: {g.cvDisplay}</div>
                      </div>
                    );
                  } else {
                    secondLabelComponent = (
                      <div>
                        <div className="font-semibold text-slate-700 text-xs">{g.supplierDisplay}</div>
                        <div className="text-[10px] text-slate-400 font-mono">TIN: {g.tinDisplay}</div>
                      </div>
                    );
                  }

                  return (
                    <tr
                      key={idx}
                      onClick={() => setActiveSummaryReview({ mode: summaryGroupMode, key: g.key })}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                          <span className="truncate max-w-[250px]">{firstLabel}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          g.vatRegDisplay === 'VAT-reg'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {g.vatRegDisplay === 'VAT-reg' ? 'VAT Reg' : 'Non-VAT'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {secondLabelComponent}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-600 font-mono">
                        {g.txns.length}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Peso value={sums.amount} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Peso value={sums.vat} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Peso value={sums.total} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Peso value={sums.ewt} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <div className="bg-emerald-500" style={{ width: `${st.okPct}%` }}></div>
                            <div className="bg-amber-400" style={{ width: `${st.warnPct}%` }}></div>
                            <div className="bg-rose-500" style={{ width: `${st.errPct}%` }}></div>
                            <div className="bg-blue-600" style={{ width: `${st.journalPct}%` }}></div>
                            <div className="bg-pink-600" style={{ width: `${st.adjustingPct}%` }}></div>
                            <div className="bg-slate-400" style={{ width: `${st.reviewPct}%` }}></div>
                          </div>
                          <div className="flex gap-1.5 text-[10px] font-mono mt-1 text-slate-400">
                            <span className="text-emerald-600 font-bold">{st.ok}</span>
                            <span className="text-amber-500 font-bold">{st.warn}</span>
                            <span className="text-rose-500 font-bold">{st.err}</span>
                            <span className="text-blue-500 font-bold">{st.journal}</span>
                            <span className="text-pink-500 font-bold">{st.adjusting}</span>
                            <span className="text-slate-500 font-bold">{st.unreviewed}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                          st.status === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          st.status === 'warn' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          st.status === 'err' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          st.status === 'journal' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          st.status === 'adjusting' ? 'bg-pink-50 text-pink-700 border border-pink-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {verificationText(st.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {consolidatedSummaryGroups.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr className="font-bold text-slate-800 text-right">
                  <td colSpan={3} className="py-3 px-4 text-left text-slate-700 font-bold">Total Summary</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{visibleTransactions.length}</td>
                  <td className="py-3 px-4"><Peso value={visibleTransactions.reduce((a, t) => a + t.amount, 0)} /></td>
                  <td className="py-3 px-4"><Peso value={vatAmount} /></td>
                  <td className="py-3 px-4"><Peso value={totalAmount} /></td>
                  <td className="py-3 px-4"><Peso value={visibleTransactions.reduce((a, t) => a + t.ewtAmount, 0)} /></td>
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

function summaryGroupModeLabel(mode: 'supplier' | 'cv'): string {
  return mode === 'supplier' ? 'Registered Supplier' : 'CV Number';
}
