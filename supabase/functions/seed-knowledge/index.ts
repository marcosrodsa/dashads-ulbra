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
    {
        category: "KPI Definition",
        content: "Hook Rate (O Gancho) mede se o anúncio chamou a atenção e parou o dedo da pessoa no feed. Vídeo: a pessoa assistiu aos primeiros 3s. Imagem: a pessoa interagiu com a foto (expandiu/curtiu). Peso: 60%. Para Vídeos (Meta 25%): Ruim/Invisível (< 15%), Médio (15% a 25%), Bom/Escalável (> 25%). Para Imagens (Meta 1.0%): Ruim (< 0.5%), Médio (0.5% a 1.0%), Bom (> 1.0%). Pense no Hook como o vitrinista chamando o cliente na rua.",
        metadata: { source: "Creatives Dashboard", kpi: "hook_rate", type: "formula" }
    },
    {
        category: "KPI Definition",
        content: "Hold Rate (A Retenção) mede se o conteúdo foi bom o suficiente para segurar o interesse da pessoa depois que ela parou. Vídeo: das que pararam nos 3s, quantas viram até 15s (ThruPlay). Imagem: das que interagiram, quantas clicaram no link para o site. Peso: 40%. Para Vídeos (Meta 30%): Ruim - Gancho Falso (< 20%), Médio - Retenção Saudável (20% a 30%), Bom - Ouro de Retenção (> 30%). Para Imagens (Meta 85%): Ruim (< 60%), Médio (60% a 85%), Bom - Intenção Ouro (> 85%). Pense no Hold como o vendedor convencendo o cliente a entrar na loja.",
        metadata: { source: "Creatives Dashboard", kpi: "hold_rate", type: "formula" }
    },
    {
        category: "KPI Definition",
        content: "Reach (Alcance) é o número de pessoas ÚNICAS que viram o anúncio. Frequency (Frequência ou Saturação) é a média de vezes que a MESMA pessoa viu o anúncio (Impressões / Alcance). Analogia: Alcance é quantas casas você visitou para vender; Frequência é quantas vezes você bateu na mesma porta. Frequência ideal depende do orçamento, mas se passa de 3.0 para o mesmo criativo e o CTR/Conversão cai, indica fadiga do criativo (as pessoas cansaram de ver).",
        metadata: { source: "Creatives Dashboard", kpi: "reach_freq", type: "formula" }
    },
    {
        category: "Platform Rule",
        content: "Tracking e Atribuição: O Meta Ads usa janela de clique de 7 dias e visualização de 1 dia. O CPL real de negócio pode divergir do CPL plataforma. Fase de Aprendizado requer ~50 conversões em 7 dias; durante isso, o CPL flutua. Escala segura: aumentar no máximo 20% do budget por dia.",
        metadata: { source: "Media Buyer Squad", topic: "tracking_and_scaling" }
    },
    {
        category: "Business Rule",
        content: "Contexto Ulbra: Captação de Vestibular tem picos em final (Dez-Jan) e meio de ano (Jun-Jul). Fora de pico, o CPL sobe naturalmente. Curso de Medicina tem funil longo e CPL premium; Cursos EAD requerem volume alto e CPL muito baixo.",
        metadata: { source: "Media Buyer Squad", topic: "ulbra_context" }
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
