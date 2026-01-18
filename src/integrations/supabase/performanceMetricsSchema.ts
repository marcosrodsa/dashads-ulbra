import type { SupabaseClient } from "@supabase/supabase-js";

const TABLE = "fact_ads_performance_daily" as const;

export type PerformanceMetricColumns = {
  spendCol: string;
  platformCol: string | null;
  impressionsCol: string | null;
  clicksCol: string | null;
  conversionsCol: string | null;
};

let _cached: PerformanceMetricColumns | null = null;

function isMissingColumnError(message?: string) {
  const m = (message ?? "").toLowerCase();
  return m.includes("does not exist") && m.includes("column");
}

async function firstWorkingColumn(client: SupabaseClient, candidates: string[]): Promise<string> {
  for (const col of candidates) {
    const { error } = await client.from(TABLE).select(col).limit(1);
    if (!error) return col;
    if (isMissingColumnError((error as any).message)) continue;
    throw error;
  }

  throw new Error(
    `Não consegui detectar colunas na tabela ${TABLE}. Testados: ${candidates.join(", ")}. ` +
      `Confirme o nome da coluna de gasto (spend/cost) e me diga qual é.`
  );
}

async function firstOptionalWorkingColumn(
  client: SupabaseClient,
  candidates: string[]
): Promise<string | null> {
  for (const col of candidates) {
    const { error } = await client.from(TABLE).select(col).limit(1);
    if (!error) return col;
    if (isMissingColumnError((error as any).message)) continue;
    // Outros erros: propagamos
    throw error;
  }
  return null;
}

/**
 * Detecta automaticamente colunas de métricas.
 * - spendCol é obrigatório (usado em /budget e /performance)
 * - as demais são opcionais (gráficos degradam graciosamente quando ausentes)
 */
export async function resolvePerformanceMetricColumns(
  client: SupabaseClient
): Promise<PerformanceMetricColumns> {
  if (_cached) return _cached;

  const spendCol = await firstWorkingColumn(client, [
    "spend",
    "cost",
    "amount_spent",
    "ad_spend",
    "valor",
  ]);

  const platformCol = await firstOptionalWorkingColumn(client, [
    "platform",
    "plataforma",
    "channel",
    "media",
    "source",
    "origin",
    "traffic_source",
  ]);

  const impressionsCol = await firstOptionalWorkingColumn(client, [
    "impressions",
    "imp",
    "views",
  ]);

  const clicksCol = await firstOptionalWorkingColumn(client, [
    "clicks",
    "link_clicks",
    "outbound_clicks",
    "all_clicks",
  ]);

  const conversionsCol = await firstOptionalWorkingColumn(client, [
    "conversions",
    "leads",
    "lead",
    "purchases",
    "purchase",
    "results",
  ]);

  _cached = { spendCol, platformCol, impressionsCol, clicksCol, conversionsCol };
  return _cached;
}
