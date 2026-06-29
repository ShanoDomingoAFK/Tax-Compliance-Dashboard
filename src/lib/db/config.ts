/// <reference types="vite/client" />

import { databaseConfig } from '../../config/databaseConfig';

export const dbConfig = {
  // Use centralized configuration for connection details
  url: databaseConfig.url,
  anonKey: databaseConfig.anonKey,
  
  // Define current active provider from centralized configuration
  provider: databaseConfig.provider as 'local' | 'supabase' | 'production',

  // Config parameters for syncing mechanism
  syncIntervalMs: databaseConfig.syncIntervalMs,
  enableOfflineMode: databaseConfig.offlineSupportEnabled,
};
