import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { safeNumber } from "@/lib/format";

export type WeeklyPacingMatrixRow = {
  data?: string;
  semana_label?: string;
  unidade?: string;
  orcamento_semanal?: unknown;
  gasto_real?: unknown;
};

function adherencePct(spent: number, budget: number) {
  if (budget <= 0) return spent > 0 ? Infinity : null;
  return (spent / budget) * 100;
}

function badgeFor(budget: number, spent: number) {
  if (budget <= 0 && spent <= 0) {
    return { kind: "DASH" as const };
  }

  if (budget <= 0 && spent > 0) {
    return { kind: "UNPLANNED" as const, label: "N/A" };
  }

  const pct = adherencePct(spent, budget)!;
  const label = `${Math.round(pct)}%`;

  if (pct > 105) return { kind: "OVER" as const, label };
  if (pct < 90) return { kind: "UNDER" as const, label };
  return { kind: "OK" as const, label };
}

function cellBadgeClass(kind: ReturnType<typeof badgeFor>["kind"]) {
  if (kind === "UNDER") return "bg-warning text-warning-foreground";
  if (kind === "OK") return "bg-success text-success-foreground";
  if (kind === "UNPLANNED") return "bg-unplanned text-unplanned-foreground";
  return undefined;
}

function Cell(props: {
  budget: number;
  spent: number;
  moneyClassBySign: (value: number) => string;
  formatBRL: (value: number) => string;
}) {
  const { budget, spent, moneyClassBySign, formatBRL } = props;
  const b = badgeFor(budget, spent);
  const variance = budget - spent;

  if (b.kind === "DASH") return <span className="text-muted-foreground">-</span>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex justify-center">
          <Badge variant={b.kind === "OVER" ? "destructive" : "default"} className={cellBadgeClass(b.kind)}>
            {b.label}
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Budget</span>
            <span className="tabular-nums">{formatBRL(budget)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Realizado</span>
            <span className="tabular-nums">{formatBRL(spent)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Variância</span>
            <span className={"tabular-nums " + moneyClassBySign(variance)}>{formatBRL(variance)}</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function WeeklyPacingMatrix(props: {
  data: WeeklyPacingMatrixRow[];
  moneyClassBySign: (value: number) => string;
  formatBRL?: (value: number) => string;
  className?: string;
}) {
  const { data, moneyClassBySign, formatBRL, className } = props;
  const formatMoney = formatBRL ?? ((v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v));

  const model = useMemo(() => {
    const weekMinDate = new Map<string, string>();
    const byUnit = new Map<string, Map<string, { budget: number; spent: number }>>();

    for (const r of data ?? []) {
      const unidade = String(r?.unidade ?? "").trim() || "(Sem unidade)";
      const weekLabel = String(r?.semana_label ?? "").trim() || "(Sem semana)";
      const dateKey = String(r?.data ?? "");

      const budget = safeNumber(r?.orcamento_semanal);
      const spent = safeNumber(r?.gasto_real);

      const prevMin = weekMinDate.get(weekLabel);
      if (!prevMin || (dateKey && dateKey < prevMin)) weekMinDate.set(weekLabel, dateKey);

      if (!byUnit.has(unidade)) byUnit.set(unidade, new Map());
      const map = byUnit.get(unidade)!;
      const prev = map.get(weekLabel) ?? { budget: 0, spent: 0 };
      map.set(weekLabel, { budget: prev.budget + budget, spent: prev.spent + spent });
    }

    const weeks = Array.from(weekMinDate.entries())
      .map(([label, sortKey]) => ({ label, sortKey }))
      .sort((a, b) => (a.sortKey || a.label).localeCompare(b.sortKey || b.label, "pt-BR"));

    const units = Array.from(byUnit.entries()).map(([unidade, weekMap]) => {
      let monthBudget = 0;
      let monthSpent = 0;

      for (const { budget, spent } of weekMap.values()) {
        monthBudget += budget;
        monthSpent += spent;
      }

      return {
        unidade,
        weekMap,
        monthBudget,
        monthSpent,
        deviation: monthSpent - monthBudget,
      };
    });

    // Primary: overspending (deviation > 0) first, bigger deviation first
    // Secondary: alphabetical
    units.sort((a, b) => {
      const aOver = a.deviation > 0 ? 1 : 0;
      const bOver = b.deviation > 0 ? 1 : 0;
      if (aOver !== bOver) return bOver - aOver;
      if (a.deviation !== b.deviation) return b.deviation - a.deviation;
      return a.unidade.localeCompare(b.unidade, "pt-BR");
    });

    return { weeks, units };
  }, [data]);

  if (!data?.length) {
    return <p className={"text-sm text-muted-foreground " + (className ?? "")}>Sem dados para os filtros selecionados.</p>;
  }

  return (
    <TooltipProvider>
      <div className={className}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-20 bg-background font-semibold">Unidade</TableHead>
              {model.weeks.map((w) => (
                <TableHead key={w.label} className="text-center">
                  {w.label}
                </TableHead>
              ))}
              <TableHead className="text-center">Total do mês</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {model.units.map((u) => (
              <TableRow key={u.unidade}>
                <TableCell className="sticky left-0 z-20 bg-background font-semibold">{u.unidade}</TableCell>

                {model.weeks.map((w) => {
                  const cell = u.weekMap.get(w.label) ?? { budget: 0, spent: 0 };
                  return (
                    <TableCell key={u.unidade + "__" + w.label} className="text-center">
                      <Cell budget={cell.budget} spent={cell.spent} moneyClassBySign={moneyClassBySign} formatBRL={formatMoney} />
                    </TableCell>
                  );
                })}

                <TableCell className="text-center">
                  <Cell
                    budget={u.monthBudget}
                    spent={u.monthSpent}
                    moneyClassBySign={moneyClassBySign}
                    formatBRL={formatMoney}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}

