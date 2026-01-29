import type { SupabaseClient } from "@supabase/supabase-js";

const TABLE = "fact_ads_performance_daily" as const;

export type PerformanceDailyColumns = {
  dateCol: string;
  businessUnitCol: string;
  courseCol: string;
  campaignIdCol: string;
};

let _cached: PerformanceDailyColumns | null = null;

function isMissingColumnError(message?: string) {
  const m = (message ?? "").toLowerCase();
  return m.includes("does not exist") && m.includes("column");
}

async function firstWorkingColumn(client: SupabaseClient, candidates: string[]): Promise<string> {
  for (const col of candidates) {
    const { error } = await client.from(TABLE).select(col).limit(1);
    if (!error) return col;
    if (isMissingColumnError((error as any).message)) continue;
    // Qualquer outro erro (RLS, tabela inexistente, etc.) deve aparecer para o usuário.
    throw error;
  }

  throw new Error(
    `Não consegui detectar colunas na tabela ${TABLE}. Testados: ${candidates.join(", ")}. ` +
    `Confirme os nomes das colunas (data, unidade, curso) e me diga quais são.`
  );
}

/**
 * Detecta automaticamente os nomes das colunas na fact_ads_performance_daily,
 * para evitar quebra quando o schema tiver nomes ligeiramente diferentes.
 */
export async function resolvePerformanceDailyColumns(
  client: SupabaseClient
): Promise<PerformanceDailyColumns> {
  if (_cached) return _cached;

  const dateCol = await firstWorkingColumn(client, [
    "date",
    "day",
    "dt",
    "data",
    "performance_date",
    "report_date",
    "event_date",
    "created_at",
  ]);

  const businessUnitCol = await firstWorkingColumn(client, [
    // "Unidade" (no seu caso, campanha)
    "campaign_name",
    "campaign", // alguns exports usam "campaign"

    // fallbacks comuns
    "account_name",
    "entity_name",

    // nomes mais "tradicionais"
    "business_unit",
    "businessunit",
    "businessUnit",
    "unidade",
    "unit",
    "bu",
    "location", // às vezes usam location como unidade
  ]);

  const courseCol = await firstWorkingColumn(client, [
    // "Curso" (no seu caso, também campanha)
    "campaign_name",
    "campaign",

    // fallbacks comuns
    "entity_name",
    "account_name",

    // nomes mais "tradicionais"
    "course",
    "course_name",
    "coursename",
    "curso",
    "product",
    "offer",
  ]);

  const campaignIdCol = await firstWorkingColumn(client, [
    "campaign_id",
    "id",
    "external_id",
    "campaignid",
  ]);

  _cached = { dateCol, businessUnitCol, courseCol, campaignIdCol };
  return _cached;
}
