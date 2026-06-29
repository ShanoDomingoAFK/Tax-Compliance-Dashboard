/// <reference types="vite/client" />

/**
 * Centralized Database Configuration
 * 
 * This file pulls credentials from the local .env or .env.local file
 * so that you can configure or replace database connections (like Supabase)
 * directly within the project configuration, without modifying functional code
 * or relying exclusively on AI Studio Secrets.
 */
export const databaseConfig = {
  // Database provider: 'supabase' to enable direct database integration, 'local' for offline storage
  provider: (import.meta.env.VITE_DATABASE_PROVIDER as 'local' | 'supabase') || 'local',

  // Supabase URL (e.g., https://your-project.supabase.co)
  url: import.meta.env.VITE_DATABASE_URL || '',

  // Supabase Anon/Public Key
  anonKey: import.meta.env.VITE_DATABASE_ANON_KEY || '',

  // Other database connection settings
  syncIntervalMs: 30000,
  offlineSupportEnabled: true,
};
