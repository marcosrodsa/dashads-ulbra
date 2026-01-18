import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

// Configuração via env (Vite). Não mantenha fallback hardcoded neste projeto.
// Use Secrets para definir VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
//
// Fallback de desenvolvimento: permite override via localStorage quando o ambiente
// não injeta VITE_* (ex: preview). A anon key é pública, então isso é aceitável
// para destravar o app.
const LS_URL_KEY = "SUPABASE_URL_OVERRIDE";
const LS_ANON_KEY = "SUPABASE_ANON_KEY_OVERRIDE";

function normalize(v: string | undefined) {
  const raw = v ?? "";
  const trimmed = raw.trim();
  return { raw, trimmed };
}

function readLocalStorageOverride() {
  if (typeof window === "undefined") return null;
  try {
    const url = normalize(window.localStorage.getItem(LS_URL_KEY) ?? undefined);
    const anonKey = normalize(window.localStorage.getItem(LS_ANON_KEY) ?? undefined);
    if (url.trimmed && anonKey.trimmed) return { url, anonKey };
    return null;
  } catch {
    return null;
  }
}

function getEnv() {
  const override = readLocalStorageOverride();
  if (override) return { ...override, source: "override" as const };

  return {
    url: normalize(import.meta.env.VITE_SUPABASE_URL as string | undefined),
    anonKey: normalize(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined),
    source: "env" as const,
  };
}

export type SupabaseConfigSource = "env" | "override" | "none";

export function getSupabaseConfigSource(): SupabaseConfigSource {
  const { url, anonKey, source } = getEnv();
  if (url.trimmed && anonKey.trimmed) return source;
  return "none";
}

export function resetSupabaseClient(): void {
  _client = null;
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

