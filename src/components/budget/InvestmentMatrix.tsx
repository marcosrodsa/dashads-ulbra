import * as React from "react";
import { ChevronRight, CalendarDays } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Nova hierarquia: Unidade > Curso > Plataforma
export type InvestmentMatrixPlatformRow = {
  platform: string;
  budget: number;
  spend: number;
};

export type InvestmentMatrixCourseGroup = {
  course: string;
  budget: number;
  spend: number;
  platforms: InvestmentMatrixPlatformRow[];
};

export type InvestmentMatrixUnitGroup = {
  unit: string;
  budget: number;
  spend: number;
  courses: InvestmentMatrixCourseGroup[];
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

function getUtilizationColor(utilization: number | null): string {
  if (utilization == null) return "bg-muted";
  if (utilization <= 0.9) return "bg-emerald-500";
  if (utilization <= 1.0) return "bg-amber-500";
  return "bg-red-500";
}

function UtilizationBar({ utilization, budget, spend }: { utilization: number | null; budget: number; spend: number }) {
  if (utilization == null) {
    return <span className="text-muted-foreground">-</span>;
  }

  const displayPercent = Math.min(utilization * 100, 150);
  const remaining = budget - spend;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", getUtilizationColor(utilization))}
              style={{ width: `${Math.min(displayPercent, 100)}%` }}
            />
          </div>
          <span className={cn("text-xs tabular-nums font-medium",
            utilization > 1 ? "text-red-600 dark:text-red-400" :
              utilization > 0.9 ? "text-amber-600 dark:text-amber-400" :
                "text-emerald-600 dark:text-emerald-400"
          )}>
            {pct(utilization)}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="space-y-1">
          <div>Gasto: <strong>{brl(spend)}</strong></div>
          <div>Budget: <strong>{brl(budget)}</strong></div>
          <div className={remaining >= 0 ? "text-emerald-500" : "text-red-500"}>
            {remaining >= 0 ? "Disponível" : "Excedido"}: <strong>{brl(Math.abs(remaining))}</strong>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function InvestmentMatrix({ data, onViewWeekly }: {
  data: InvestmentMatrixUnitGroup[];
  onViewWeekly?: (unit: string) => void;
}) {
  const [openUnit, setOpenUnit] = React.useState<string | null>(null);
  const [openCourses, setOpenCourses] = React.useState<Set<string>>(new Set());

  const toggleCourse = (unitCourseKey: string) => {
    setOpenCourses((prev) => {
      const next = new Set(prev);
      if (next.has(unitCourseKey)) {
        next.delete(unitCourseKey);
      } else {
        next.add(unitCourseKey);
      }
      return next;
    });
  };

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
            {onViewWeekly && <TableHead className="text-center w-[60px]">Ação</TableHead>}
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
                <TableRow
                  onClick={() => setOpenUnit((prev) => (prev === u.unit ? null : u.unit))}
                  className={cn(
                    "transition-opacity duration-200 cursor-pointer hover:bg-muted/40",
                    u.budget === 0 && u.spend > 0 ? "bg-muted/50" : undefined,
                    openUnit && openUnit !== u.unit ? "opacity-50" : undefined,
                    isOpen ? "bg-primary/5 font-medium" : undefined
                  )}
                >
                  <TableCell className="max-w-[420px] truncate" title={u.unit}>
                    <div className="flex w-full items-center gap-2 text-left">
                      <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform", isOpen ? "rotate-90" : "rotate-0")} />
                      <span className="truncate">{u.unit}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{brl(u.budget)}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(u.spend)}</TableCell>
                  <TableCell className="text-right">
                    <UtilizationBar utilization={utilization} budget={u.budget} spend={u.spend} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{variance != null ? brl(variance) : "-"}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={statusVariant(status)}>{status}</Badge>
                  </TableCell>
                  {onViewWeekly && (
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewWeekly(u.unit);
                            }}
                          >
                            <CalendarDays className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver semanas</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>

                {isOpen ? (
                  <TableRow id={`unit-${u.unit}`}>
                    <TableCell colSpan={6} className="p-0">
                      <div className="rounded-md border-l-4 border-l-primary/20 bg-muted/5 ml-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="pl-6">Curso</TableHead>
                              <TableHead className="text-right">Budget</TableHead>
                              <TableHead className="text-right">Realizado</TableHead>
                              <TableHead className="text-right">Utilização</TableHead>
                              <TableHead className="text-right">Var R$</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {u.courses.map((c) => {
                              const courseKey = `${u.unit}||${c.course}`;
                              const isCourseOpen = openCourses.has(courseKey);
                              const cUtil = c.budget > 0 ? c.spend / c.budget : null;
                              const cVar = c.budget > 0 ? c.budget - c.spend : null;
                              const cStatus = getStatus(c.budget, c.spend);

                              return (
                                <React.Fragment key={c.course}>
                                  <TableRow
                                    onClick={() => toggleCourse(courseKey)}
                                    className={cn(
                                      "transition-opacity duration-200 cursor-pointer hover:bg-muted/40",
                                      c.budget === 0 && c.spend > 0 ? "bg-muted/30" : undefined,
                                      openCourses.size > 0 && !isCourseOpen ? "opacity-50" : undefined,
                                      isCourseOpen ? "bg-secondary/10 font-medium" : undefined
                                    )}
                                  >
                                    <TableCell className="max-w-[380px] truncate pl-6" title={c.course}>
                                      <div className="flex w-full items-center gap-2 text-left">
                                        <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", isCourseOpen ? "rotate-90" : "rotate-0")} />
                                        <span className="truncate">{c.course}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{brl(c.budget)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{brl(c.spend)}</TableCell>
                                    <TableCell className="text-right">
                                      <UtilizationBar utilization={cUtil} budget={c.budget} spend={c.spend} />
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{cVar != null ? brl(cVar) : "-"}</TableCell>
                                    <TableCell className="text-right">
                                      <Badge variant={statusVariant(cStatus)}>{cStatus}</Badge>
                                    </TableCell>
                                  </TableRow>

                                  {isCourseOpen ? (
                                    <TableRow>
                                      <TableCell colSpan={6} className="p-0">
                                        <div className="rounded-md border-l-4 border-l-secondary/20 bg-muted/10 ml-10 my-1">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead className="pl-4">Plataforma</TableHead>
                                                <TableHead className="text-right">Budget</TableHead>
                                                <TableHead className="text-right">Realizado</TableHead>
                                                <TableHead className="text-right">Utilização</TableHead>
                                                <TableHead className="text-right">Var R$</TableHead>
                                                <TableHead className="text-right">Status</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {c.platforms.map((p) => {
                                                const pUtil = p.budget > 0 ? p.spend / p.budget : null;
                                                const pVar = p.budget > 0 ? p.budget - p.spend : null;
                                                const pStatus = getStatus(p.budget, p.spend);

                                                return (
                                                  <TableRow key={`${c.course}::${p.platform}`}>
                                                    <TableCell className="max-w-[340px] truncate pl-4" title={p.platform}>
                                                      {p.platform}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">{brl(p.budget)}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{brl(p.spend)}</TableCell>
                                                    <TableCell className="text-right">
                                                      <UtilizationBar utilization={pUtil} budget={p.budget} spend={p.spend} />
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">{pVar != null ? brl(pVar) : "-"}</TableCell>
                                                    <TableCell className="text-right">
                                                      <Badge variant={statusVariant(pStatus)}>{pStatus}</Badge>
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              })}
                                              {c.platforms.length === 0 ? (
                                                <TableRow>
                                                  <TableCell colSpan={6} className="text-sm text-muted-foreground text-center py-2">
                                                    Sem plataformas para este curso.
                                                  </TableCell>
                                                </TableRow>
                                              ) : null}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ) : null}
                                </React.Fragment>
                              );
                            })}
                            {u.courses.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-sm text-muted-foreground text-center py-4">
                                  Sem dados para esta unidade.
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </TableBody>
                        </Table>
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

