import React from 'react';
import { useDashboardState } from './hooks/useDashboardState';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SummarySheet from './components/SummarySheet';
import WorkingSheet from './components/WorkingSheet';
import VatEwtSheet from './components/VatEwtSheet';
import SalesTransactionsSheet from './components/SalesTransactionsSheet';
import SalesVatEwtSheet from './components/SalesVatEwtSheet';
import BirSheet from './components/BirSheet';
import MastersSheet from './components/MastersSheet';
import CVReviewModal from './components/CVReviewModal';
import SummaryReviewModal from './components/SummaryReviewModal';
import { TrendingUp } from 'lucide-react';

import {
  demoVatCategories,
  demoAtcMaster,
  demoSupplierMaster
} from './data/demo';

import { Transaction, LedgerRow } from './types';

export default function App() {
  const state = useDashboardState();

  // Handle DB reset
  function handleResetDatabase() {
    state.setTransactions([]);
    state.setVatLedger([]);
    state.setEwtLedger([]);
    state.setSalesTransactions([]);
    state.setOutputVatLedger([]);
    state.setCwtLedger([]);
    state.setSupplierMaster([]);
    state.setAtcMaster([]);
    state.setVatCategories([]);
    localStorage.clear();
    alert('Browser offline database cache has been successfully wiped.');
  }

  // Handle Demo Seed
  function handleLoadDemoData() {
    state.setVatCategories(demoVatCategories);
    state.setAtcMaster(demoAtcMaster);
    state.setSupplierMaster(demoSupplierMaster);

    const baseTxns: any[] = [
      {
        _id: 'tx_demo1',
        voucherName: 'Supplier A Corporation',
        supplier: 'Supplier A Corporation',
        tin: '123-456-789-000',
        cv: 'CV-1001',
        inv: 'SI-20459',
        date: '06/15/2026',
        description: 'Monthly office cleaning and sanitation service',
        amount: 10000,
        vatCategory: 'S',
        atcCode: 'WC 160',
        manualStatus: 'unreviewed',
        accountingTitle: 'Professional Fees',
        bankAccount: 'BDO Checking Account'
      },
      {
        _id: 'tx_demo2',
        voucherName: 'Supplier B Services',
        supplier: 'Supplier B Services',
        tin: '234-567-890-000',
        cv: 'CV-1002',
        inv: 'SI-33921',
        date: '06/18/2026',
        description: 'Network structure installation cabling',
        amount: 5000,
        vatCategory: 'S',
        atcCode: 'WC 160',
        manualStatus: 'ok',
        accountingTitle: 'Consultancy Services',
        bankAccount: 'BDO Checking Account'
      },
      {
        _id: 'tx_demo3',
        voucherName: 'Supplier C Trading',
        supplier: 'Supplier C Trading',
        tin: '345-678-901-000',
        cv: 'CV-1003',
        inv: 'SI-40488',
        date: '06/20/2026',
        description: 'Reproduction paper bundles and office pens',
        amount: 12000,
        vatCategory: 'G',
        atcCode: 'WC 158',
        manualStatus: 'warn',
        reviewNote: 'Lacks official vendor receipt attachment scan',
        accountingTitle: 'Office Supplies',
        bankAccount: 'BDO Checking Account'
      },
      {
        _id: 'tx_demo4',
        voucherName: 'Juan Dela Cruz',
        supplier: 'Juan Dela Cruz',
        tin: '456-789-012-000',
        cv: 'CV-1004',
        inv: 'OR-0051',
        date: '06/22/2026',
        description: 'Individual subcontracting carpentry service',
        amount: 8000,
        vatCategory: 'S',
        atcCode: 'WI 160',
        manualStatus: 'err',
        reviewNote: 'Incorrect withholding tax category applied. Review needed.',
        accountingTitle: 'Subcontracting Expenses',
        bankAccount: 'BDO Checking Account'
      },
      {
        _id: 'tx_demo5',
        voucherName: 'Supplier Y Inc.',
        supplier: 'Supplier Y Inc.',
        tin: '567-890-123-000',
        cv: 'CV-1005',
        inv: 'SI-80920',
        date: '06/24/2026',
        description: 'Air conditioning cooling server backup unit',
        amount: 15000,
        vatCategory: 'CG',
        atcCode: 'WC 158',
        manualStatus: 'unreviewed',
        accountingTitle: 'Capital Assets',
        bankAccount: 'BDO Checking Account'
      }
    ];

    baseTxns.forEach(t => state.addTransaction(t));

    // Seed matching input VAT ledgers
    const baseVatLedger: LedgerRow[] = [
      { _id: 'vl_1', cv: 'CV-1001', supplier: 'Supplier A Corporation', date: '06/15/2026', amount: 1200, account: 'Input VAT', ref: 'CV-1001', type: 'vat' },
      { _id: 'vl_2', cv: 'CV-1002', supplier: 'Supplier B Services', date: '06/18/2026', amount: 600, account: 'Input VAT', ref: 'CV-1002', type: 'vat' },
      { _id: 'vl_3', cv: 'CV-1003', supplier: 'Supplier C Trading', date: '06/20/2026', amount: 1440, account: 'Input VAT', ref: 'CV-1003', type: 'vat' },
      { _id: 'vl_4', cv: 'CV-1004', supplier: 'Juan Dela Cruz', date: '06/22/2026', amount: 960, account: 'Input VAT', ref: 'CV-1004', type: 'vat' },
      { _id: 'vl_5', cv: 'CV-1005', supplier: 'Supplier Y Inc.', date: '06/24/2026', amount: 1800, account: 'Input VAT', ref: 'CV-1005', type: 'vat' }
    ];
    state.setVatLedger(baseVatLedger);

    // Seed matching EWT withholding tax ledgers
    const baseEwtLedger: LedgerRow[] = [
      { _id: 'el_1', cv: 'CV-1001', supplier: 'Supplier A Corporation', date: '06/15/2026', amount: 200, account: 'Withholding Tax - Expanded', ref: 'CV-1001', type: 'ewt' },
      { _id: 'el_2', cv: 'CV-1002', supplier: 'Supplier B Services', date: '06/18/2026', amount: 100, account: 'Withholding Tax - Expanded', ref: 'CV-1002', type: 'ewt' },
      { _id: 'el_3', cv: 'CV-1003', supplier: 'Supplier C Trading', date: '06/20/2026', amount: 120, account: 'Withholding Tax - Expanded', ref: 'CV-1003', type: 'ewt' },
      { _id: 'el_4', cv: 'CV-1004', supplier: 'Juan Dela Cruz', date: '06/22/2026', amount: 160, account: 'Withholding Tax - Expanded', ref: 'CV-1004', type: 'ewt' },
      { _id: 'el_5', cv: 'CV-1005', supplier: 'Supplier Y Inc.', date: '06/24/2026', amount: 150, account: 'Withholding Tax - Expanded', ref: 'CV-1005', type: 'ewt' }
    ];
    state.setEwtLedger(baseEwtLedger);

    // Revenue / Sales Demo Data
    const baseSalesTxns: any[] = [
      {
        _id: 'tx_sales_demo1',
        voucherName: 'Acme Sales Corp',
        supplier: 'Acme Sales Corp',
        tin: '555-555-555-000',
        cv: 'INV-1001',
        inv: 'INV-1001',
        date: '06/15/2026',
        description: 'Rendered Q2 technology architectural consulting services',
        amount: 80000,
        vatCategory: 'S',
        atcCode: 'WC 160',
        manualStatus: 'unreviewed',
        accountingTitle: 'Revenues',
        bankAccount: 'Cash in Bank'
      },
      {
        _id: 'tx_sales_demo2',
        voucherName: 'Globex Consulting Ltd',
        supplier: 'Globex Consulting Ltd',
        tin: '666-666-666-000',
        cv: 'INV-1002',
        inv: 'INV-1002',
        date: '06/18/2026',
        description: 'Corporate server maintenance and setup execution',
        amount: 120000,
        vatCategory: 'S',
        atcCode: 'WC 160',
        manualStatus: 'ok',
        accountingTitle: 'Revenues',
        bankAccount: 'Cash in Bank'
      },
      {
        _id: 'tx_sales_demo3',
        voucherName: 'Initech Trading Corp',
        supplier: 'Initech Trading Corp',
        tin: '777-777-777-000',
        cv: 'INV-1003',
        inv: 'INV-1003',
        date: '06/20/2026',
        description: 'Consultancy and structural blueprint delivery',
        amount: 45000,
        vatCategory: 'S',
        atcCode: 'WC 158',
        manualStatus: 'warn',
        accountingTitle: 'Revenues',
        bankAccount: 'Cash in Bank'
      }
    ];

    baseSalesTxns.forEach(t => state.addSalesTransaction(t));

    // Seed matching Output VAT ledgers
    const baseOutputVatLedger: LedgerRow[] = [
      { _id: 'ovl_1', cv: 'INV-1001', supplier: 'Acme Sales Corp', date: '06/15/2026', amount: 9600, account: 'Output VAT', ref: 'INV-1001', type: 'vat' },
      { _id: 'ovl_2', cv: 'INV-1002', supplier: 'Globex Consulting Ltd', date: '06/18/2026', amount: 14400, account: 'Output VAT', ref: 'INV-1002', type: 'vat' },
      { _id: 'ovl_3', cv: 'INV-1003', supplier: 'Initech Trading Corp', date: '06/20/2026', amount: 5400, account: 'Output VAT', ref: 'INV-1003', type: 'vat' }
    ];
    state.setOutputVatLedger(baseOutputVatLedger);

    // Seed matching CWT withholding ledgers
    const baseCwtLedger: LedgerRow[] = [
      { _id: 'cl_1', cv: 'INV-1001', supplier: 'Acme Sales Corp', date: '06/15/2026', amount: 1600, account: 'Creditable Withholding Tax', ref: 'INV-1001', type: 'ewt' },
      { _id: 'cl_2', cv: 'INV-1002', supplier: 'Globex Consulting Ltd', date: '06/18/2026', amount: 2400, account: 'Creditable Withholding Tax', ref: 'INV-1002', type: 'vat' },
      { _id: 'cl_3', cv: 'INV-1003', supplier: 'Initech Trading Corp', date: '06/20/2026', amount: 450, account: 'Creditable Withholding Tax', ref: 'INV-1003', type: 'ewt' }
    ];
    state.setCwtLedger(baseCwtLedger);

    alert('Compliance database loaded with June 2026 demo transactions and balanced ledgers.');
  }

  // Find label for active month tab
  const activeMonthLabel = React.useMemo(() => {
    if (state.activeMonth === 'all') return 'All Months';
    if (state.activeMonth === 'undated') return 'Undated';
    const found = state.monthBuckets.find(m => m.key === state.activeMonth);
    if (found) return found.label;

    // Fallback format parser for YYYY-MM
    const match = state.activeMonth.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const year = match[1];
      const monthNum = parseInt(match[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (monthNum >= 1 && monthNum <= 12) {
        return `${months[monthNum - 1]} ${year}`;
      }
    }
    return state.activeMonth;
  }, [state.activeMonth, state.monthBuckets]);

  // Compute unreviewed transactions
  const unreviewedCount = React.useMemo(() => {
    return state.transactions.filter(t => t.manualStatus === 'unreviewed').length;
  }, [state.transactions]);

  // Find focused CV group
  const focusedCvGroup = React.useMemo(() => {
    if (!state.focusedCV) return null;
    return state.cvGroups.find(g => g.cv === state.focusedCV) || null;
  }, [state.focusedCV, state.cvGroups]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800 antialiased selection:bg-blue-100">
      
      {/* 1. Sidebar Navigation */}
      <Sidebar
        activeTab={state.activeTab}
        setActiveTab={state.setActiveTab}
        onResetDatabase={handleResetDatabase}
        onLoadDemoData={handleLoadDemoData}
        transactionsCount={state.transactions.length}
      />

      {/* 2. Main Container Workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        
        {/* Header */}
        <Header
          activeMonthLabel={activeMonthLabel}
          activeYear={state.activeYear}
          setActiveYear={state.setActiveYear}
          activeMonth={state.activeMonth}
          setActiveMonth={state.setActiveMonth}
          monthBuckets={state.monthBuckets}
          yearBuckets={state.yearBuckets}
          transactionsCount={state.transactions.length}
          unreviewedCount={unreviewedCount}
        />

        {/* View Sheets */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {state.activeTab === 'summary' && (
            <SummarySheet
              visibleTransactions={state.visibleTransactions}
              consolidatedSummaryGroups={state.consolidatedSummaryGroups}
              summarySearch={state.summarySearch}
              setSummarySearch={state.setSummarySearch}
              activeSummaryStatus={state.activeSummaryStatus}
              setActiveSummaryStatus={state.setActiveSummaryStatus}
              summaryVatTypeFilter={state.summaryVatTypeFilter}
              setSummaryVatTypeFilter={state.setSummaryVatTypeFilter}
              summarySort={state.summarySort}
              setSummarySort={state.setSummarySort}
              summaryViewMode={state.summaryViewMode}
              setSummaryViewMode={state.setSummaryViewMode}
              summaryGroupMode={state.summaryGroupMode}
              setSummaryGroupMode={state.setSummaryGroupMode}
              setActiveSummaryReview={state.setActiveSummaryReview}
            />
          )}

          {state.activeTab === 'sales-transactions' && (
            <SalesTransactionsSheet
              visibleSalesTransactions={state.visibleSalesTransactions}
              filteredSalesCvGroups={state.filteredSalesCvGroups}
              vatCategories={state.vatCategories}
              atcMaster={state.atcMaster}
              supplierMaster={state.supplierMaster}
              setSalesTransactions={state.setSalesTransactions}
              setOutputVatLedger={state.setOutputVatLedger}
              setCwtLedger={state.setCwtLedger}
              setVatCategories={state.setVatCategories}
              setAtcMaster={state.setAtcMaster}
              setSupplierMaster={state.setSupplierMaster}
              activeSalesBreakdown={state.activeSalesBreakdown}
              setActiveSalesBreakdown={state.setActiveSalesBreakdown}
              salesSort={state.salesSort}
              setSalesSort={state.setSalesSort}
              focusedCV={state.focusedCV}
              setFocusedCV={state.setFocusedCV}
              salesSearch={state.salesSearch}
              setSalesSearch={state.setSalesSearch}
              salesStatusFilter={state.salesStatusFilter}
              setSalesStatusFilter={state.setSalesStatusFilter}
              salesVarianceFilter={state.salesVarianceFilter}
              setSalesVarianceFilter={state.setSalesVarianceFilter}
              findSupplierByTIN={state.findSupplierByTIN}
              addSalesTransaction={state.addSalesTransaction}
              parseQuickBooksWorkbook={state.parseQuickBooksWorkbook}
              importMappedRows={state.importMappedRows}
            />
          )}

          {state.activeTab === 'sales-vat' && (
            <SalesVatEwtSheet
              type="vat"
              visibleSalesTransactions={state.visibleSalesTransactions}
              visibleLedgerRows={state.visibleOutputVatLedger}
              ledgerReconciliation={state.outputVatLedgerReconciliation}
              searchQuery={state.outputVatSearch}
              setSearchQuery={state.setOutputVatSearch}
              balanceFilter={state.outputVatBalanceFilter}
              setBalanceFilter={state.setOutputVatBalanceFilter}
              onClearMonthLedger={() => {
                if (confirm(`Are you sure you want to remove all uploaded Output VAT ledger statement lines for ${activeMonthLabel}?`)) {
                  state.setOutputVatLedger(prev => prev.filter(r => !state.recordMatchesActiveMonth(r)));
                }
              }}
              activeMonthLabel={activeMonthLabel}
            />
          )}

          {state.activeTab === 'sales-ewt' && (
            <SalesVatEwtSheet
              type="ewt"
              visibleSalesTransactions={state.visibleSalesTransactions}
              visibleLedgerRows={state.visibleCwtLedger}
              ledgerReconciliation={state.cwtLedgerReconciliation}
              searchQuery={state.cwtSearch}
              setSearchQuery={state.setCwtSearch}
              balanceFilter={state.cwtBalanceFilter}
              setBalanceFilter={state.setCwtBalanceFilter}
              onClearMonthLedger={() => {
                if (confirm(`Are you sure you want to remove all uploaded CWT ledger statement lines for ${activeMonthLabel}?`)) {
                  state.setCwtLedger(prev => prev.filter(r => !state.recordMatchesActiveMonth(r)));
                }
              }}
              activeMonthLabel={activeMonthLabel}
            />
          )}

          {state.activeTab === 'working' && (
            <WorkingSheet
              visibleTransactions={state.visibleTransactions}
              filteredCVGroups={state.filteredCVGroups}
              workingSearch={state.workingSearch}
              setWorkingSearch={state.setWorkingSearch}
              workStatusFilter={state.workStatusFilter}
              setWorkStatusFilter={state.setWorkStatusFilter}
              varianceFilter={state.varianceFilter}
              setVarianceFilter={state.setVarianceFilter}
              workSort={state.workSort}
              setWorkSort={state.setWorkSort}
              focusedCV={state.focusedCV}
              setFocusedCV={state.setFocusedCV}
              setTransactions={state.setTransactions}
              setVatLedger={state.setVatLedger}
              setEwtLedger={state.setEwtLedger}
              vatCategories={state.vatCategories}
              setVatCategories={state.setVatCategories}
              atcMaster={state.atcMaster}
              setAtcMaster={state.setAtcMaster}
              supplierMaster={state.supplierMaster}
              setSupplierMaster={state.setSupplierMaster}
              activePurchaseBreakdown={state.activePurchaseBreakdown}
              setActivePurchaseBreakdown={state.setActivePurchaseBreakdown}
              findSupplierByTIN={state.findSupplierByTIN}
              addTransaction={state.addTransaction}
              parseQuickBooksWorkbook={state.parseQuickBooksWorkbook}
              importMappedRows={state.importMappedRows}
            />
          )}

          {state.activeTab === 'vat' && (
            <VatEwtSheet
              type="vat"
              visibleTransactions={state.visibleTransactions}
              visibleLedgerRows={state.visibleVatLedger}
              ledgerReconciliation={state.vatLedgerReconciliation}
              searchQuery={state.vatSearch}
              setSearchQuery={state.setVatSearch}
              balanceFilter={state.vatBalanceFilter}
              setBalanceFilter={state.setVatBalanceFilter}
              onClearMonthLedger={() => {
                if (confirm(`Are you sure you want to remove all uploaded VAT ledger statement lines for ${activeMonthLabel}?`)) {
                  state.setVatLedger(prev => prev.filter(r => !state.recordMatchesActiveMonth(r)));
                }
              }}
              activeMonthLabel={activeMonthLabel}
            />
          )}

          {state.activeTab === 'ewt' && (
            <VatEwtSheet
              type="ewt"
              visibleTransactions={state.visibleTransactions}
              visibleLedgerRows={state.visibleEwtLedger}
              ledgerReconciliation={state.ewtLedgerReconciliation}
              searchQuery={state.ewtSearch}
              setSearchQuery={state.setEwtSearch}
              balanceFilter={state.ewtBalanceFilter}
              setBalanceFilter={state.setEwtBalanceFilter}
              onClearMonthLedger={() => {
                if (confirm(`Are you sure you want to remove all uploaded EWT ledger statement lines for ${activeMonthLabel}?`)) {
                  state.setEwtLedger(prev => prev.filter(r => !state.recordMatchesActiveMonth(r)));
                }
              }}
              activeMonthLabel={activeMonthLabel}
            />
          )}

          {state.activeTab === 'bir' && (
            <BirSheet
              visibleTransactions={state.visibleTransactions}
              transactions={state.transactions}
              vatCategories={state.vatCategories}
              atcMaster={state.atcMaster}
              activeMonth={state.activeMonth}
              activeMonthLabel={activeMonthLabel}
              slpPeriodInfo={state.slpPeriodInfo}
              slpExcelSourceRows={state.slpExcelSourceRows}
              slpDatAmountBuckets={state.slpDatAmountBuckets}
              slpSupplierNameParts={state.slpSupplierNameParts}
              slpTin9={state.slpTin9}
              validateSLPDatSourceRows={state.validateSLPDatSourceRows}
              hasAtcCode={state.hasAtcCode}
              hasVatCategoryCode={state.hasVatCategoryCode}
              birNonCashSourceRows={state.birNonCashSourceRows}
              birCashSourceRows={state.birCashSourceRows}
              ewtSourceRows={state.ewtSourceRows}
              birEligibleTransactions={state.birEligibleTransactions}
            />
          )}

          {state.activeTab === 'masters' && (
            <MastersSheet
              vatCategories={state.vatCategories}
              setVatCategories={state.setVatCategories}
              atcMaster={state.atcMaster}
              setAtcMaster={state.setAtcMaster}
              supplierMaster={state.supplierMaster}
              setSupplierMaster={state.setSupplierMaster}
              setTransactions={state.setTransactions}
              activeMasterSub={state.activeMasterSub}
              setActiveMasterSub={state.setActiveMasterSub}
              vatCategorySearch={state.vatCategorySearch}
              setVatCategorySearch={state.setVatCategorySearch}
              atcSearch={state.atcSearch}
              setAtcSearch={state.setAtcSearch}
              supplierSearch={state.supplierSearch}
              setSupplierSearch={state.setSupplierSearch}
            />
          )}
        </div>

      </div>

      {/* --- Modals / Popups layer --- */}
      {state.focusedCV && (
        <CVReviewModal
          cvGroup={focusedCvGroup}
          vatCategories={state.vatCategories}
          atcMaster={state.atcMaster}
          supplierMaster={state.supplierMaster}
          onClose={() => state.setFocusedCV(null)}
          updateTransaction={state.updateTransaction}
          deleteTransaction={state.deleteTransaction}
          findSupplierByTIN={state.findSupplierByTIN}
          setFocusedCV={state.setFocusedCV}
          setTransactions={state.setTransactions}
          setVatLedger={state.setVatLedger}
          setEwtLedger={state.setEwtLedger}
        />
      )}

      {state.activeSummaryReview && (
        <SummaryReviewModal
          reviewGroup={state.activeSummaryReview}
          visibleTransactions={state.visibleTransactions}
          onClose={() => state.setActiveSummaryReview(null)}
        />
      )}

    </div>
  );
}
