import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSupabaseClient } from "@/integrations/supabase/client";

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

  if (!enabled) return null;

  const ok = !!client;
  const anonHasNewlines = /[\r\n]/.test(rawAnon);

  return (
    <Alert variant={ok ? "default" : "destructive"} className="mb-4">
      <AlertTitle>Diagnóstico da conexão</AlertTitle>
      <AlertDescription className="space-y-1">
        <div>
          VITE_SUPABASE_URL: {url ? maskUrl(url) : "(vazio)"} (rawLen={rawUrl.length},
          trimmedLen={url.length})
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
      </AlertDescription>
    </Alert>
  );
}
