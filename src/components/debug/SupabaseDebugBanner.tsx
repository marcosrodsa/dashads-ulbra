import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { getSupabaseClient, getSupabaseConfigSource, resetSupabaseClient } from "@/integrations/supabase/client";
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
  const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  const rawAnon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
  const url = rawUrl.trim();
  const anon = rawAnon.trim();

  const lsUrl = (() => {
    if (typeof window === "undefined") return "";
    try {
      return (window.localStorage.getItem("SUPABASE_URL_OVERRIDE") ?? "").trim();
    } catch {
      return "";
    }
  })();
  const lsAnon = (() => {
    if (typeof window === "undefined") return "";
    try {
      return (window.localStorage.getItem("SUPABASE_ANON_KEY_OVERRIDE") ?? "").trim();
    } catch {
      return "";
    }
  })();
  const hasOverride = !!lsUrl && !!lsAnon;

  const client = React.useMemo(() => getSupabaseClient(), []);

  const source = getSupabaseConfigSource();
  const anonHasNewlines = /[\r\n]/.test(rawAnon);

  const forcedByQuery = (() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get("debug");
    return sp.has("debug") && (v === null || v === "" || v === "1" || v === "true");
  })();

  const viteMode = import.meta.env.MODE;
  const viteDev = import.meta.env.DEV;
  const viteProd = import.meta.env.PROD;
  const viteKeys = React.useMemo(
    () => Object.keys(import.meta.env).filter((k) => k.startsWith("VITE_"))?.sort(),
    []
  );
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Aparece em DEV, quando o usuário força via ?debug=1, ou quando a config está quebrada.
  const enabled = viteDev || forcedByQuery || source === "none" || !client;
  if (!enabled) return null;

  const ok = !!client;
  const buildStamp = React.useMemo(() => new Date().toISOString(), []);

  const [manualUrl, setManualUrl] = React.useState<string>(lsUrl || url);
  const [manualAnon, setManualAnon] = React.useState<string>(lsAnon || anon);

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

  async function testConnection() {
    if (!client) return;

    setIsTesting(true);
    setTestOutput("");

    const tryTables = ["fact_ads_performance_daily", "fact_ads_budget"] as const;

    try {
      for (const table of tryTables) {
        // "Select 1" não existe no cliente sem uma função SQL/RPC.
        // Esta query mínima testa: rede + URL/key + PostgREST + existência da tabela + RLS.
        const { error, count } = await client.from(table).select("*", { head: true, count: "exact" }).limit(1);

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
          [
            `Teste de conexão: FALHOU`,
            `Tabela testada: ${table}`,
            "---",
            formatted,
            "---",
            "Dicas rápidas:",
            "- Erro de rede (ex: Failed to fetch): confira a URL e bloqueios de rede.",
            "- 401/403: anon key inválida ou RLS bloqueando SELECT.",
            "- 'does not exist': tabela/coluna diferente do esperado.",
          ].join("\n")
        );
        return;
      }
    } catch (e) {
      setTestOutput([`Teste de conexão: EXCEÇÃO`, "---", formatSupabaseError(e)].join("\n"));
    } finally {
      setIsTesting(false);
    }
  }

  async function copyDiagnostic() {
    const payload = [
      `Build: ${buildStamp}`,
      `Origin: ${origin}`,
      `Vite: mode=${viteMode}, DEV=${String(viteDev)}, PROD=${String(viteProd)}`,
      `VITE_* keys (${viteKeys.length}): ${viteKeys.join(", ") || "(nenhuma)"}`,
      `Fonte da config: ${source}`,
      `Override localStorage: ${hasOverride ? "ATIVO" : "(não)"}`,
      hasOverride ? `Override URL: ${maskUrl(lsUrl)}` : null,
      `VITE_SUPABASE_URL (env): ${url ? maskUrl(url) : "(vazio)"} (rawLen=${rawUrl.length}, trimmedLen=${url.length})`,
      `VITE_SUPABASE_ANON_KEY (env): ${anon ? `presente (len=${anon.length})` : "(vazio)"} (rawLen=${rawAnon.length})`,
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

  async function saveManualConfig() {
    if (typeof window === "undefined") return;
    const nextUrl = manualUrl.trim();
    const nextAnon = manualAnon.trim();
    if (!nextUrl || !nextAnon) {
      toast.error("Preencha URL e anon key");
      return;
    }

    try {
      window.localStorage.setItem("SUPABASE_URL_OVERRIDE", nextUrl);
      window.localStorage.setItem("SUPABASE_ANON_KEY_OVERRIDE", nextAnon);
      resetSupabaseClient();
      toast.success("Config salva. Recarregando…");
      window.location.reload();
    } catch {
      toast.error("Não consegui salvar no localStorage");
    }
  }

  async function clearManualConfig() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem("SUPABASE_URL_OVERRIDE");
      window.localStorage.removeItem("SUPABASE_ANON_KEY_OVERRIDE");
      resetSupabaseClient();
      toast.success("Override removido. Recarregando…");
      window.location.reload();
    } catch {
      toast.error("Não consegui limpar o localStorage");
    }
  }

  return (
    <Alert variant={ok ? "default" : "destructive"} className="mb-4">
      <AlertTitle>Diagnóstico da conexão</AlertTitle>
      <AlertDescription className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Build: <span className="font-mono">{buildStamp}</span>
          {forcedByQuery ? " • debug=1" : null}
          {viteDev ? " • DEV" : null}
          {viteProd ? " • PROD" : null}
          {viteMode ? ` • mode=${viteMode}` : null}
        </div>

        <div className="text-xs text-muted-foreground">
          Origin: <span className="font-mono">{origin}</span>
        </div>

        <div className="text-xs text-muted-foreground">
          VITE_* detectadas ({viteKeys.length}): <span className="font-mono">{viteKeys.join(", ") || "(nenhuma)"}</span>
        </div>

        <div>
          Fonte da config: <strong>{source}</strong>
          {source === "env" ? " (Conectado via env)" : source === "override" ? " (Override via localStorage)" : " (não configurado)"}
        </div>

        {source !== "env" && (
          <div className="space-y-2">
            <div>
              Como não existe a seção <strong>Secrets</strong> aqui, você pode usar um <strong>override local</strong> (salvo no
              browser) para destravar o app.
            </div>

            <div className="grid gap-2 rounded-md border border-input bg-muted p-3">
              <div className="grid gap-1">
                <Label htmlFor="sb-url">URL</Label>
                <Input
                  id="sb-url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="sb-anon">Anon key</Label>
                <Input
                  id="sb-anon"
                  value={manualAnon}
                  onChange={(e) => setManualAnon(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={saveManualConfig}>
                  Salvar override
                </Button>
                <Button variant="outline" size="sm" onClick={clearManualConfig} disabled={!hasOverride}>
                  Remover override
                </Button>
                <div className="text-xs text-muted-foreground">
                  Status: {hasOverride ? "ATIVO" : "(inativo)"}
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          VITE_SUPABASE_URL (env): {url ? maskUrl(url) : "(vazio)"} (rawLen={rawUrl.length}, trimmedLen={url.length})
        </div>
        <div>
          VITE_SUPABASE_ANON_KEY (env): {anon ? `presente (len=${anon.length})` : "(vazio)"} (rawLen={rawAnon.length})
        </div>
        {anonHasNewlines && (
          <div>Aviso: a anon key contém quebras de linha (\\n/\\r). Re-salve a key em uma única linha.</div>
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
