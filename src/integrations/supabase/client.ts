import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Singleton pattern to survive HMR and prevent multiple instances
const globalSymbols = globalThis as any;
const CLIENT_SYMBOL = Symbol.for("dashads.supabase.client");

function getCachedClient(): SupabaseClient | null {
  return globalSymbols[CLIENT_SYMBOL] || null;
}

function setCachedClient(client: SupabaseClient | null) {
  globalSymbols[CLIENT_SYMBOL] = client;
}

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

export function getEnv() {
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
  setCachedClient(null);
}

/**
 * Lazy + safe initializer.
 * If config is missing, returns null instead of crashing the app.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const cached = getCachedClient();
  if (cached) return cached;

  const { url, anonKey } = getEnv();

  const finalUrl = url.trimmed;
  const finalAnonKey = anonKey.trimmed;

  const cachedCheck = getCachedClient();
  if (cachedCheck) return cachedCheck;

  try {
    const client = createClient(finalUrl, finalAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
    setCachedClient(client);
    return client;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[supabase] createClient failed", e);
    return null;
  }
}

// Helper for Console Debugging
// Usage: await window.supabase.auth.getSession()
if (typeof window !== "undefined") {
  (window as any).supabase = getSupabaseClient();
}

// Central place to adjust if your daily table uses a different column name.
export const PERFORMANCE_DATE_COLUMN = "date" as const;

