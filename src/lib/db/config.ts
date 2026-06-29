export const dbConfig = {
  // Use environment variables for connection strings
  // Replace these with actual values when connecting to Supabase or your company's production database
  url: import.meta.env.VITE_DATABASE_URL || '',
  anonKey: import.meta.env.VITE_DATABASE_ANON_KEY || '',
  
  // Define current active provider to easily toggle implementations
  // Options: 'local' (localStorage cache), 'supabase' (development test), 'production' (company DB)
  provider: (import.meta.env.VITE_DATABASE_PROVIDER as 'local' | 'supabase' | 'production') || 'local',

  // Config parameters for syncing mechanism
  syncIntervalMs: 30000,
  enableOfflineMode: true,
};
