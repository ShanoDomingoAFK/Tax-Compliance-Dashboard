import React, { useState } from 'react';
import { MonthInfo, YearInfo } from '../types';
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingBag,
  FileSpreadsheet,
  Scale,
  Percent,
  Download,
  Database,
  Trash2,
  DatabaseBackup,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'summary' | 'sales' | 'working' | 'vat' | 'ewt' | 'bir' | 'masters';
  setActiveTab: (val: 'summary' | 'sales' | 'working' | 'vat' | 'ewt' | 'bir' | 'masters') => void;
  activeYear: string;
  setActiveYear: (val: string) => void;
  activeMonth: string;
  setActiveMonth: (val: string) => void;
  monthBuckets: MonthInfo[];
  yearBuckets: YearInfo[];
  onResetDatabase: () => void;
  onLoadDemoData: () => void;
  transactionsCount: number;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  activeYear,
  setActiveYear,
  activeMonth,
  setActiveMonth,
  monthBuckets,
  yearBuckets,
  onResetDatabase,
  onLoadDemoData,
  transactionsCount
}: SidebarProps) {

  // Purchase Compliance section expanded state
  const [purchaseExpanded, setPurchaseExpanded] = useState(true);

  // Group months under active year
  const filteredMonths = monthBuckets.filter(m => {
    if (activeYear === 'all') return true;
    const yr = m.key.split('-')[0];
    return yr === activeYear || m.key === 'undated';
  });

  const isPurchaseActive = activeTab === 'working' || activeTab === 'vat' || activeTab === 'ewt';

  return (
    <div className="w-[300px] bg-slate-950 text-slate-300 flex flex-col h-screen select-none border-r border-slate-900 shrink-0 font-sans antialiased">
      
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-900/85 shrink-0 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/10">
            <span className="text-white font-black text-lg tracking-tight font-sans">🇵🇭</span>
          </div>
          <div>
            <h2 className="text-white font-extrabold text-sm tracking-tight font-sans leading-tight">
              PH VAT Compliance
            </h2>
            <span className="text-[10px] text-slate-500 font-bold block tracking-wider uppercase font-mono mt-0.5">
              Ledger Intelligence Portal
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs scroll list */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-slate-900/60 scrollbar-track-transparent">
        
        {/* Core Workspace Section */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3.5 mb-1 block">
            Workspaces
          </span>

          {/* Compliance Summary Tab */}
          <button
            onClick={() => setActiveTab('summary')}
            className={`w-full text-left px-3.5 py-3 rounded-xl transition-all duration-200 relative cursor-pointer flex items-center gap-3 group ${
              activeTab === 'summary'
                ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'summary' ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'}`} />
            <div>
              <div className="text-xs font-semibold tracking-wide">Compliance Summary</div>
              <div className={`text-[9px] mt-0.5 font-medium ${activeTab === 'summary' ? 'text-blue-100' : 'text-slate-500'}`}>
                Vendor aggregated metrics
              </div>
            </div>
            {activeTab === 'summary' && (
              <div className="absolute right-3.5 w-1.5 h-1.5 rounded-full bg-white shadow" />
            )}
          </button>

          {/* Sales Transaction Tab */}
          <button
            onClick={() => setActiveTab('sales')}
            className={`w-full text-left px-3.5 py-3 rounded-xl transition-all duration-200 relative cursor-pointer flex items-center gap-3 group ${
              activeTab === 'sales'
                ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <TrendingUp className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'sales' ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'}`} />
            <div>
              <div className="text-xs font-semibold tracking-wide">Sales Transaction</div>
              <div className={`text-[9px] mt-0.5 font-medium ${activeTab === 'sales' ? 'text-blue-100' : 'text-slate-500'}`}>
                Revenue compliance modules
              </div>
            </div>
            {activeTab === 'sales' && (
              <div className="absolute right-3.5 w-1.5 h-1.5 rounded-full bg-white shadow" />
            )}
          </button>

          {/* Purchase Compliance Accordion Group */}
          <div className="mt-2 flex flex-col">
            <button
              onClick={() => {
                setPurchaseExpanded(!purchaseExpanded);
                // Switch to default working sub-tab if we click and it's not active
                if (!isPurchaseActive) {
                  setActiveTab('working');
                }
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                isPurchaseActive
                  ? 'bg-slate-900/50 text-white font-semibold'
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className={`w-4 h-4 shrink-0 ${isPurchaseActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                <span className="text-xs tracking-wide">Purchase Compliance</span>
              </div>
              {purchaseExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            {/* Indented Sub-Tabs Tree */}
            {purchaseExpanded && (
              <div className="ml-5 pl-3.5 border-l border-slate-900 mt-1.5 flex flex-col gap-1">
                {/* 1. Purchase Transactions */}
                <button
                  onClick={() => setActiveTab('working')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2.5 group ${
                    activeTab === 'working'
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/10'
                      : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  <div className="text-xs">Purchase Transactions</div>
                </button>

                {/* 2. VAT Balances */}
                <button
                  onClick={() => setActiveTab('vat')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2.5 group ${
                    activeTab === 'vat'
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/10'
                      : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5 shrink-0" />
                  <div className="text-xs">VAT Balances</div>
                </button>

                {/* 3. EWT Balances */}
                <button
                  onClick={() => setActiveTab('ewt')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2.5 group ${
                    activeTab === 'ewt'
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/10'
                      : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5 shrink-0" />
                  <div className="text-xs">EWT Balances</div>
                </button>
              </div>
            )}
          </div>

          {/* BIR Exports Suite Tab */}
          <button
            onClick={() => setActiveTab('bir')}
            className={`w-full text-left px-3.5 py-3 rounded-xl transition-all duration-200 relative cursor-pointer flex items-center gap-3 mt-1.5 group ${
              activeTab === 'bir'
                ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <Download className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'bir' ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'}`} />
            <div>
              <div className="text-xs font-semibold tracking-wide">BIR Exports Suite</div>
              <div className={`text-[9px] mt-0.5 font-medium ${activeTab === 'bir' ? 'text-blue-100' : 'text-slate-500'}`}>
                SLP, QAP and books export
              </div>
            </div>
            {activeTab === 'bir' && (
              <div className="absolute right-3.5 w-1.5 h-1.5 rounded-full bg-white shadow" />
            )}
          </button>

          {/* Reference Master Data Tab */}
          <button
            onClick={() => setActiveTab('masters')}
            className={`w-full text-left px-3.5 py-3 rounded-xl transition-all duration-200 relative cursor-pointer flex items-center gap-3 group ${
              activeTab === 'masters'
                ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <Database className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'masters' ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'}`} />
            <div>
              <div className="text-xs font-semibold tracking-wide">Reference Master Data</div>
              <div className={`text-[9px] mt-0.5 font-medium ${activeTab === 'masters' ? 'text-blue-100' : 'text-slate-500'}`}>
                ATC, suppliers & VAT categories
              </div>
            </div>
            {activeTab === 'masters' && (
              <div className="absolute right-3.5 w-1.5 h-1.5 rounded-full bg-white shadow" />
            )}
          </button>
        </div>

        {/* Periods Grouping Sidebar Controllers */}
        <div className="border-t border-slate-900 pt-5 flex flex-col gap-3">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3.5 block">
            Fiscal Period Filter
          </span>

          {/* Year selector */}
          <div className="px-1.5">
            <select
              value={activeYear}
              onChange={(e) => {
                setActiveYear(e.target.value);
                setActiveMonth('all'); // reset month when changing year
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 font-bold outline-none cursor-pointer focus:border-blue-500/80 hover:bg-slate-900/80 transition-colors duration-150"
            >
              <option value="all">All Years Combined</option>
              {yearBuckets.map(y => (
                <option key={y.year} value={y.year}>{y.year === 'undated' ? 'Undated / Backlogs' : `${y.year} FY`}</option>
              ))}
            </select>
          </div>

          {/* Month Buckets Grid */}
          <div className="flex flex-col gap-1 px-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-900/60">
            <button
              onClick={() => setActiveMonth('all')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-150 font-semibold cursor-pointer ${
                activeMonth === 'all'
                  ? 'bg-slate-900 text-white font-bold border-l-2 border-blue-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/40'
              }`}
            >
              🌐 Combined Months View
            </button>
            {filteredMonths.map(m => (
              <button
                key={m.key}
                onClick={() => setActiveMonth(m.key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-150 font-semibold flex justify-between items-center cursor-pointer ${
                  activeMonth === m.key
                    ? 'bg-slate-900 text-white font-bold border-l-2 border-blue-500 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/40'
                }`}
              >
                <span>{m.label}</span>
                {m.key === 'undated' && (
                  <span className="px-1.5 py-0.5 text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded font-bold font-mono">
                    JE/AJE
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Database utilities footer */}
      <div className="p-4 border-t border-slate-900 shrink-0 flex flex-col gap-2.5 bg-slate-950 select-none">
        {transactionsCount === 0 ? (
          <button
            onClick={onLoadDemoData}
            className="w-full py-2.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 hover:border-blue-500/40 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Populate Demo Datasets
          </button>
        ) : (
          <button
            onClick={() => {
              if (confirm('CRITICAL WARN: This will wipe all uploaded transactions, masters overrides and ledger mappings from your offline LocalStorage browser cache. Proceed with database wipe?')) {
                onResetDatabase();
              }
            }}
            className="w-full py-2.5 bg-red-600/5 text-red-400/90 border border-red-500/10 hover:bg-red-600/15 hover:text-red-400 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Wipe Database Cache
          </button>
        )}
        <div className="text-[9px] text-slate-700 text-center font-bold tracking-wider font-mono uppercase mt-0.5">
          v1.4.0 • SANDBOX PERSISTENCE
        </div>
      </div>

    </div>
  );
}
