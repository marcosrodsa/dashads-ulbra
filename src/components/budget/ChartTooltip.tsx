import { format } from "date-fns";
import { TooltipProps } from "recharts";

function brl(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function ChartTooltip({ active, payload, label }: TooltipProps<any, any>) {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[150px]">
                <p className="font-medium text-sm mb-1 text-foreground/80">
                    {label instanceof Date ? format(label, "dd/MM/yyyy") : label}
                </p>
                <div className="flex flex-col gap-1">
                    {payload.map((entry, index) => {
                        // Se a cor do gráfico for o cinza claro (#cbd5e1), usamos texto escuro (#334155)
                        // Se for Roxo (primary), mantemos o Roxo.
                        const isLightColor = entry.color === "#cbd5e1" || entry.stroke === "#cbd5e1" || entry.fill === "#cbd5e1";
                        const textColor = isLightColor ? "#334155" : (entry.color ?? "inherit");

                        return (
                            <div key={index} className="flex items-center justify-between gap-4 text-sm">
                                <span style={{ color: textColor }}>
                                    {entry.name}:
                                </span>
                                <span style={{ color: textColor, fontWeight: 500 }}>
                                    {brl(Number(entry.value))}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return null;
}
