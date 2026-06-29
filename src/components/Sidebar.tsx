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
  Sparkles,
  Server,
  RefreshCw,
  Activity,
  AlertCircle,
  LogOut
} from 'lucide-react';
import { supabaseSyncService, SyncStatus } from '../services/supabaseSync';

interface SidebarProps {
  activeTab: 'summary' | 'sales' | 'sales-transactions' | 'sales-vat' | 'sales-ewt' | 'working' | 'vat' | 'ewt' | 'bir' | 'masters';
  setActiveTab: (val: 'summary' | 'sales' | 'sales-transactions' | 'sales-vat' | 'sales-ewt' | 'working' | 'vat' | 'ewt' | 'bir' | 'masters') => void;
  onResetDatabase: () => void;
  onLoadDemoData: () => void;
  transactionsCount: number;
  onLogout: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onResetDatabase,
  onLoadDemoData,
  transactionsCount,
  onLogout
}: SidebarProps) {
  // Collapsible sidebar state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  // Accordion expanded states
  const [purchaseExpanded, setPurchaseExpanded] = useState(true);
  const [salesExpanded, setSalesExpanded] = useState(true);
  
  // Database sync popover state
  const [isDbSyncOpen, setIsDbSyncOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<SyncStatus>({
    connected: false,
    provider: 'Local Storage Cache',
    lastSynced: null,
    pendingChangesCount: 0,
    error: 'Initializing connection...'
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch status dynamically
  const refreshDbStatus = async () => {
    setIsRefreshing(true);
    try {
      const status = await supabaseSyncService.getSyncStatus();
      setDbStatus(status);
    } catch (e: any) {
      setDbStatus(prev => ({
        ...prev,
        connected: false,
        error: e?.message || 'Database unavailable'
      }));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshDbStatus();
    // Poll every 30 seconds for dynamic status updates
    const interval = setInterval(refreshDbStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Sync state to localStorage
  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('sidebar_collapsed', String(nextVal));
  };

  const isPurchaseActive = activeTab === 'working' || activeTab === 'vat' || activeTab === 'ewt';
  const isSalesActive = activeTab === 'sales-transactions' || activeTab === 'sales-vat' || activeTab === 'sales-ewt';

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

              {/* Revenue Compliance Accordion Header */}
              <div className="flex flex-col">
                <button
                  onClick={() => {
                    setSalesExpanded(!salesExpanded);
                    if (!isSalesActive) {
                      setActiveTab('sales-transactions');
                    }
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-between group ${
                    isSalesActive
                      ? 'bg-slate-50 text-slate-800 font-semibold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className={`w-4 h-4 shrink-0 ${isSalesActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="text-xs font-semibold tracking-wide">Revenue Compliance</span>
                  </div>
                  {salesExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {/* Nested Sub-Tabs Tree for Sales */}
                {salesExpanded && (
                  <div className="ml-5 pl-3 border-l border-slate-100 mt-1 flex flex-col gap-1">
                    {/* Sales Transactions */}
                    <button
                      onClick={() => setActiveTab('sales-transactions')}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-2.5 group ${
                        activeTab === 'sales-transactions'
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs font-medium">Sales Transactions</span>
                    </button>

                    {/* Output VAT Balances */}
                    <button
                      onClick={() => setActiveTab('sales-vat')}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-2.5 group ${
                        activeTab === 'sales-vat'
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <Scale className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs font-medium">Output VAT Balances</span>
                    </button>

                    {/* CWT Balances */}
                    <button
                      onClick={() => setActiveTab('sales-ewt')}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-2.5 group ${
                        activeTab === 'sales-ewt'
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs font-medium">CWT Balances</span>
                    </button>
                  </div>
                )}
              </div>

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

              {/* References Tab */}
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
                  <div className="text-xs font-semibold tracking-wide">References</div>
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

              {/* Sales Transactions */}
              <button
                onClick={() => setActiveTab('sales-transactions')}
                title="Revenue Compliance: Sales Transactions"
                className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 relative group ${
                  activeTab === 'sales-transactions'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  Sales Transactions
                </span>
              </button>

              {/* Output VAT Balances */}
              <button
                onClick={() => setActiveTab('sales-vat')}
                title="Revenue Compliance: Output VAT Balances"
                className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 relative group ${
                  activeTab === 'sales-vat'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  Output VAT Balances
                </span>
              </button>

              {/* CWT Balances */}
              <button
                onClick={() => setActiveTab('sales-ewt')}
                title="Revenue Compliance: CWT Balances"
                className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 relative group ${
                  activeTab === 'sales-ewt'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Percent className="w-4 h-4" />
                <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  CWT Balances
                </span>
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
      <div className="p-4 border-t border-slate-100 shrink-0 flex flex-col gap-2 bg-slate-50/50 select-none relative">
        {/* DB Sync Status Button */}
        <div
          onClick={() => setIsDbSyncOpen(!isDbSyncOpen)}
          className={`w-full bg-white border hover:border-blue-300 hover:bg-blue-50/30 rounded-xl p-2 transition-all duration-200 cursor-pointer flex items-center shadow-sm relative group ${
            isCollapsed ? 'justify-center' : 'justify-between'
          } ${dbStatus.connected ? 'border-slate-200' : 'border-amber-250'}`}
          title="Database Sync Status"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Server className={`w-4 h-4 ${dbStatus.connected ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dbStatus.connected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 border border-white ${dbStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
            </div>
            {!isCollapsed && (
              <span className="text-xs font-bold text-slate-700">
                {dbStatus.connected ? 'Connected' : 'Offline / Local'}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                refreshDbStatus();
              }}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Refresh connection status"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
            </button>
          )}
        </div>

        {/* DB Sync Popover */}
        {isDbSyncOpen && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsDbSyncOpen(false)}
            />
            <div className={`absolute bottom-full left-4 mb-2 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-4 transform transition-all ${
              isCollapsed ? 'w-64 ml-16' : 'w-64'
            }`}>
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Database className={`w-4 h-4 ${dbStatus.connected ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Database Link</h4>
                </div>
                <button 
                  onClick={refreshDbStatus}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-1 uppercase tracking-wider"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Current Provider</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${dbStatus.connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className="text-xs font-semibold text-slate-700">
                      {dbStatus.connected ? 'Supabase Connection' : 'LocalStorage Cache'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Last Sync</span>
                  <span className="text-xs font-medium text-slate-600 font-mono">
                    {dbStatus.lastSynced || 'Never (Using Local Offline Cache)'}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pending Operations</span>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Activity className="w-3.5 h-3.5 text-blue-500" />
                    None (Local data holds original states)
                  </div>
                </div>

                {dbStatus.error && (
                  <div className="bg-amber-50 border border-amber-200/50 rounded-lg p-2 flex gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-700 font-medium leading-tight">
                      {dbStatus.error}
                    </p>
                  </div>
                )}
                
                {!dbStatus.error && dbStatus.connected && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 flex gap-2">
                    <span className="text-emerald-500 text-xs font-bold font-mono">✓</span>
                    <p className="text-[10px] text-emerald-700 font-medium leading-tight">
                      Full bidirectional synchronization layer is configured and operational.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Log Out button replacing Populate Demo */}
        <button
          onClick={onLogout}
          title="Sign Out of Workspace"
          className={`w-full bg-slate-800 hover:bg-red-600 text-white font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
            isCollapsed ? 'py-2.5 px-0' : 'py-2 px-3 text-xs'
          }`}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!isCollapsed && "Log Out"}
        </button>

        {transactionsCount > 0 && (
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
