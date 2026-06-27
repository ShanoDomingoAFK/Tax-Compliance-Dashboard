import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'summary' | 'sales' | 'working' | 'vat' | 'ewt' | 'bir' | 'masters';
  setActiveTab: (val: 'summary' | 'sales' | 'working' | 'vat' | 'ewt' | 'bir' | 'masters') => void;
  onResetDatabase: () => void;
  onLoadDemoData: () => void;
  transactionsCount: number;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onResetDatabase,
  onLoadDemoData,
  transactionsCount
}: SidebarProps) {
  // Collapsible sidebar state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  // Disbursement Compliance section expanded state (only relevant when expanded)
  const [purchaseExpanded, setPurchaseExpanded] = useState(true);

  // Sync state to localStorage
  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('sidebar_collapsed', String(nextVal));
  };

  const isPurchaseActive = activeTab === 'working' || activeTab === 'vat' || activeTab === 'ewt';

  return (
    <div
      className={`relative h-screen flex flex-col select-none border-r border-slate-200/60 bg-white text-slate-600 shrink-0 font-sans antialiased transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[76px]' : 'w-[280px]'
      }`}
    >
      {/* Floating Toggle Collapse Button */}
      <button
        onClick={toggleCollapse}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        className="absolute top-[22px] -right-3 w-6 h-6 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-all duration-200 shadow-sm z-50 hover:scale-105"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Brand Header */}
      <div className={`p-5 h-[72px] border-b border-slate-100 shrink-0 flex items-center justify-center ${isCollapsed ? 'px-2' : 'px-6'}`}>
        {isCollapsed ? (
          <span className="text-blue-600 font-black text-base tracking-tight uppercase select-none">
            Tax
          </span>
        ) : (
          <div className="w-full text-left overflow-hidden">
            <h2 className="text-slate-800 font-extrabold text-sm tracking-tight leading-snug uppercase">
              Tax Compliance Dashboard
            </h2>
          </div>
        )}
      </div>

      {/* Main Tabs List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        
        {/* Core Workspace Section */}
        <div className="flex flex-col gap-1">
          {!isCollapsed && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">
              Workspaces
            </span>
          )}

          {/* Expanded View with Hierarchical Accordion */}
          {!isCollapsed ? (
            <>
              {/* Compliance Summary Tab */}
              <button
                onClick={() => setActiveTab('summary')}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 relative cursor-pointer flex items-center gap-3 group ${
                  activeTab === 'summary'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/10'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'summary' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <div className="overflow-hidden whitespace-nowrap">
                  <div className="text-xs font-semibold tracking-wide">Compliance Summary</div>
                  <div className={`text-[9px] mt-0.5 font-medium ${activeTab === 'summary' ? 'text-blue-100' : 'text-slate-400'}`}>
                    Vendor aggregated metrics
                  </div>
                </div>
              </button>

              {/* Revenue Compliance Tab */}
              <button
                onClick={() => setActiveTab('sales')}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 relative cursor-pointer flex items-center gap-3 group ${
                  activeTab === 'sales'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/10'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <TrendingUp className={`w-4 h-4 shrink-0 ${activeTab === 'sales' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <div className="overflow-hidden whitespace-nowrap">
                  <div className="text-xs font-semibold tracking-wide">Revenue Compliance</div>
                  <div className={`text-[9px] mt-0.5 font-medium ${activeTab === 'sales' ? 'text-blue-100' : 'text-slate-400'}`}>
                    Revenue compliance modules
                  </div>
                </div>
              </button>

              {/* Disbursement Compliance Accordion Header */}
              <div className="flex flex-col">
                <button
                  onClick={() => {
                    setPurchaseExpanded(!purchaseExpanded);
                    if (!isPurchaseActive) {
                      setActiveTab('working');
                    }
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-between group ${
                    isPurchaseActive
                      ? 'bg-slate-50 text-slate-800 font-semibold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className={`w-4 h-4 shrink-0 ${isPurchaseActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="text-xs font-semibold tracking-wide">Disbursement Compliance</span>
                  </div>
                  {purchaseExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {/* Nested Sub-Tabs Tree */}
                {purchaseExpanded && (
                  <div className="ml-5 pl-3 border-l border-slate-100 mt-1 flex flex-col gap-1">
                    {/* Disbursement Transactions */}
                    <button
                      onClick={() => setActiveTab('working')}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-2.5 group ${
                        activeTab === 'working'
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs font-medium">Disbursement Transactions</span>
                    </button>

                    {/* Input VAT Balances */}
                    <button
                      onClick={() => setActiveTab('vat')}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-2.5 group ${
                        activeTab === 'vat'
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <Scale className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs font-medium">Input VAT Balances</span>
                    </button>

                    {/* EWT Balances */}
                    <button
                      onClick={() => setActiveTab('ewt')}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-2.5 group ${
                        activeTab === 'ewt'
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs font-medium">EWT Balances</span>
                    </button>
                  </div>
                )}
              </div>

              {/* BIR Exports Suite Tab */}
              <button
                onClick={() => setActiveTab('bir')}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 relative cursor-pointer flex items-center gap-3 group ${
                  activeTab === 'bir'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/10'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Download className={`w-4 h-4 shrink-0 ${activeTab === 'bir' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <div className="overflow-hidden whitespace-nowrap">
                  <div className="text-xs font-semibold tracking-wide">BIR Exports Suite</div>
                  <div className={`text-[9px] mt-0.5 font-medium ${activeTab === 'bir' ? 'text-blue-100' : 'text-slate-400'}`}>
                    SLP, QAP and books export
                  </div>
                </div>
              </button>

              {/* Reference Master Data Tab */}
              <button
                onClick={() => setActiveTab('masters')}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 relative cursor-pointer flex items-center gap-3 group ${
                  activeTab === 'masters'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/10'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Database className={`w-4 h-4 shrink-0 ${activeTab === 'masters' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <div className="overflow-hidden whitespace-nowrap">
                  <div className="text-xs font-semibold tracking-wide">Reference Master Data</div>
                  <div className={`text-[9px] mt-0.5 font-medium ${activeTab === 'masters' ? 'text-blue-100' : 'text-slate-400'}`}>
                    ATC, suppliers & VAT categories
                  </div>
                </div>
              </button>
            </>
          ) : (
            /* Collapsed Icons Only Grid (With Tooltips) */
            <div className="flex flex-col gap-2.5 items-center">
              {/* Compliance Summary */}
              <button
                onClick={() => setActiveTab('summary')}
                title="Compliance Summary"
                className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 ${
                  activeTab === 'summary'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>

              {/* Revenue Compliance */}
              <button
                onClick={() => setActiveTab('sales')}
                title="Revenue Compliance (Blank / Planned)"
                className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 ${
                  activeTab === 'sales'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </button>

              {/* Disbursement Transactions */}
              <button
                onClick={() => setActiveTab('working')}
                title="Disbursement Compliance: Transactions"
                className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 ${
                  activeTab === 'working'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>

              {/* Input VAT Balances */}
              <button
                onClick={() => setActiveTab('vat')}
                title="Disbursement Compliance: Input VAT Balances"
                className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 ${
                  activeTab === 'vat'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Scale className="w-4 h-4" />
              </button>

              {/* EWT Balances */}
              <button
                onClick={() => setActiveTab('ewt')}
                title="Disbursement Compliance: EWT Balances"
                className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 ${
                  activeTab === 'ewt'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Percent className="w-4 h-4" />
              </button>

              {/* BIR Exports Suite */}
              <button
                onClick={() => setActiveTab('bir')}
                title="BIR Exports Suite"
                className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 ${
                  activeTab === 'bir'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Reference Master Data */}
              <button
                onClick={() => setActiveTab('masters')}
                title="Reference Master Data"
                className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 ${
                  activeTab === 'masters'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Database className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Database Utilities Footer */}
      <div className="p-4 border-t border-slate-100 shrink-0 flex flex-col gap-2 bg-slate-50/50 select-none">
        {transactionsCount === 0 ? (
          <button
            onClick={onLoadDemoData}
            title="Populate Demo Datasets"
            className={`w-full bg-blue-50 border border-blue-100 hover:bg-blue-100/60 text-blue-600 font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
              isCollapsed ? 'py-2.5 px-0' : 'py-2 px-3 text-xs'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && "Populate Demo"}
          </button>
        ) : (
          <button
            onClick={() => {
              if (confirm('CRITICAL WARN: This will wipe all uploaded transactions, masters overrides and ledger mappings from your offline LocalStorage browser cache. Proceed with database wipe?')) {
                onResetDatabase();
              }
            }}
            title="Wipe Database Cache"
            className={`w-full bg-red-50 border border-red-100 hover:bg-red-100/60 text-red-600 font-semibold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
              isCollapsed ? 'py-2.5 px-0' : 'py-2 px-3 text-xs'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && "Wipe Cache"}
          </button>
        )}
        
        {!isCollapsed && (
          <div className="text-[9px] text-slate-400 text-center font-bold tracking-wider font-mono uppercase mt-1">
            v1.4.0 • OFFLINE SANDBOX
          </div>
        )}
      </div>
    </div>
  );
}
