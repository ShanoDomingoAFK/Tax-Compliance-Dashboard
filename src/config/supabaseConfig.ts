/// <reference types="vite/client" />

/**
 * Supabase Database Connection Configuration
 * 
 * This is the dedicated configuration layer for all database connection settings.
 * It pulls credentials safely from environment variables (with no hardcoded secrets),
 * making it easy for the IT department or developers to change the endpoint or swap 
 * providers in a single location.
 */

export const supabaseConfig = {
  // Connection details pulled from VITE_ environment variables
  url: import.meta.env.VITE_DATABASE_URL || '',
  anonKey: import.meta.env.VITE_DATABASE_ANON_KEY || '',
  
  // Toggles synchronization behavior
  syncIntervalMs: 30000,          // Time between background sync polls
  offlineSupportEnabled: true,    // Toggles LocalStorage fallback and queuing
  
  // Database table names mapped here to allow changing database schemas
  // without modifying the business logic or component files
  tables: {
    profiles: 'profiles',
    vatCategories: 'vat_categories',
    atcMaster: 'atc_master',
    supplierMaster: 'supplier_master',
    purchaseTransactions: 'purchase_transactions',
    salesTransactions: 'sales_transactions',
    inputVatLedger: 'input_vat_ledger',
    ewtLedger: 'ewt_ledger',
    outputVatLedger: 'output_vat_ledger',
    cwtLedger: 'cwt_ledger',
    birComplianceExports: 'bir_compliance_exports',
    auditLogs: 'audit_logs',
  },

  // Metadata for connection status reporting
  environment: import.meta.env.MODE || 'development',
  providerName: 'Supabase PostgreSQL',
};
