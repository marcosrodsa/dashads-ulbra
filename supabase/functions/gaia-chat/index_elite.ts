// Supabase Edge Function: gaia-chat
// VERSÃO ELITE: Tool Calling (Function Calling) com Gemini 2.5 Flash
// Permite que a Gaia decida quais dados consultar dinamicamente.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculateWinProbability, predictFatigue } from "../shared/stats.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * DEFINIÇÃO DAS FERRAMENTAS (TOOLS) PARA O GEMINI
 */
const TOOLS = [
    {
        function_declarations: [
            {
                name: "query_performance_breakdowns",
                description: "Consulta dados demográficos (idade, gênero) ou geográficos (região) das campanhas.",
                parameters: {
                    type: "object",
                    properties: {
                        dimension: {
                            type: "string",
                            enum: ["age_range", "gender", "region"],
                            description: "A dimensão para agrupar os dados."
                        },
                        campaign_id: { type: "string", description: "Opcional: ID da campanha específica." }
                    },
                    required: ["dimension"]
                }
            },
            {
                name: "query_budget_comparison",
                description: "Compara o gasto realizado vs orçamento planejado por unidade e semana.",
                parameters: {
                    type: "object",
                    properties: {
                        unidade: { type: "string", description: "Opcional: Filtrar por unidade (ex: 'Ulbra Canoas')." }
                    }
                }
            },
            {
                name: "query_creative_history",
                description: "Busca o histórico de análises visuais e insights contextuais de um criativo específico.",
                parameters: {
                    type: "object",
                    properties: {
                        ad_id: { type: "string", description: "O ID do anúncio/criativo." }
                    },
                    required: ["ad_id"]
                }
            },
            {
                name: "calculate_stats",
                description: "Calcula probabilidade de vitória (Bayesiano) ou previsão de fadiga de criativos.",
                parameters: {
                    type: "object",
                    properties: {
                        model: { type: "string", enum: ["bayesian", "fatigue"] },
                        data: { type: "object", description: "Dados necessários para o modelo escolhido." }
                    },
                    required: ["model", "data"]
                }
            }
        ]
    }
];

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const body = await req.json();
        const { sessionId, message, context } = body;

        // 1. Obter Histórico da Conversa
        let user_id = null;
        const authHeader = req.headers.get("Authorization");
        if (authHeader) {
            const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
            user_id = user?.id;
        }

        // ... (Log de sessão e inicialização de histórico semelhante ao anterior) ...

        // 2. Loop de Processamento com Tools
        let finalMessage = "";
        let toolExecutionCount = 0;
        const maxToolExecutions = 5;

        // Estado inicial da conversa para o Gemini
        let chatContents = [
            { role: "user", parts: [{ text: message }] }
        ];

        // System Instruction atualizada
        const systemInstruction = `Você é a Gaia Elite, uma IA ultra-especializada em mídia paga para a ULBRA.
Você não apenas responde, você INVESTIGA. Se o usuário perguntar algo que exija dados demográficos, orçamentários ou históricos, USE AS FERRAMENTAS.
Contexto Atual: Unidade=${context?.unidade || 'Todas'}, Período=${context?.dateRange?.start} até ${context?.dateRange?.end}.
Sempre baseie suas análises em dados reais retornados pelas ferramentas.`;

        while (toolExecutionCount < maxToolExecutions) {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

            const geminiResponse = await fetch(geminiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemInstruction }] },
                    contents: chatContents,
                    tools: TOOLS
                })
            });

            const responseData = await geminiResponse.json();
            const candidate = responseData.candidates[0];
            const part = candidate.content.parts[0];

            if (part.functionCall) {
                // EXECUTAR TOOL
                const { name, args } = part.functionCall;
                console.log(`Gaia Elite: Executando ferramenta ${name}`, args);

                let toolResult = {};

                if (name === "query_performance_breakdowns") {
                    const { data } = await supabase.rpc('get_breakdown_data', {
                        p_dimension: args.dimension,
                        p_campaign_id: args.campaign_id,
                        p_start_date: context?.dateRange?.start,
                        p_end_date: context?.dateRange?.end
                    });
                    toolResult = data;
                } else if (name === "query_budget_comparison") {
                    const { data } = await supabase
                        .from('vw_dashboard_semanal_detalhado2')
                        .select('semana_label, unidade, orcamento_semanal, gasto_real, percentual_consumido')
                        .ilike('unidade', `%${args.unidade || ''}%`)
                        .order('data_inicio_semana', { ascending: false })
                        .limit(8);
                    toolResult = data;
                }
                // ... (outras ferramentas) ...

                // Adicionar chamada e resultado ao histórico para a próxima iteração
                chatContents.push(candidate.content); // A chamada do modelo
                chatContents.push({
                    role: "function",
                    parts: [{
                        functionResponse: {
                            name: name,
                            response: { content: toolResult }
                        }
                    }]
                });

                toolExecutionCount++;
            } else {
                // RESPOSTA FINAL
                finalMessage = part.text;
                break;
            }
        }

        // Salvar e Retornar
        // ... (Semelhante ao anterior, salvando chat_messages) ...

        return new Response(JSON.stringify({ success: true, message: finalMessage }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Gaia Elite Runtime Error:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
});
