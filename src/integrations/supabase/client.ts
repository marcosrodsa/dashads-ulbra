import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

// Configuração via env (Vite). Não mantenha fallback hardcoded neste projeto.
// Use Secrets para definir VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.

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

export type SupabaseConfigSource = "env" | "none";

export function getSupabaseConfigSource(): SupabaseConfigSource {
  const { url, anonKey } = getEnv();
  if (url.trimmed && anonKey.trimmed) return "env";
  return "none";
}

/**
 * Lazy + safe initializer.
 * If config is missing, returns null instead of crashing the app.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;

  const { url, anonKey } = getEnv();

  const finalUrl = url.trimmed;
  const finalAnonKey = anonKey.trimmed;

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

