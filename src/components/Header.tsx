import React from 'react';
import { COMPANY_PROFILE } from '../data/demo';
import { MonthInfo, YearInfo } from '../types';
import { Calendar, Building, Database, Activity } from 'lucide-react';

interface HeaderProps {
  activeMonthLabel: string;
  activeYear: string;
  setActiveYear: (val: string) => void;
  activeMonth: string;
  setActiveMonth: (val: string) => void;
  monthBuckets: MonthInfo[];
  yearBuckets: YearInfo[];
  transactionsCount: number;
  unreviewedCount: number;
}

export default function Header({
  activeMonthLabel,
  activeYear,
  setActiveYear,
  activeMonth,
  setActiveMonth,
  monthBuckets,
  yearBuckets,
  transactionsCount,
  unreviewedCount
}: HeaderProps) {

  // Dynamic Month Filtering for the Month Dropdown Select
  const filteredMonths = React.useMemo(() => {
    return monthBuckets.filter(m => {
      if (activeYear === 'all') return true;
      const yr = m.key.split('-')[0];
      return yr === activeYear || m.key === 'undated';
    });
  }, [monthBuckets, activeYear]);

  return (
    <div className="bg-white border-b border-slate-200/50 h-[72px] px-8 flex items-center justify-between shrink-0 select-none font-sans antialiased">
      
      {/* Consolidated Reporting Period Selector */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block leading-none mb-1">
              Reporting Period
            </span>
            
            <div className="flex items-center gap-2">
              {/* Year Select Selector */}
              <select
                value={activeYear}
                onChange={(e) => {
                  setActiveYear(e.target.value);
                  setActiveMonth('all'); // reset month when changing year
                }}
                className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg py-1 px-2.5 text-xs font-bold text-slate-700 outline-none cursor-pointer transition-colors duration-150 shadow-xs focus:border-blue-500"
              >
                <option value="all">All Years Combined</option>
                {yearBuckets.map(y => (
                  <option key={y.year} value={y.year}>
                    {y.year === 'undated' ? 'Undated Backlogs' : `${y.year} FY`}
                  </option>
                ))}
              </select>

              {/* Month Select Selector */}
              <select
                value={activeMonth}
                onChange={(e) => setActiveMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg py-1 px-2.5 text-xs font-bold text-slate-700 outline-none cursor-pointer transition-colors duration-150 shadow-xs focus:border-blue-500"
              >
                <option value="all">🌐 Combined Months View</option>
                {filteredMonths.map(m => (
                  <option key={m.key} value={m.key}>
                    {m.key === 'undated' ? '📝 JE / Adjusting Entries' : m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Counter Badges */}
        {transactionsCount > 0 && (
          <div className="hidden md:flex gap-2 items-center ml-2 pl-4 border-l border-slate-100">
            <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 text-slate-600 rounded-full text-[10px] font-bold tracking-wide">
              {transactionsCount} records
            </span>
            {unreviewedCount > 0 && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/30 rounded-full text-[10px] font-bold tracking-wide animate-pulse flex items-center gap-1">
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
        <div className="flex items-center gap-2 border border-slate-150 rounded-full px-3 py-1 bg-slate-50/80 shadow-sm shrink-0">
          <Database className="w-3.5 h-3.5 text-emerald-500" />
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] font-bold tracking-wider text-slate-600 uppercase font-mono">
            Local Cache
          </span>
        </div>
      </div>

    </div>
  );
}
