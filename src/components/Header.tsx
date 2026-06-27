import React from 'react';
import { COMPANY_PROFILE } from '../data/demo';
import { Calendar, Building, Database, Activity } from 'lucide-react';

interface HeaderProps {
  activeMonthLabel: string;
  activeYear: string;
  activeMonth: string;
  transactionsCount: number;
  unreviewedCount: number;
}

export default function Header({
  activeMonthLabel,
  activeYear,
  activeMonth,
  transactionsCount,
  unreviewedCount
}: HeaderProps) {

  const periodText = activeMonth === 'all'
    ? (activeYear === 'all' ? 'All Fiscal Periods Combined' : `Fiscal Year ${activeYear}`)
    : activeMonthLabel;

  return (
    <div className="bg-white/90 backdrop-blur-md border-b border-slate-100 h-[72px] px-8 flex items-center justify-between shrink-0 select-none font-sans">
      
      {/* Current Selection / Status Summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-sm">
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Selected Period</span>
            <h1 className="text-sm font-extrabold text-slate-800 tracking-tight font-sans mt-1">
              {periodText}
            </h1>
          </div>
        </div>

        {transactionsCount > 0 && (
          <div className="flex gap-2 items-center ml-4 pl-4 border-l border-slate-100">
            <span className="px-2.5 py-1 bg-slate-50 border border-slate-100/80 text-slate-600 rounded-full text-[10px] font-bold tracking-wide">
              {transactionsCount} records
            </span>
            {unreviewedCount > 0 && (
              <span className="px-2.5 py-1 bg-amber-50/50 text-amber-700 border border-amber-200/40 rounded-full text-[10px] font-bold tracking-wide animate-pulse flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-500 shrink-0" />
                {unreviewedCount} unreviewed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Taxpayer Entity profile metadata info */}
      <div className="flex items-center gap-6">
        <div className="text-right hidden sm:flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Taxpayer Entity</span>
            <span className="text-xs font-bold text-slate-800 block mt-1">
              {COMPANY_PROFILE.registeredName}
            </span>
            <span className="text-[10px] text-slate-400 font-bold block font-mono mt-0.5">
              TIN: {COMPANY_PROFILE.tin} • Branch: {COMPANY_PROFILE.branchCode}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
            <Building className="w-4 h-4 text-indigo-500" />
          </div>
        </div>

        {/* Database Mode status badge */}
        <div className="flex items-center gap-2 border border-slate-100 rounded-full px-3 py-1.5 bg-slate-50/80 shadow-sm">
          <Database className="w-3.5 h-3.5 text-emerald-500" />
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] font-bold tracking-wider text-slate-600 uppercase font-mono">
            Local Browser Cache
          </span>
        </div>
      </div>

    </div>
  );
}
