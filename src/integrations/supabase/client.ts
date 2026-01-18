import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getEnv() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  };
}

/**
 * Lazy + safe initializer.
 * If env vars are missing, returns null instead of crashing the app.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;

  const { url, anonKey } = getEnv();
  if (!url || !anonKey) return null;

  _client = createClient(url, anonKey);
  return _client;
}

// Central place to adjust if your daily table uses a different column name.
export const PERFORMANCE_DATE_COLUMN = "date" as const;

