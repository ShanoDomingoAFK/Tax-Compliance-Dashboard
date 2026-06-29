import React, { useState } from 'react';
import { COMPANY_PROFILE } from '../data/demo';
import { MonthInfo, YearInfo } from '../types';
import { Calendar, Building, Database, Activity, ChevronDown } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import MonthYearPicker from './MonthYearPicker';

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

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Helper to determine the text display in header
  const getPeriodLabel = () => {
    if (activeYear === 'all' && activeMonth === 'all') {
      return 'All Periods Combined';
    }
    if (activeYear === 'undated' && activeMonth === 'undated') {
      return 'Undated Backlogs';
    }
    return activeMonthLabel;
  };

  return (
    <div className="bg-white border-b border-slate-200/50 h-[72px] px-8 flex items-center justify-between shrink-0 select-none font-sans antialiased">
      
      {/* Consolidated Reporting Period Selector */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <button
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className="flex items-center gap-3.5 hover:bg-slate-50/80 active:bg-slate-100/60 p-2 px-3 -mx-2 rounded-2xl transition-all duration-150 cursor-pointer group text-left outline-none border border-transparent hover:border-slate-100"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/30 flex items-center justify-center text-blue-600 shadow-sm shrink-0 group-hover:scale-95 transition-transform duration-150">
              <Calendar className="w-5 h-5" />
            </div>
            
            <div className="flex flex-col">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block leading-none mb-1">
                Reporting Period
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors duration-150">
                  {getPeriodLabel()}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-all duration-150 ${isPickerOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </button>

          {/* Month-Year Picker Popover */}
          <AnimatePresence>
            {isPickerOpen && (
              <MonthYearPicker
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                activeYear={activeYear}
                setActiveYear={setActiveYear}
                activeMonth={activeMonth}
                setActiveMonth={setActiveMonth}
                monthBuckets={monthBuckets}
                yearBuckets={yearBuckets}
              />
            )}
          </AnimatePresence>
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
      </div>

    </div>
  );
}
