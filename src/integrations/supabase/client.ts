import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let _client: SupabaseClient | null = null;

/**
 * Lazy + safe initializer.
 * If env vars are missing, returns null instead of crashing the app.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
}

// Central place to adjust if your daily table uses a different column name.
export const PERFORMANCE_DATE_COLUMN = "date" as const;
