import * as React from "react";
import { KpiCard } from "@/components/budget/KpiCard";

export type PerformanceKpis = {
    spend: number;
    leads: number;
    clicks: number;
    impressions: number;
    filteredSpend?: number; // Spend excluding Branding/Awareness for accurate CPL
};

interface PerformanceKpiGridProps {
    data: PerformanceKpis;
}

function brl(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function number(v: number) {
    return new Intl.NumberFormat("pt-BR").format(Math.round(v));
}

function pct(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 }).format(v);
}

export function PerformanceKpiGrid({ data }: PerformanceKpiGridProps) {
    const { spend, leads, clicks, impressions, filteredSpend } = data;

    // Use filteredSpend for CPL if present, otherwise use total spend
    const cplNumerator = filteredSpend !== undefined ? filteredSpend : spend;
    const cpl = leads > 0 ? cplNumerator / leads : 0;

    // CPC and CTR usually consider Total Spend/Clicks unless specified otherwise, 
    // but typically CPC includes branding clicks too. Keeping as is for now.
    const cpc = clicks > 0 ? spend / clicks : 0;
    const ctr = impressions > 0 ? clicks / impressions : 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <KpiCard
                title="Investimento"
                value={brl(spend)}
                tooltip="Valor total investido no período selecionado."
            />
            <KpiCard
                title="Leads"
                value={number(leads)}
                tooltip="Quantidade total de conversões."
            />
            <KpiCard
                title="CPL Médio"
                value={brl(cpl)}
                tooltip="Custo por Lead (Investimento / Leads)."
            // Could add status logic here later if target CPL provided
            />
            <KpiCard
                title="CPC Médio"
                value={brl(cpc)}
                tooltip="Custo por Clique (Investimento / Cliques)."
            />
            <KpiCard
                title="CTR Médio"
                value={pct(ctr)}
                tooltip="Taxa de Cliques (Cliques / Impressões)."
            />
        </div>
    );
}
