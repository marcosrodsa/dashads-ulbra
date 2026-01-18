import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
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

function isMissingTableOrRelation(message?: string) {
  const m = (message ?? "").toLowerCase();
  return (m.includes("does not exist") && (m.includes("relation") || m.includes("table"))) ||
    m.includes("relation not found") ||
    m.includes("table not found");
}

function formatSupabaseError(err: unknown) {
  if (!err) return "(sem detalhes)";

  // Supabase/PostgREST errors tend to be plain objects
  if (typeof err === "object") {
    const anyErr = err as any;
    const parts: string[] = [];

    const name = anyErr?.name;
    const message = anyErr?.message;
    const status = anyErr?.status;
    const code = anyErr?.code;
    const details = anyErr?.details;
    const hint = anyErr?.hint;

    if (name) parts.push(`name: ${String(name)}`);
    if (message) parts.push(`message: ${String(message)}`);
    if (typeof status !== "undefined") parts.push(`status: ${String(status)}`);
    if (code) parts.push(`code: ${String(code)}`);
    if (details) parts.push(`details: ${String(details)}`);
    if (hint) parts.push(`hint: ${String(hint)}`);

    // In DEV, stack is often helpful
    if (anyErr instanceof Error && anyErr.stack) parts.push(`stack:\n${anyErr.stack}`);

    if (parts.length) return parts.join("\n");
  }

  try {
    return JSON.stringify(err, null, 2);
  } catch {
    return String(err);
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
  const [isTesting, setIsTesting] = React.useState(false);
  const [testOutput, setTestOutput] = React.useState<string>("");

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

  async function testConnection() {
    if (!client) return;

    setIsTesting(true);
    setTestOutput("");

    const tryTables = ["fact_ads_performance_daily", "fact_ads_budget"] as const;

    try {
      for (const table of tryTables) {
        // "Select 1" não existe no cliente sem uma função SQL/RPC.
        // Esta query mínima testa: rede + URL/key + PostgREST + existência da tabela + RLS.
        const { error, count } = await client
          .from(table)
          .select("*", { head: true, count: "exact" })
          .limit(1);

        if (!error) {
          setTestOutput(
            [`Teste de conexão: OK`, `Tabela testada: ${table}`, `Count (se disponível): ${String(count)}`].join("\n")
          );
          return;
        }

        const msg = String((error as any)?.message ?? "");
        if (isMissingTableOrRelation(msg) && table !== tryTables[tryTables.length - 1]) {
          continue; // tenta a próxima tabela
        }

        const formatted = formatSupabaseError(error);
        setTestOutput(
          [`Teste de conexão: FALHOU`, `Tabela testada: ${table}`, "---", formatted,
           "---",
           "Dicas rápidas:",
           "- Erro de rede (ex: Failed to fetch): confira VITE_SUPABASE_URL e bloqueios de rede.",
           "- 401/403: anon key inválida ou RLS bloqueando SELECT.",
           "- 'does not exist': tabela/coluna diferente do esperado."]
            .join("\n")
        );
        return;
      }
    } catch (e) {
      setTestOutput(
        [`Teste de conexão: EXCEÇÃO`, "---", formatSupabaseError(e)].join("\n")
      );
    } finally {
      setIsTesting(false);
    }
  }

  async function copyDiagnostic() {
    const payload = [
      `Fonte da config: ${source}`,
      `VITE_SUPABASE_URL: ${url ? maskUrl(url) : "(vazio)"} (rawLen=${rawUrl.length}, trimmedLen=${url.length})`,
      `VITE_SUPABASE_ANON_KEY: ${anon ? `presente (len=${anon.length})` : "(vazio)"} (rawLen=${rawAnon.length})`,
      anonHasNewlines ? "Aviso: anon key contém quebras de linha" : null,
      `getSupabaseClient(): ${ok ? "OK" : "null"}`,
      schemaHint ? `Schema detectado: ${schemaHint}` : null,
      testOutput ? "---\n" + testOutput : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Diagnóstico copiado");
    } catch {
      toast.error("Não consegui copiar automaticamente. Copie manualmente no bloco abaixo.");
    }
  }

  return (

    <Alert variant={ok ? "default" : "destructive"} className="mb-4">
      <AlertTitle>Diagnóstico da conexão</AlertTitle>
      <AlertDescription className="space-y-2">
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
          VITE_SUPABASE_URL: {url ? maskUrl(url) : "(vazio)"} (rawLen={rawUrl.length}, trimmedLen={url.length})
        </div>
        <div>
          VITE_SUPABASE_ANON_KEY: {anon ? `presente (len=${anon.length})` : "(vazio)"} (rawLen={rawAnon.length})
        </div>
        {anonHasNewlines && (
          <div>
            Aviso: a anon key contém quebras de linha (\\n/\\r). Re-salve a secret em uma única linha.
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div>getSupabaseClient(): {ok ? "OK" : "null"}</div>
          <Button variant="outline" size="sm" onClick={testConnection} disabled={!ok || isTesting}>
            {isTesting ? "Testando…" : "Testar conexão"}
          </Button>
          <Button variant="outline" size="sm" onClick={copyDiagnostic}>
            Copiar diagnóstico
          </Button>
        </div>
        {!!testOutput && (
          <pre className="whitespace-pre-wrap break-words rounded-md border border-input bg-muted p-2 text-xs text-foreground">
            {testOutput}
          </pre>
        )}
        {!!schemaHint && <div>Schema detectado: {schemaHint}</div>}
      </AlertDescription>
    </Alert>
  );
}
