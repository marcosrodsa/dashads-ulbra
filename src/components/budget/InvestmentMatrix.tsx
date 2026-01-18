import * as React from "react";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type InvestmentMatrixCourseRow = {
  course: string;
  budget: number;
  spend: number;
};

export type InvestmentMatrixPlatformGroup = {
  platform: string;
  budget: number;
  spend: number;
  courses: InvestmentMatrixCourseRow[];
};

export type InvestmentMatrixUnitGroup = {
  unit: string;
  budget: number;
  spend: number;
  platforms: InvestmentMatrixPlatformGroup[];
};

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function pct(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(v);
}

function getStatus(budget: number, spend: number) {
  if (budget <= 0 && spend > 0) return "Sem budget";
  if (budget > 0 && spend > budget) return "Estouro";
  return "OK";
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "Estouro") return "destructive";
  if (status === "Sem budget") return "secondary";
  return "outline";
}

export function InvestmentMatrix({ data }: { data: InvestmentMatrixUnitGroup[] }) {
  const [openUnit, setOpenUnit] = React.useState<string | null>(null);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unidade</TableHead>
            <TableHead className="text-right">Budget</TableHead>
            <TableHead className="text-right">Realizado</TableHead>
            <TableHead className="text-right">Utilização</TableHead>
            <TableHead className="text-right">Var R$</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((u) => {
            const isOpen = openUnit === u.unit;
            const utilization = u.budget > 0 ? u.spend / u.budget : null;
            const variance = u.budget > 0 ? u.budget - u.spend : null;
            const status = getStatus(u.budget, u.spend);

            return (
              <React.Fragment key={u.unit}>
                <TableRow className={cn(u.budget === 0 && u.spend > 0 ? "bg-muted/50" : undefined)}>
                  <TableCell className="max-w-[420px] truncate" title={u.unit}>
                    <button
                      type="button"
                      onClick={() => setOpenUnit((prev) => (prev === u.unit ? null : u.unit))}
                      className="flex w-full items-center gap-2 text-left"
                      aria-expanded={isOpen}
                      aria-controls={`unit-${u.unit}`}
                    >
                      <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform", isOpen ? "rotate-90" : "rotate-0")} />
                      <span className="truncate">{u.unit}</span>
                    </button>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{brl(u.budget)}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(u.spend)}</TableCell>
                  <TableCell className="text-right tabular-nums">{utilization != null ? pct(utilization) : "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{variance != null ? brl(variance) : "-"}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={statusVariant(status)}>{status}</Badge>
                  </TableCell>
                </TableRow>

                {isOpen ? (
                  <TableRow id={`unit-${u.unit}`}>
                    <TableCell colSpan={6} className="p-0">
                      <div className="space-y-4 p-4">
                        {u.platforms.map((p) => {
                          const util = p.budget > 0 ? p.spend / p.budget : null;
                          const varRs = p.budget > 0 ? p.budget - p.spend : null;

                          return (
                            <section key={p.platform} className="space-y-2">
                              <header className="flex flex-wrap items-baseline justify-between gap-2">
                                <div className="text-sm font-medium">{p.platform}</div>
                                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                  <span className="tabular-nums">Budget: {brl(p.budget)}</span>
                                  <span className="tabular-nums">Real: {brl(p.spend)}</span>
                                  <span className="tabular-nums">Utilização: {util != null ? pct(util) : "-"}</span>
                                  <span className="tabular-nums">Var: {varRs != null ? brl(varRs) : "-"}</span>
                                </div>
                              </header>

                              <div className="rounded-md border bg-muted/10">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Curso</TableHead>
                                      <TableHead className="text-right">Budget</TableHead>
                                      <TableHead className="text-right">Realizado</TableHead>
                                      <TableHead className="text-right">Utilização</TableHead>
                                      <TableHead className="text-right">Var R$</TableHead>
                                      <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {p.courses.map((c) => {
                                      const cUtil = c.budget > 0 ? c.spend / c.budget : null;
                                      const cVar = c.budget > 0 ? c.budget - c.spend : null;
                                      const cStatus = getStatus(c.budget, c.spend);

                                      return (
                                        <TableRow key={`${p.platform}::${c.course}`}>
                                          <TableCell className="max-w-[420px] truncate" title={c.course}>
                                            {c.course}
                                          </TableCell>
                                          <TableCell className="text-right tabular-nums">{brl(c.budget)}</TableCell>
                                          <TableCell className="text-right tabular-nums">{brl(c.spend)}</TableCell>
                                          <TableCell className="text-right tabular-nums">{cUtil != null ? pct(cUtil) : "-"}</TableCell>
                                          <TableCell className="text-right tabular-nums">{cVar != null ? brl(cVar) : "-"}</TableCell>
                                          <TableCell className="text-right">
                                            <Badge variant={statusVariant(cStatus)}>{cStatus}</Badge>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </section>
                          );
                        })}

                        {u.platforms.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Sem dados para esta unidade.</div>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
