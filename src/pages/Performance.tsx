import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFilters } from "@/contexts/filters-context";

export default function PerformancePage() {
  const { filters } = useFilters();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Inteligência Tática</h1>
        <p className="text-sm text-muted-foreground">Análise de eficiência e comportamento ao longo do mês.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Gráficos de performance">
        <Card>
          <CardHeader>
            <CardTitle>Volume vs Qualidade</CardTitle>
            <CardDescription>Leads por dia da semana vs taxa de conversão.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid h-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
              (dual-axis chart será conectado aos dados)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Investimento vs CPA</CardTitle>
            <CardDescription>Scatter plot por curso/unidade para achar quadrante problema.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid h-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
              (scatter plot será conectado aos dados)
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
