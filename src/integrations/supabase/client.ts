import { createClient } from "@supabase/supabase-js";

/**
 * TEMPORÁRIO (conforme solicitado): credenciais hardcoded.
 * 
 * ⚠️ Trocar por variáveis de ambiente/Secrets antes de publicar.
 */
const SUPABASE_URL = "https://ywkiodtxvknpytxuzary.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3a2lvZHR4dmtucHl0eHV6YXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzQ0MDEsImV4cCI6MjA4MzkxMDQwMX0.0FFXZJ_K65nVayP115hJLkHKJ016NahVpe0A8CI5vRs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
