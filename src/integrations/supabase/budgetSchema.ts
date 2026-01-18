import type { SupabaseClient } from "@supabase/supabase-js";

const TABLE = "fact_ads_budget" as const;

export type BudgetColumns = {
  monthCol: string;
  plannedCol: string;
  platformCol: string | null;
  unitCol: string | null;
};

let _cached: BudgetColumns | null = null;

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
      `Confirme os nomes (mês/data e valor planejado) e me diga quais são.`
  );
}

async function firstOptionalWorkingColumn(
  client: SupabaseClient,
  candidates: string[]
): Promise<string | null> {
  try {
    return await firstWorkingColumn(client, candidates);
  } catch (e: any) {
    // Se falhou por não achar nenhuma candidata, tratamos como "não existe".
    const msg = String(e?.message ?? "");
    if (msg.includes(`tabela ${TABLE}`) || msg.includes("Não consegui detectar")) return null;
    // Se for erro de permissão/tabela inexistente, propagamos.
    throw e;
  }
}

/**
 * Detecta automaticamente as colunas do fact_ads_budget.
 * Mantém resiliente a variações de nome (ex: month vs date, budget vs planned).
 */
export async function resolveBudgetColumns(client: SupabaseClient): Promise<BudgetColumns> {
  if (_cached) return _cached;

  const monthCol = await firstWorkingColumn(client, [
    "month",
    "ref_month",
    "competence",
    "competencia",
    "date",
    "dt",
    "data",
    "month_date",
  ]);

  const plannedCol = await firstWorkingColumn(client, [
    "budget",
    "planned_budget",
    "budget_planned",
    "planned",
    "amount",
    "value",
    "valor",
    "planned_value",
  ]);

  // Estas colunas podem ou não existir no seu budget (depende do granular).
  const platformCol = await firstOptionalWorkingColumn(client, [
    "platform",
    "channel",
    "media",
    "source",
  ]);

  const unitCol = await firstOptionalWorkingColumn(client, [
    "campaign_name",
    "campaign",
    "entity_name",
    "account_name",
    "business_unit",
    "unidade",
  ]);

  _cached = { monthCol, plannedCol, platformCol, unitCol };
  return _cached;
}
