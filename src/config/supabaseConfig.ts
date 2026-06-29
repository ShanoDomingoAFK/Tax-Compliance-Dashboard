/// <reference types="vite/client" />

/**
 * Supabase Database Connection Configuration
 * 
 * This is the dedicated configuration layer for all database connection settings.
 * It pulls credentials safely from environment variables (with no hardcoded secrets),
 * making it easy for the IT department or developers to change the endpoint or swap 
 * providers in a single location.
 */

import { databaseConfig } from './databaseConfig';

export const supabaseConfig = {
  // Connection details pulled from the centralized database configuration
  url: databaseConfig.url,
  anonKey: databaseConfig.anonKey,
  
  // Toggles synchronization behavior
  syncIntervalMs: databaseConfig.syncIntervalMs,          // Time between background sync polls
  offlineSupportEnabled: databaseConfig.offlineSupportEnabled,    // Toggles LocalStorage fallback and queuing
  
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
