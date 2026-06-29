import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabaseConfig';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Lazy initialization helper for the Supabase Client.
 * This pattern ensures that missing credentials during build/startup
 * do not crash the application, but instead fail gracefully with clear warnings when used.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const { url, anonKey } = supabaseConfig;

  if (!url || !anonKey) {
    console.warn(
      'Supabase Database connection variables are not defined. ' +
      'Please check your .env.example / environment variables ' +
      'for VITE_DATABASE_URL and VITE_DATABASE_ANON_KEY.'
    );
    return null;
  }

  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    console.log('Successfully initialized Supabase Client connected to:', url);
    return supabaseInstance;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

/**
 * Singleton export of the initialized client (may be null if unconfigured)
 */
export const supabase = getSupabaseClient();
