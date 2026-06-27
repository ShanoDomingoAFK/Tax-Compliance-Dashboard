import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Check, Sparkles, CalendarRange, Clock } from 'lucide-react';
import { MonthInfo, YearInfo } from '../types';

interface MonthYearPickerProps {
  isOpen: boolean;
  onClose: () => void;
  activeYear: string;
  setActiveYear: (val: string) => void;
  activeMonth: string;
  setActiveMonth: (val: string) => void;
  monthBuckets: MonthInfo[];
  yearBuckets: YearInfo[];
}

const MONTH_GRID = [
  { num: 1, label: 'Jan', fullName: 'January' },
  { num: 2, label: 'Feb', fullName: 'February' },
  { num: 3, label: 'Mar', fullName: 'March' },
  { num: 4, label: 'Apr', fullName: 'April' },
  { num: 5, label: 'May', fullName: 'May' },
  { num: 6, label: 'Jun', fullName: 'June' },
  { num: 7, label: 'Jul', fullName: 'July' },
  { num: 8, label: 'Aug', fullName: 'August' },
  { num: 9, label: 'Sep', fullName: 'September' },
  { num: 10, label: 'Oct', fullName: 'October' },
  { num: 11, label: 'Nov', fullName: 'November' },
  { num: 12, label: 'Dec', fullName: 'December' },
];

export default function MonthYearPicker({
  isOpen,
  onClose,
  activeYear,
  setActiveYear,
  activeMonth,
  setActiveMonth,
  monthBuckets,
  yearBuckets,
}: MonthYearPickerProps) {
  const currentYearNum = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1; // 1-indexed

  // Local state to navigate years inside the picker
  const [tempYear, setTempYear] = useState<string>(() => {
    if (activeYear === 'all' || activeYear === 'undated') {
      return String(currentYearNum);
    }
    return activeYear;
  });

  // Keep tempYear in sync with activeYear when picker opens
  useEffect(() => {
    if (isOpen) {
      if (activeYear !== 'all' && activeYear !== 'undated') {
        setTempYear(activeYear);
      } else {
        setTempYear(String(currentYearNum));
      }
    }
  }, [isOpen, activeYear, currentYearNum]);

  if (!isOpen) return null;

  // Check if a specific month in tempYear has transactions in monthBuckets
  const hasData = (monthNum: number) => {
    const key = `${tempYear}-${String(monthNum).padStart(2, '0')}`;
    return monthBuckets.some(m => m.key === key);
  };

  const isMonthSelected = (monthNum: number) => {
    if (activeYear === 'all' || activeYear === 'undated') return false;
    const key = `${tempYear}-${String(monthNum).padStart(2, '0')}`;
    return activeMonth === key;
  };

  const handleMonthSelect = (monthNum: number) => {
    const mm = String(monthNum).padStart(2, '0');
    const key = `${tempYear}-${mm}`;
    setActiveYear(tempYear);
    setActiveMonth(key);
    onClose();
  };

  const handleYearChange = (dir: 'prev' | 'next') => {
    const yr = Number(tempYear) || currentYearNum;
    const nextYr = dir === 'prev' ? yr - 1 : yr + 1;
    setTempYear(String(nextYr));
  };

  const selectAllCombined = () => {
    setActiveYear('all');
    setActiveMonth('all');
    onClose();
  };

  const selectUndated = () => {
    setActiveYear('undated');
    setActiveMonth('undated');
    onClose();
  };

  const selectAllMonthsForYear = () => {
    setActiveYear(tempYear);
    setActiveMonth('all');
    onClose();
  };

  return (
    <>
      {/* Click-outside backdrop layer */}
      <div 
        id="month-picker-backdrop"
        className="fixed inset-0 z-[100] cursor-default bg-black/5" 
        onClick={onClose}
      />

      {/* Floating iPhone Style Month-Year Picker */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="absolute left-0 mt-2 w-[340px] bg-white border border-slate-200/80 rounded-3xl shadow-xl z-[101] overflow-hidden select-none font-sans"
        style={{ top: '100%' }}
      >
        {/* iOS-like Header with Navigation */}
        <div className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
              Select Period
            </span>
            <button
              onClick={selectAllCombined}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all duration-150 flex items-center gap-1.5 ${
                activeYear === 'all' && activeMonth === 'all'
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>All Combined</span>
            </button>
          </div>

          {/* iPhone Year Controller */}
          <div className="flex items-center justify-between bg-white border border-slate-150 rounded-2xl p-1.5 shadow-sm">
            <button
              onClick={() => handleYearChange('prev')}
              className="p-1.5 hover:bg-slate-50 rounded-xl transition-colors duration-150 text-slate-500 hover:text-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-extrabold text-slate-800 tracking-tight select-none">
              {tempYear} FY
            </span>
            <button
              onClick={() => handleYearChange('next')}
              className="p-1.5 hover:bg-slate-50 rounded-xl transition-colors duration-150 text-slate-500 hover:text-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3x4 Month Picker Grid */}
        <div className="p-4 grid grid-cols-3 gap-2.5">
          {MONTH_GRID.map((item) => {
            const selected = isMonthSelected(item.num);
            const containsData = hasData(item.num);
            const isCurrentMonth = 
              tempYear === String(currentYearNum) && 
              item.num === currentMonthNum;

            return (
              <button
                key={item.num}
                onClick={() => handleMonthSelect(item.num)}
                className={`group relative h-[64px] rounded-2xl flex flex-col items-center justify-center transition-all duration-150 border cursor-pointer ${
                  selected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10 hover:bg-blue-700'
                    : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-700'
                }`}
              >
                <span className={`text-xs font-extrabold tracking-tight ${selected ? 'text-white' : 'text-slate-800'}`}>
                  {item.label}
                </span>
                
                {/* Visual indicator for current system month */}
                {isCurrentMonth && !selected && (
                  <span className="absolute top-1.5 right-2 text-[8px] font-bold text-blue-500 uppercase tracking-widest scale-90">
                    Current
                  </span>
                )}

                {/* Subtitle / dot showing if it has records */}
                <div className="mt-1 flex items-center justify-center gap-1 min-h-[4px]">
                  {containsData ? (
                    <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white/80' : 'bg-emerald-500'}`} title="Has records" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Options Drawer */}
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex gap-2">
          {/* All Months of Temp Year */}
          <button
            onClick={selectAllMonthsForYear}
            className={`flex-1 py-2 text-center rounded-xl text-xs font-bold border transition-all duration-150 ${
              activeYear === tempYear && activeMonth === 'all'
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white border-slate-150 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            All {tempYear} Months
          </button>

          {/* Undated Backlogs Option */}
          <button
            onClick={selectUndated}
            className={`py-2 px-3 text-center rounded-xl text-xs font-bold border transition-all duration-150 flex items-center justify-center gap-1.5 ${
              activeYear === 'undated'
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-white border-slate-150 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Undated</span>
          </button>
        </div>
      </motion.div>
    </>
  );
}
