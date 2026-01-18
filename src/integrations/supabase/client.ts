import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly so misconfig is obvious in preview.
  // eslint-disable-next-line no-console
  console.warn("Supabase env vars missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Project Secrets.");
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");

// Central place to adjust if your daily table uses a different column name.
export const PERFORMANCE_DATE_COLUMN = "date" as const;
