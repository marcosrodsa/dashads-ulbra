import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

// Fallback público (URL + anon key) para quando o preview não injeta import.meta.env.VITE_SUPABASE_*.
// ATENÇÃO: não coloque aqui service_role / keys privadas.
const FALLBACK_SUPABASE_URL = "https://ywkiodtxvknpytxuzary.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3a2lvZHR4dmtucHl0eHV6YXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzQ0MDEsImV4cCI6MjA4MzkxMDQwMX0.0FFXZJ_K65nVayP115hJLkHKJ016NahVpe0A8CI5vRs";

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

export type SupabaseConfigSource = "env" | "fallback" | "none";

export function getSupabaseConfigSource(): SupabaseConfigSource {
  const { url, anonKey } = getEnv();
  if (url.trimmed && anonKey.trimmed) return "env";
  if (FALLBACK_SUPABASE_URL.trim() && FALLBACK_SUPABASE_ANON_KEY.trim()) return "fallback";
  return "none";
}

/**
 * Lazy + safe initializer.
 * If config is missing, returns null instead of crashing the app.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;

  const { url, anonKey } = getEnv();

  const finalUrl = url.trimmed || FALLBACK_SUPABASE_URL.trim();
  const finalAnonKey = anonKey.trimmed || FALLBACK_SUPABASE_ANON_KEY.trim();

  if (!finalUrl || !finalAnonKey) return null;

  try {
    _client = createClient(finalUrl, finalAnonKey);
    return _client;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[supabase] createClient failed", e);
    return null;
  }
}

// Central place to adjust if your daily table uses a different column name.
export const PERFORMANCE_DATE_COLUMN = "date" as const;

