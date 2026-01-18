import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function normalize(v: string | undefined) {
  const raw = v ?? "";
  const trimmed = raw.trim();
  return { raw, trimmed };
}

function getEnv() {
  return {
    url: normalize(import.meta.env.VITE_SUPABASE_URL as string | undefined),
    anonKey: normalize(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined),
  };
}

/**
 * Lazy + safe initializer.
 * If env vars are missing, returns null instead of crashing the app.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;

  const { url, anonKey } = getEnv();
  if (!url.trimmed || !anonKey.trimmed) return null;

  try {
    _client = createClient(url.trimmed, anonKey.trimmed);
    return _client;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[supabase] createClient failed", e);
    return null;
  }
}

// Central place to adjust if your daily table uses a different column name.
export const PERFORMANCE_DATE_COLUMN = "date" as const;

