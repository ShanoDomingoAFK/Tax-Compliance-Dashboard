/// <reference types="vite/client" />

import { supabase } from './supabaseClient';
import { supabaseConfig } from '../config/supabaseConfig';
import { Transaction, LedgerRow, Supplier, ATCEntry, VATCategory } from '../types';

/**
 * Interface representing the status of the database connection and sync operations.
 */
export interface SyncStatus {
  connected: boolean;
  provider: string;
  lastSynced: string | null;
  pendingChangesCount: number;
  error: string | null;
}

/**
 * Helper to split array into smaller chunks for batch-processing.
 * Avoids triggering payload limits or timeouts.
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * Mapper: Database row (snake_case) -> Purchase Transaction (camelCase)
 */
function mapDbToPurchaseTransaction(db: any): Transaction {
  return {
    _id: db.id,
    voucherName: db.voucher_name || '',
    supplier: db.supplier_name || '',
    tin: db.tin || '',
    cv: db.cv_number || '',
    inv: db.invoice_number || '',
    date: db.transaction_date || '',
    description: db.description || '',
    amount: Number(db.amount || 0),
    vatable: Number(db.vatable_amount || 0),
    nonVatable: Number(db.non_vatable_amount || 0),
    vat: Number(db.vat_amount || 0),
    total: Number(db.total_amount || 0),
    vatCategory: db.vat_category || '',
    vatReg: (db.vat_reg_type === 'Non-VAT' ? 'Non-VAT' : 'VAT-reg'),
    ewtAmount: Number(db.ewt_amount || 0),
    atcCode: db.atc_code || '',
    manualStatus: (db.manual_status || 'unreviewed') as any,
    reviewNote: db.review_note || '',
    lastReviewed: db.last_reviewed || '',
    accountingTitle: db.accounting_title || '',
    bankAccount: db.bank_account || '',
    registeredName: db.registered_name || '',
    lastName: db.last_name || '',
    firstName: db.first_name || '',
    middleName: db.middle_name || '',
    address: db.address || '',
    city: db.city || '',
    zip: db.zip || '',
    supplierManualOverride: db.supplier_manual_override || false,
  };
}

/**
 * Mapper: Database row (snake_case) -> Sales Transaction (camelCase)
 */
function mapDbToSalesTransaction(db: any): Transaction {
  return {
    _id: db.id,
    voucherName: db.voucher_name || '',
    supplier: db.customer_name || '',
    tin: db.tin || '',
    cv: db.cv_number || '',
    inv: db.invoice_number || '',
    date: db.transaction_date || '',
    description: db.description || '',
    amount: Number(db.amount || 0),
    vatable: Number(db.vatable_amount || 0),
    nonVatable: Number(db.non_vatable_amount || 0),
    vat: Number(db.vat_amount || 0),
    total: Number(db.total_amount || 0),
    vatCategory: db.vat_category || '',
    vatReg: (db.vat_reg_type === 'Non-VAT' ? 'Non-VAT' : 'VAT-reg'),
    ewtAmount: Number(db.cwt_withheld_amount || 0),
    atcCode: db.atc_code || '',
    manualStatus: (db.manual_status || 'unreviewed') as any,
    reviewNote: db.review_note || '',
    lastReviewed: db.last_reviewed || '',
    accountingTitle: db.accounting_title || 'Revenues',
    bankAccount: db.bank_account || '',
    registeredName: db.registered_name || '',
    lastName: db.last_name || '',
    firstName: db.first_name || '',
    middleName: db.middle_name || '',
    address: db.address || '',
    city: db.city || '',
    zip: db.zip || '',
    supplierManualOverride: db.customer_manual_override || false,
  };
}

/**
 * Reusable Paginated Fetcher to systematically bypass default 1,000-record caps.
 */
async function fetchAllRowsFromTable<T>(
  tableName: string,
  filterCallback?: (query: any) => any
): Promise<T[]> {
  if (!supabase) return [];
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const start = page * pageSize;
    const end = start + pageSize - 1;

    let query = supabase.from(tableName).select('*').range(start, end);
    if (filterCallback) {
      query = filterCallback(query);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Error querying table ${tableName} (page ${page}, indices ${start}-${end}):`, error);
      throw error;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allData = allData.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  return allData as T[];
}

/**
 * Database Synchronization & Query Service
 */
export const supabaseSyncService = {
  /**
   * Checks connection health and returns active sync info.
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const isClientReady = !!supabase;
    let connected = false;
    let error: string | null = null;

    if (isClientReady && supabase) {
      try {
        const { error: pingError } = await supabase
          .from(supabaseConfig.tables.vatCategories)
          .select('code')
          .limit(1);
        
        connected = !pingError;
        if (pingError) error = pingError.message;
      } catch (e: any) {
        connected = false;
        error = e?.message || 'Network connection failed';
      }
    } else {
      error = 'No database credentials configured';
    }

    return {
      connected,
      provider: supabaseConfig.providerName,
      lastSynced: connected ? new Date().toLocaleTimeString() : null,
      pendingChangesCount: 0,
      error,
    };
  },

  // ==========================================
  // REFERENCE / MASTER DATA OPERATIONS
  // ==========================================

  async fetchVatCategories(): Promise<VATCategory[]> {
    const rows = await fetchAllRowsFromTable<any>(supabaseConfig.tables.vatCategories, (q) =>
      q.order('code', { ascending: true })
    );
    return rows.map((row: any) => ({
      _id: row.id || `vat_${row.code}`,
      code: row.code,
      label: row.label || '',
      kind: row.kind || '',
      rate: Number(row.rate || 0),
      status: row.status || 'active',
    }));
  },

  async fetchAtcMaster(): Promise<ATCEntry[]> {
    const rows = await fetchAllRowsFromTable<any>(supabaseConfig.tables.atcMaster, (q) =>
      q.order('atc_code', { ascending: true })
    );
    return rows.map((row: any) => ({
      _id: row.id || `atc_${row.atc_code}`,
      atcCode: row.atc_code,
      rate: row.rate !== null && row.rate !== undefined ? Number(row.rate) : null,
      description: row.description || '',
      source: row.source || 'BIR',
      status: row.status || 'active',
    }));
  },

  async fetchSupplierMaster(): Promise<Supplier[]> {
    const rows = await fetchAllRowsFromTable<any>(supabaseConfig.tables.supplierMaster, (q) =>
      q.eq('is_deleted', false).order('registered_name', { ascending: true })
    );
    return rows.map((row: any) => ({
      _id: row.id || `supplier_${row.tin}`,
      tin: row.tin,
      registeredName: row.registered_name,
      lastName: row.last_name || '',
      firstName: row.first_name || '',
      middleName: row.middle_name || '',
      address: row.address || '',
      city: row.city || '',
      zip: row.zip || '',
      status: row.status || 'active',
    }));
  },

  // ==========================================
  // TRANSACTION OPERATIONS (PURCHASES & SALES)
  // ==========================================

  async fetchPurchaseTransactions(filters?: { year?: string; month?: string }): Promise<Transaction[]> {
    const data = await fetchAllRowsFromTable<any>(supabaseConfig.tables.purchaseTransactions, (q) => {
      let filteredQuery = q.eq('is_deleted', false);
      if (filters?.year) {
        filteredQuery = filteredQuery.gte('transaction_date', `${filters.year}-01-01`).lte('transaction_date', `${filters.year}-12-31`);
      }
      if (filters?.month && filters?.year) {
        const lastDay = new Date(Number(filters.year), Number(filters.month), 0).getDate();
        filteredQuery = filteredQuery
          .gte('transaction_date', `${filters.year}-${filters.month}-01`)
          .lte('transaction_date', `${filters.year}-${filters.month}-${lastDay}`);
      }
      return filteredQuery.order('transaction_date', { ascending: false });
    });

    return data.map(mapDbToPurchaseTransaction);
  },

  async savePurchaseTransaction(txn: Transaction): Promise<Transaction> {
    if (!supabase) return txn;
    const { error } = await supabase
      .from(supabaseConfig.tables.purchaseTransactions)
      .upsert({
        id: txn._id,
        voucher_name: txn.voucherName,
        supplier_name: txn.supplier,
        tin: txn.tin,
        cv_number: txn.cv,
        invoice_number: txn.inv,
        transaction_date: txn.date,
        description: txn.description,
        amount: txn.amount,
        vatable_amount: txn.vatable,
        non_vatable_amount: txn.nonVatable,
        vat_amount: txn.vat,
        total_amount: txn.total,
        vat_category: txn.vatCategory,
        vat_reg_type: txn.vatReg,
        ewt_amount: txn.ewtAmount,
        atc_code: txn.atcCode,
        manual_status: txn.manualStatus,
        review_note: txn.reviewNote,
        accounting_title: txn.accountingTitle,
        bank_account: txn.bankAccount,
        supplier_manual_override: txn.supplierManualOverride,
        is_deleted: false,
      });

    if (error) {
      console.error('Error saving Purchase Transaction:', error);
      throw error;
    }
    return txn;
  },

  async fetchSalesTransactions(filters?: { year?: string; month?: string }): Promise<Transaction[]> {
    const data = await fetchAllRowsFromTable<any>(supabaseConfig.tables.salesTransactions, (q) => {
      let filteredQuery = q.eq('is_deleted', false);
      if (filters?.year) {
        filteredQuery = filteredQuery.gte('transaction_date', `${filters.year}-01-01`).lte('transaction_date', `${filters.year}-12-31`);
      }
      if (filters?.month && filters?.year) {
        const lastDay = new Date(Number(filters.year), Number(filters.month), 0).getDate();
        filteredQuery = filteredQuery
          .gte('transaction_date', `${filters.year}-${filters.month}-01`)
          .lte('transaction_date', `${filters.year}-${filters.month}-${lastDay}`);
      }
      return filteredQuery.order('transaction_date', { ascending: false });
    });

    return data.map(mapDbToSalesTransaction);
  },

  async saveSalesTransaction(txn: Transaction): Promise<Transaction> {
    if (!supabase) return txn;
    const { error } = await supabase
      .from(supabaseConfig.tables.salesTransactions)
      .upsert({
        id: txn._id,
        voucher_name: txn.voucherName,
        customer_name: txn.supplier,
        tin: txn.tin,
        cv_number: txn.cv,
        invoice_number: txn.inv,
        transaction_date: txn.date,
        description: txn.description,
        amount: txn.amount,
        vatable_amount: txn.vatable,
        non_vatable_amount: txn.nonVatable,
        vat_amount: txn.vat,
        total_amount: txn.total,
        vat_category: txn.vatCategory,
        vat_reg_type: txn.vatReg,
        cwt_withheld_amount: txn.ewtAmount,
        atc_code: txn.atcCode,
        manual_status: txn.manualStatus,
        review_note: txn.reviewNote,
        accounting_title: txn.accountingTitle,
        bank_account: txn.bankAccount,
        customer_manual_override: txn.supplierManualOverride,
        is_deleted: false,
      });

    if (error) {
      console.error('Error saving Sales Transaction:', error);
      throw error;
    }
    return txn;
  },

  // ==========================================
  // LEDGER OPERATIONS
  // ==========================================

  async fetchLedgerRows(type: 'input_vat' | 'ewt' | 'output_vat' | 'cwt'): Promise<LedgerRow[]> {
    let tableName = supabaseConfig.tables.inputVatLedger;
    if (type === 'ewt') tableName = supabaseConfig.tables.ewtLedger;
    if (type === 'output_vat') tableName = supabaseConfig.tables.outputVatLedger;
    if (type === 'cwt') tableName = supabaseConfig.tables.cwtLedger;

    const data = await fetchAllRowsFromTable<any>(tableName, (q) => q.eq('is_deleted', false));

    return data.map(row => ({
      _id: row.id,
      cv: row.cv_number,
      supplier: row.supplier_name || row.customer_name || '',
      date: row.entry_date,
      amount: Number(row.amount || 0),
      account: row.account_code_name,
      ref: row.reference_code || '',
      type: (type === 'input_vat' || type === 'output_vat') ? 'vat' : 'ewt',
    }));
  },

  // ==========================================
  // BULK SYNCHRONIZATION ENGINE
  // ==========================================
  
  /**
   * High-performance batch synchronization engine.
   * Uses chunked parallel batching (200 records per chunk) to avoid hitting payload or rate limits,
   * making it extremely robust even when uploading 10,000+ sales or purchase transactions.
   */
  async syncDashboard(payload: {
    transactions: Transaction[];
    salesTransactions: Transaction[];
    vatLedger: LedgerRow[];
    ewtLedger: LedgerRow[];
    outputVatLedger: LedgerRow[];
    cwtLedger: LedgerRow[];
    supplierMaster: Supplier[];
  }): Promise<void> {
    if (!supabase) return;
    
    console.log(`Beginning high-performance remote dashboard sync with Supabase...`);
    
    try {
      // 1. Sync Supplier Master (Chunk size: 200)
      if (payload.supplierMaster.length > 0) {
        const supplierRows = payload.supplierMaster.map(s => ({
          tin: s.tin,
          registered_name: s.registeredName,
          last_name: s.lastName || '',
          first_name: s.firstName || '',
          middle_name: s.middleName || '',
          address: s.address || '',
          city: s.city || '',
          zip: s.zip || '',
          status: s.status || 'active',
          is_deleted: false,
        }));
        
        const chunks = chunkArray(supplierRows, 200);
        for (const chunk of chunks) {
          const { error } = await supabase
            .from(supabaseConfig.tables.supplierMaster)
            .upsert(chunk, { onConflict: 'tin' });
          if (error) throw error;
        }
        console.log(`Synchronized ${payload.supplierMaster.length} suppliers in batches.`);
      }

      // 2. Sync Purchase Transactions (Chunk size: 200)
      if (payload.transactions.length > 0) {
        const purchaseRows = payload.transactions.map(txn => ({
          id: txn._id,
          voucher_name: txn.voucherName,
          supplier_name: txn.supplier,
          tin: txn.tin,
          cv_number: txn.cv,
          invoice_number: txn.inv,
          transaction_date: txn.date,
          description: txn.description,
          amount: txn.amount,
          vatable_amount: txn.vatable,
          non_vatable_amount: txn.nonVatable,
          vat_amount: txn.vat,
          total_amount: txn.total,
          vat_category: txn.vatCategory,
          vat_reg_type: txn.vatReg,
          ewt_amount: txn.ewtAmount,
          atc_code: txn.atcCode,
          manual_status: txn.manualStatus,
          review_note: txn.reviewNote,
          accounting_title: txn.accountingTitle,
          bank_account: txn.bankAccount,
          supplier_manual_override: txn.supplierManualOverride,
          is_deleted: false,
        }));

        const chunks = chunkArray(purchaseRows, 200);
        for (const chunk of chunks) {
          const { error } = await supabase
            .from(supabaseConfig.tables.purchaseTransactions)
            .upsert(chunk);
          if (error) throw error;
        }
        console.log(`Synchronized ${payload.transactions.length} purchase transactions in batches.`);
      }

      // 3. Sync Sales Transactions (Chunk size: 200)
      if (payload.salesTransactions.length > 0) {
        const salesRows = payload.salesTransactions.map(txn => ({
          id: txn._id,
          voucher_name: txn.voucherName,
          customer_name: txn.supplier,
          tin: txn.tin,
          cv_number: txn.cv,
          invoice_number: txn.inv,
          transaction_date: txn.date,
          description: txn.description,
          amount: txn.amount,
          vatable_amount: txn.vatable,
          non_vatable_amount: txn.nonVatable,
          vat_amount: txn.vat,
          total_amount: txn.total,
          vat_category: txn.vatCategory,
          vat_reg_type: txn.vatReg,
          cwt_withheld_amount: txn.ewtAmount,
          atc_code: txn.atcCode,
          manual_status: txn.manualStatus,
          review_note: txn.reviewNote,
          accounting_title: txn.accountingTitle,
          bank_account: txn.bankAccount,
          customer_manual_override: txn.supplierManualOverride,
          is_deleted: false,
        }));

        const chunks = chunkArray(salesRows, 200);
        for (const chunk of chunks) {
          const { error } = await supabase
            .from(supabaseConfig.tables.salesTransactions)
            .upsert(chunk);
          if (error) throw error;
        }
        console.log(`Synchronized ${payload.salesTransactions.length} sales transactions in batches.`);
      }

      // 4. Sync Ledgers
      const syncLedgerType = async (ledgerData: LedgerRow[], table: string, isSales = false) => {
        if (ledgerData.length === 0) return;
        const rows = ledgerData.map(l => {
          const base: any = {
            id: l._id,
            cv_number: l.cv,
            entry_date: l.date,
            amount: l.amount,
            account_code_name: l.account,
            reference_code: l.ref || '',
            is_deleted: false,
          };
          if (isSales) {
            base.customer_name = l.supplier;
          } else {
            base.supplier_name = l.supplier;
          }
          return base;
        });

        const chunks = chunkArray(rows, 200);
        for (const chunk of chunks) {
          const { error } = await supabase
            .from(table)
            .upsert(chunk);
          if (error) throw error;
        }
      };

      await syncLedgerType(payload.vatLedger, supabaseConfig.tables.inputVatLedger, false);
      await syncLedgerType(payload.ewtLedger, supabaseConfig.tables.ewtLedger, false);
      await syncLedgerType(payload.outputVatLedger, supabaseConfig.tables.outputVatLedger, true);
      await syncLedgerType(payload.cwtLedger, supabaseConfig.tables.cwtLedger, true);

      console.log('Database synchronization completed successfully!');
    } catch (err) {
      console.error('Failed to complete full batch sync:', err);
      throw err;
    }
  }
};
