// Supabase Edge Function: seed-knowledge
// DESCRIÇÃO: "Professor" que ensina a Gaia sobre o projeto (Injeta conhecimentos no Vector DB)
// EXECUÇÃO: Rode via n8n ou cURL apenas uma vez (ou quando atualizar regras de negócio)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- CORPO DE CONHECIMENTO (O CÉREBRO DO ARQUITETO/PM) ---
// Extraído da análise de Budget.tsx, Performance.tsx e Views SQL
const KNOWLEDGE_CORPUS = [
    // 1. CONCEITOS FINANCEIROS (BUDGET)
    {
        category: "KPI Definition",
        content: "O Pacing é um indicador de velocidade de gasto do orçamento. Fórmula: (Gasto Real / Orçamento Planejado). Se > 100%, estamos gastando mais rápido que o previsto (Overspend). Se < 100%, estamos economizando (Underspend). Ideal é ficar próximo de 100%.",
        metadata: { source: "Budget.tsx", dashboard: "Controle de Budget", type: "formula" }
    },
    {
        category: "Data Source",
        content: "Para consultar dados de Orçamento vs Realizado SEMANAL e POR UNIDADE, use a view `vw_dashboard_semanal_detalhado2`. Colunas importantes: `data_inicio_semana`, `unidade`, `orcamento_semanal`, `gasto_real`. Esta view já cruza as metas da planilha com o gasto do Facebook/Google.",
        metadata: { source: "SQL View", table: "vw_dashboard_semanal_detalhado2", priority: "high" }
    },
    {
        category: "Business Rule",
        content: "A Matriz de Investimento mostra o breakdown hierárquico: 1. Unidade (ex: Ulbra Canoas) -> 2. Curso (ex: Medicina). EAD é tratado como uma 'Unidade' separada globais. Unidades 'Branding' ou 'Institucional' focam em Awareness, não conversão.",
        metadata: { source: "Budget.tsx", logic: "investment_tree" }
    },

    // 2. PERFORMANCE DE CAPTAÇÃO
    {
        category: "KPI Definition",
        content: "CPL (Custo Por Lead) é o valor gasto para adquirir um lead. Fórmula: `investimento / leads`. É o principal KPI de eficiência. Varia muito por curso (Medicina tem CPL alto, EAD tem CPL baixo).",
        metadata: { source: "Performance.tsx", dashboard: "Performance", type: "formula" }
    },
    {
        category: "Data Source",
        content: "Para consultar dados DIÁRIOS de performance (Clicks, Impressões, Leads, Spend), use a view `vw_performance_diaria2`. É a fonte da verdade para gráficos de linha temporal e tabelas detalhadas. Colunas: `data_referencia`, `campaign_name`, `platform`, `investimento`, `leads`.",
        metadata: { source: "SQL View", table: "vw_performance_diaria2", priority: "high" }
    },
    {
        category: "Business Rule",
        content: "Regra de Classificação de Campanhas: 1. Se tem 'EAD' ou 'Ulbra Pop', é Unidade EAD. 2. Se tem 'Medicina', é Curso Medicina (prioridade sobre Branding). 3. Se tem 'Visitas' ou 'Institucional', é Branding. 4. O resto é classificado pela cidade (ex: 'Canoas' -> Ulbra Canoas).",
        metadata: { source: "Performance.tsx", logic: "campaign_classifier" }
    },

    // 3. ESTRUTURA TÉCNICA
    {
        category: "Dashboard View",
        content: "O gráfico 'Investimento por Estratégia' divide o budget em etapas do funil: 'Awareness' (Branding/Vídeo), 'Consideration' (Tráfego) e 'Conversion' (Captura de Leads). A maioria das campanhas de performance cai em Conversion.",
        metadata: { source: "Budget.tsx", viz: "FunnelStrategyChart" }
    },
    {
        category: "Tool Usage",
        content: "Para responder sobre 'tendência' ou 'previsão', use a ferramenta `query_global_performance`. Ela calcula a regressão linear dos últimos dias para prever o CPL da próxima semana.",
        metadata: { source: "gaia-chat", tool: "query_global_performance" }
    }
];

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // API Key do Gemini para Embeddings
        const apiKey = Deno.env.get("GEMINI_API_KEY");
        if (!apiKey) throw new Error("GEMINI_API_KEY not found");

        let log: string[] = [];
        let successCount = 0;

        // 1. Validar e Diagnosticar Modelos
        // Se falhar o primeiro, listamos os modelos disponíveis para debug
        // DIAGNOSTICO CONFIRMADO: O modelo correto é 'models/gemini-embedding-001'
        const modelVersion = "models/gemini-embedding-001";

        for (const item of KNOWLEDGE_CORPUS) {
            // Tenta gerar embedding
            const url = `https://generativelanguage.googleapis.com/v1beta/${modelVersion}:embedContent?key=${apiKey}`;

            const embeddingResp = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    content: { parts: [{ text: item.content }] }
                })
            });

            if (!embeddingResp.ok) {
                const errorText = await embeddingResp.text();
                log.push(`Erro embedding para '${item.category}': ${errorText}`);

                // DIAGNÓSTICO: Listar modelos se falhar no primeiro
                if (log.length === 1) {
                    try {
                        const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                        const listData = await listResp.json();
                        const embeddingModels = (listData.models || [])
                            .filter((m: any) => m.name.includes("embedding"))
                            .map((m: any) => m.name);
                        log.push(`DIAGNOSTICO - Modelos Disponíveis: ${JSON.stringify(embeddingModels)}`);
                    } catch (e: any) {
                        log.push(`Falha ao listar modelos: ${e.message}`);
                    }
                }
                continue;
            }

            const embeddingJson = await embeddingResp.json();
            const vector = embeddingJson.embedding.values;

            // 2. Inserir no Banco
            const { error } = await supabase.from("gaia_knowledge_base").upsert({
                content: item.content,
                metadata: item.metadata,
                embedding: vector
            }, { onConflict: "content" }); // Evita duplicatas exatas

            if (error) {
                log.push(`Erro insert DB: ${error.message}`);
            } else {
                successCount++;
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Knowledge Base Seeded! ${successCount}/${KNOWLEDGE_CORPUS.length} items processed.`,
            details: log
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
