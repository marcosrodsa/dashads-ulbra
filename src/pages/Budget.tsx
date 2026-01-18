import * as React from "react";
import { useFilters } from "@/contexts/filters-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BudgetPage() {
  const { filters } = useFilters();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Controle de Budget</h1>
        <p className="text-sm text-muted-foreground">
          Visão executiva de orçado vs realizado (mês, unidade, curso e plataforma).
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="KPIs">
        <KpiCard title="Budget Total" value="-" hint="Soma do budget planejado" />
        <KpiCard title="Forecast" value="-" hint="Projeção de fechamento" />
        <KpiCard title="Net Variance" value="-" hint="Economia vs forecast" />
        <KpiCard title="Pacing Global" value="-" hint="% gasto / budget" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Gráficos">
        <Card>
          <CardHeader>
            <CardTitle>Progresso de Budget por Unidade</CardTitle>
            <CardDescription>
              Barra de fundo = budget; barra sobreposta = gasto; linha = ideal no dia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid h-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
              (gráfico será conectado aos dados)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pacing Diário Acumulado</CardTitle>
            <CardDescription>Linha ideal vs curva real acumulada.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid h-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
              (gráfico será conectado aos dados)
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Tabela matriz">
        <Card>
          <CardHeader>
            <CardTitle>Matriz de Investimento</CardTitle>
            <CardDescription>Ordenada por maior budget; sinaliza inconsistências (budget=0 e spend&gt;0).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid h-56 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
              (tabela será conectada aos dados)
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="text-xs text-muted-foreground">
        Filtros ativos: {JSON.stringify({ ...filters, month: filters.month.toISOString().slice(0, 10) })}
      </footer>
    </div>
  );
}

function KpiCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {hint ? <CardDescription>{hint}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
