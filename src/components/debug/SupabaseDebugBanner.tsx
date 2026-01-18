import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSupabaseClient, getSupabaseConfigSource } from "@/integrations/supabase/client";
import { resolvePerformanceDailyColumns } from "@/integrations/supabase/performanceSchema";

function maskUrl(url: string) {
  try {
    const u = new URL(url);
    const host = u.host;
    return `${u.protocol}//${host}/…`;
  } catch {
    return url.length > 18 ? `${url.slice(0, 10)}…${url.slice(-6)}` : url;
  }
}

export function SupabaseDebugBanner() {
  const enabled = import.meta.env.DEV;
  const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  const rawAnon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
  const url = rawUrl.trim();
  const anon = rawAnon.trim();
  const client = React.useMemo(() => getSupabaseClient(), []);

  const [schemaHint, setSchemaHint] = React.useState<string>("");

  React.useEffect(() => {
    let mounted = true;
    if (!client) return;

    resolvePerformanceDailyColumns(client)
      .then((cols) => {
        if (!mounted) return;
        setSchemaHint(
          `fact_ads_performance_daily: dateCol=${cols.dateCol}, unitCol=${cols.businessUnitCol}, courseCol=${cols.courseCol}`
        );
      })
      .catch(() => {
        if (!mounted) return;
        setSchemaHint("");
      });

    return () => {
      mounted = false;
    };
  }, [client]);

  if (!enabled) return null;

  const ok = !!client;
  const anonHasNewlines = /[\r\n]/.test(rawAnon);
  const source = getSupabaseConfigSource();

  return (
    <Alert variant={ok ? "default" : "destructive"} className="mb-4">
      <AlertTitle>Diagnóstico da conexão</AlertTitle>
      <AlertDescription className="space-y-1">
        <div>
          Fonte da config: <strong>{source}</strong>
          {source === "env" ? " (Conectado via env)" : " (não configurado)"}
        </div>
        {source !== "env" && (
          <div>
            Ação: configure <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> em
            Secrets e recarregue o preview.
          </div>
        )}
        <div>
          VITE_SUPABASE_URL: {url ? maskUrl(url) : "(vazio)"} (rawLen={rawUrl.length}, trimmedLen=
          {url.length})
        </div>
        <div>
          VITE_SUPABASE_ANON_KEY: {anon ? `presente (len=${anon.length})` : "(vazio)"} (rawLen=
          {rawAnon.length})
        </div>
        {anonHasNewlines && (
          <div>
            Aviso: a anon key contém quebras de linha (\\n/\\r). Re-salve a secret em uma única linha.
          </div>
        )}
        <div>getSupabaseClient(): {ok ? "OK" : "null"}</div>
        {!!schemaHint && <div>Schema detectado: {schemaHint}</div>}
      </AlertDescription>
    </Alert>
  );
}
