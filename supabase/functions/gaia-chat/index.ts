// Supabase Edge Function: gaia-chat
// VERSÃO ELITE: Self-Contained Tool Calling com Gemini 1.5 Flash
// Nota: Funções estatísticas incorporadas para evitar erros de importação no deploy.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** 
 * --- ESTATISTICAS INCORPORADAS ---
 */
function calculateWinProbability(convA: number, impA: number, convB: number, impB: number): number {
    if (impA === 0 || impB === 0) return 0.5;
    const rateA = convA / impA;
    const rateB = convB / impB;
    const seA = Math.sqrt((rateA * (1 - rateA)) / impA);
    const seB = Math.sqrt((rateB * (1 - rateB)) / impB);
    if (seA === 0 && seB === 0) return rateB > rateA ? 1.0 : 0.0;
    const z = (rateB - rateA) / Math.sqrt(seA ** 2 + seB ** 2);
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + 1.330274 * t))));
    return z >= 0 ? 1 - p : p;
}

function predictFatigue(initialCTR: number, currentFrequency: number): any {
    const k = 0.15;
    const predictedCTR = initialCTR * Math.exp(-k * (currentFrequency - 1));
    const fatigueIndex = 1 - (predictedCTR / initialCTR);
    return {
        predictedCTR: Number(predictedCTR.toFixed(4)),
        fatigueIndex: Number(fatigueIndex.toFixed(2))
    };
}

/**
 * Estima a tendência comparando a média recente vs média do período.
 * Mais estável que regressão linear simples para amostras pequenas (7-14 dias).
 */
function calculateTrend(daily: any[]) {
    if (daily.length < 4) return { forecast: 0, trend: "Estável" };

    const cpls = daily.map(d => (Number(d.spend) / Math.max(1, Number(d.conversions))) || 0);
    const n = cpls.length;

    // Média dos últimos 3 dias
    const recent = cpls.slice(-3);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;

    // Média do restante do período
    const baseline = cpls.slice(0, -3);
    const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length;

    const diff = baselineAvg > 0 ? (recentAvg - baselineAvg) / baselineAvg : 0;

    // Calcula um "forecast" conservador (limitado a +/- 30% da média atual)
    const overallAvg = cpls.reduce((a, b) => a + b, 0) / n;
    let forecast = recentAvg;
    if (forecast > overallAvg * 1.5) forecast = overallAvg * 1.5;
    if (forecast < overallAvg * 0.5) forecast = overallAvg * 0.5;

    return {
        forecast: Number(forecast.toFixed(2)),
        trend: diff > 0.1 ? "Alta" : diff < -0.1 ? "Queda" : "Estável"
    };
}

/**
 * --- FERRAMENTAS ---
 */
const TOOLS = [
    {
        function_declarations: [
            {
                name: "list_available_fields",
                description: "Lista as unidades de negócio, cursos ou plataformas disponíveis. Use para confirmar nomes exatos.",
                parameters: {
                    type: "object",
                    properties: {
                        field: {
                            type: "string",
                            enum: ["unidade", "curso", "plataforma"],
                            description: "O campo para listar."
                        }
                    },
                    required: ["field"]
                }
            },
            {
                name: "query_budget_comparison",
                description: "Compara o gasto realizado vs orçamento planejado por unidade e semana.",
                parameters: {
                    type: "object",
                    properties: {
                        unidade: { type: "string", description: "Opcional: Nome exato da unidade (ex: 'Ulbra Canoas')." }
                    }
                }
            },
            {
                name: "query_global_performance",
                description: "Consulta o snapshot geral de performance (investimento, leads, CPL) para o período.",
                parameters: {
                    type: "object",
                    properties: {
                        unidade: { type: "string", description: "Opcional: Filtrar por unidade (ex: Santarém)." },
                        curso: { type: "string", description: "Opcional: Filtrar por curso." },
                        start_date: { type: "string", description: "Opcional: Data de início (YYYY-MM-DD)." },
                        end_date: { type: "string", description: "Opcional: Data de fim (YYYY-MM-DD)." }
                    }
                }
            },
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
                        start_date: { type: "string", description: "Opcional: Data de início (YYYY-MM-DD)." },
                        end_date: { type: "string", description: "Opcional: Data de fim (YYYY-MM-DD)." }
                    },
                    required: ["dimension"]
                }
            }
        ]
    }
];

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        console.log("Gaia Elite: Processando requisição...");
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;

        if (!geminiApiKey) throw new Error("GEMINI_API_KEY não configurada.");

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = await req.json();
        const { sessionId, message, context } = body;

        console.log("Gaia Elite: Context recebido:", JSON.stringify(context));

        let userId: string | null = null;
        const authHeader = req.headers.get("Authorization");
        if (authHeader) {
            const token = authHeader.replace("Bearer ", "");
            const { data: { user } } = await supabase.auth.getUser(token);
            userId = user?.id || null;
        }

        let currentSessionId = sessionId;
        if (!currentSessionId && userId) {
            const { data: newSession } = await supabase
                .from("chat_sessions")
                .insert({ user_id: userId, title: message.substring(0, 50), context: context || {} })
                .select("id").single();
            currentSessionId = newSession?.id;
        }

        if (currentSessionId) {
            await supabase.from("chat_messages").insert({
                session_id: currentSessionId, role: "user", content: message
            });
        }

        let conversationHistory: any[] = [];
        if (currentSessionId) {
            const { data: historyData } = await supabase
                .from("chat_messages")
                .select("role, content")
                .eq("session_id", currentSessionId).order("created_at", { ascending: true }).limit(10);
            if (historyData) {
                conversationHistory = historyData.map(m => ({
                    role: m.role === "assistant" ? "model" : "user",
                    parts: [{ text: m.content }]
                }));
            }
        }

        const dateRange = context?.dateRange || {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            end: new Date().toISOString().split("T")[0]
        };

        const today = new Date().toISOString().split("T")[0];
        const systemInstruction = `Você é a Gaia Elite, inteligência suprema de mídia da ULBRA. Hoje é ${today}.
Seu objetivo é ser PRECISA e ANALÍTICA.

CONTEXTO ATUAL (Dashboard):
- Unidade: "${context?.unidade || 'Todas'}"
- Curso: "${context?.curso || 'Todos'}"
- Período Analisado: ${dateRange.start} até ${dateRange.end}

MISSÃO E MODELOS:
1. Você POSSUI um modelo de previsão estatística integrado. Se o usuário perguntar sobre "previsão", "tendência" ou "próxima semana", você DEVE usar os dados de 'forecast' retornados pela ferramenta 'query_global_performance'. NUNCA diga que não pode prever.
2. Seja INVESTIGATIVA: Se os dados parecerem estranhos, use 'list_available_fields' para validar nomes de unidades ou cursos.
3. MEMÓRIA: Mantenha o contexto da conversa. Se o usuário já selecionou uma unidade, não pergunte qual é. Use o "CONTEXTO ATUAL" acima como sua verdade absoluta para consultas genéricas.
4. PRIORIDADE: Se o usuário pedir algo que conflite com o dashboard (ex: filtro diz Santarém mas usuário pede Canoas), avise que está mudando o foco para a Unidade pedida.

VERSÃO: Gaia Elite 2.8 (Predictive & Context Fixed).`;

        let chatContents = [...conversationHistory];
        if (chatContents.length === 0 || chatContents[chatContents.length - 1].parts[0].text !== message) {
            chatContents.push({ role: "user", parts: [{ text: message }] });
        }

        const MODELS = [
            "gemini-3-flash-preview",
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite"
        ];

        let toolExecutionCount = 0;
        const maxToolExecutions = 5;
        let finalMessage = "Desculpe, ocorreu um erro no processamento após múltiplas tentativas.";

        /**
         * Helper para chamar Geimini com Fallback
         */
        async function fetchGeminiWithFallback(contents: any[], tools: any[], systemInstruction: string) {
            let lastError = null;

            for (const modelId of MODELS) {
                try {
                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiApiKey}`;
                    console.log(`Gaia Elite: Tentando modelo ${modelId}...`);

                    const response = await fetch(geminiUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            system_instruction: { parts: [{ text: systemInstruction }] },
                            contents,
                            tools,
                            generationConfig: { temperature: 0.1 }
                        })
                    });

                    if (response.status === 429) {
                        console.warn(`Gaia Elite: Quota excedida para ${modelId}. Tentando fallback...`);
                        continue;
                    }

                    if (!response.ok) {
                        const err = await response.text();
                        throw new Error(`Gemini API (${modelId}) Error: ${err}`);
                    }

                    return await response.json();
                } catch (e: any) {
                    console.error(`Erro com modelo ${modelId}:`, e.message);
                    lastError = e;
                }
            }
            throw lastError || new Error("Falha total em todos os modelos Gemini.");
        }

        while (toolExecutionCount < maxToolExecutions) {
            const responseData = await fetchGeminiWithFallback(chatContents, TOOLS, systemInstruction);
            const candidate = responseData.candidates?.[0];
            if (!candidate) throw new Error("Nenhuma resposta do Gemini.");

            const part = candidate.content.parts[0];

            if (part.functionCall) {
                const { name, args } = part.functionCall;
                console.log(`Gaia Elite: Tool ${name} chamada com`, args);
                let toolResult = {};

                try {
                    if (name === "list_available_fields") {
                        const { data } = await supabase.from('vw_dashboard_semanal_detalhado2').select(args.field);
                        toolResult = { available_values: Array.from(new Set((data || []).map((r: any) => r[args.field]))) };
                    } else if (name === "query_budget_comparison") {
                        const { data } = await supabase
                            .from('vw_dashboard_semanal_detalhado2')
                            .select('*')
                            .ilike('unidade', `%${args.unidade || context?.unidade || ''}%`)
                            .order('data_inicio_semana', { ascending: false }).limit(8);
                        toolResult = data;
                    } else if (name === "query_global_performance") {
                        const { data } = await supabase.rpc('get_gaia_data', {
                            p_start_date: args.start_date || dateRange.start,
                            p_end_date: args.end_date || dateRange.end,
                            p_unidade: args.unidade || context?.unidade || null,
                            p_curso: args.curso || context?.curso || null
                        });

                        // Agregar tendência conservadora
                        if (data?.stats?.daily?.length >= 3) {
                            const { forecast, trend } = calculateTrend(data.stats.daily);
                            data.stats.forecast = {
                                next_7_days_avg_cpl: forecast,
                                trend: trend
                            };
                        }
                        toolResult = data;
                    } else if (name === "query_performance_breakdowns") {
                        const { data } = await supabase.rpc('get_breakdown_data', {
                            p_dimension: args.dimension,
                            p_start_date: args.start_date || dateRange.start,
                            p_end_date: args.end_date || dateRange.end
                        });
                        toolResult = data;
                    }
                } catch (toolErr) {
                    console.error(`Erro executando ferramenta ${name}:`, toolErr);
                    toolResult = { error: toolErr.message };
                }

                chatContents.push(candidate.content);
                chatContents.push({
                    role: "function",
                    parts: [{ functionResponse: { name, response: { content: toolResult } } }]
                });
                toolExecutionCount++;
            } else {
                finalMessage = part.text || "Sem conteúdo.";
                break;
            }
        }

        if (currentSessionId) {
            await supabase.from("chat_messages").insert({
                session_id: currentSessionId, role: "assistant", content: finalMessage
            });
        }

        return new Response(JSON.stringify({ success: true, message: finalMessage }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Gaia Elite Runtime Error:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
