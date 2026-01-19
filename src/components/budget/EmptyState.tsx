import * as React from "react";
import { Database, AlertCircle, Settings } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateType = "no-data" | "error" | "not-configured";

interface EmptyStateProps {
    type: EmptyStateType;
    title?: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

const icons: Record<EmptyStateType, React.ElementType> = {
    "no-data": Database,
    "error": AlertCircle,
    "not-configured": Settings,
};

const defaultTitles: Record<EmptyStateType, string> = {
    "no-data": "Nenhum dado encontrado",
    "error": "Erro ao carregar dados",
    "not-configured": "Configuração necessária",
};

const defaultDescriptions: Record<EmptyStateType, string> = {
    "no-data": "Não há dados disponíveis para os filtros selecionados. Tente ajustar o período ou remover alguns filtros.",
    "error": "Ocorreu um erro ao carregar os dados. Verifique sua conexão e tente novamente.",
    "not-configured": "A conexão com o banco de dados não está configurada. Abra ?debug=1 na URL para configurar o Supabase.",
};

const iconColors: Record<EmptyStateType, string> = {
    "no-data": "text-muted-foreground",
    "error": "text-red-500",
    "not-configured": "text-amber-500",
};

export function EmptyState({
    type,
    title,
    description,
    action,
    className
}: EmptyStateProps) {
    const Icon = icons[type];
    const displayTitle = title ?? defaultTitles[type];
    const displayDescription = description ?? defaultDescriptions[type];

    return (
        <Card className={cn("border-dashed", className)}>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className={cn("mb-4 rounded-full bg-muted p-4", iconColors[type])}>
                    <Icon className="h-8 w-8" />
                </div>
                <CardTitle className="mb-2 text-lg">{displayTitle}</CardTitle>
                <CardDescription className="max-w-sm mb-4">{displayDescription}</CardDescription>
                {action && (
                    <Button variant="outline" onClick={action.onClick}>
                        {action.label}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Empty state específico para quando não há conexão com Supabase configurada
 */
export function SupabaseNotConfigured({ className }: { className?: string }) {
    const openDebug = React.useCallback(() => {
        const url = new URL(window.location.href);
        url.searchParams.set("debug", "1");
        window.location.href = url.toString();
    }, []);

    return (
        <EmptyState
            type="not-configured"
            title="Supabase não configurado"
            description="Para usar o dashboard, configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY, ou use o modo debug para inserir manualmente."
            action={{
                label: "Abrir configuração",
                onClick: openDebug,
            }}
            className={className}
        />
    );
}

/**
 * Empty state para quando os filtros não retornam dados
 */
export function NoDataForFilters({
    onClearFilters,
    className
}: {
    onClearFilters?: () => void;
    className?: string;
}) {
    return (
        <EmptyState
            type="no-data"
            title="Sem dados para o período"
            description="Os filtros atuais não retornaram nenhum resultado. Tente ajustar o mês, unidade ou plataforma selecionados."
            action={onClearFilters ? {
                label: "Limpar filtros",
                onClick: onClearFilters,
            } : undefined}
            className={className}
        />
    );
}
