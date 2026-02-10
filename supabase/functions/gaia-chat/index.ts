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
    // SQUAD TIP: Skip weekends for trend analysis to avoid artificial CPL drops
    const dailyFiltered = daily.filter(d => {
        const date = new Date(d.data_referencia + 'T12:00:00');
        const day = date.getDay();
        return day !== 0 && day !== 6; // Ignore Sat/Sun
    });

    if (dailyFiltered.length < 3) return { forecast: 0, trend: "Estável (Sem amostragem)" };

    const cpls = dailyFiltered.map(d => (Number(d.spend) / Math.max(1, Number(d.conversions))) || 0);
    const n = cpls.length;

    // Média dos últimos 2 dias úteis
    const recent = cpls.slice(-2);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;

    // Média do restante do período útil
    const baseline = cpls.slice(0, -2);
    const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length;

    const diff = baselineAvg > 0 ? (recentAvg - baselineAvg) / baselineAvg : 0;

    // Calcula um "forecast" conservador
    const overallAvg = cpls.reduce((a, b) => a + b, 0) / n;
    let forecast = recentAvg;

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
                description: "Consulta EXCLUSIVAMENTE a comparação entre Gasto Real vs Orçamento Planejado por semana. Use este para perguntas de 'consumo do orçamento', 'meta de gasto' ou 'quanto foi planejado'.",
                parameters: {
                    type: "object",
                    properties: {
                        unidade: { type: "string", description: "Opcional: Nome exato da unidade (ex: 'Ulbra Canoas')." }
                    }
                }
            },
            {
                name: "query_global_performance",
                description: "Consulta o snapshot geral de performance (investimento, leads, CPL), Top 5 Criativos E PREDIÇÕES DE TENDÊNCIA de CPL para a próxima semana. Use este para perguntas de 'performance', 'como estamos indo', 'previsão', 'tendência' ou 'melhores criativos'.",
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
        // 1. Coleta todas as chaves disponíveis (GEMINI_API_KEY, GEMINI_API_KEY_2, etc.)
        const apiKeys: string[] = [];
        const env = Deno.env.toObject();

        // Adiciona a chave principal
        if (env.GEMINI_API_KEY) apiKeys.push(env.GEMINI_API_KEY);

        // Procura por outras chaves no padrão GEMINI_API_KEY_XX
        Object.keys(env).forEach(key => {
            if (key.startsWith("GEMINI_API_KEY_") && env[key]) {
                apiKeys.push(env[key]);
            }
        });

        if (apiKeys.length === 0) throw new Error("Nenhuma GEMINI_API_KEY configurada.");
        console.log(`Gaia Elite: ${apiKeys.length} chaves de API encontradas.`);

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = await req.json();
        const { sessionId, message, context } = body;

        console.log("Gaia Elite: Context recebido:", JSON.stringify(context));

        // ... (User auth & Session logic remains same - simplified for brevity of replacement scope if needed, but keeping flow) ...
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
                .eq("session_id", currentSessionId).order("created_at", { ascending: true }).limit(30);
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
        const systemInstruction = `Você é a Gaia Elite v3.0 (Otimização Proativa). HOJE É ${today} (FEVEREIRO/2026).
Seu objetivo é ser PROATIVA, ANALÍTICA e DIRETA. NÃO FAÇA PERGUNTAS DE CLARIFICAÇÃO SE O CONTEXTO JÁ EXISTE.

DIRETRIZES DE INTELIGÊNCIA:
1. SEM PERGUNTAS DE CLARIFICAÇÃO: Se o usuário perguntar "Como está a performance?", use os valores de Unidade: "${context?.unidade || 'Todas'}" e Curso: "${context?.curso || 'Todos'}" IMEDIATAMENTE. Nunca pergunte "Para qual unidade?" se o contexto não for nulo. Se for null, assuma "Todas".
2. CHAMADA DE FERRAMENTA OBRIGATÓRIA: Antes de dizer "Não sei" ou pedir detalhes, você DEVE tentar chamar uma ferramenta com o contexto disponível.
3. DIFERENCIAÇÃO DE DADOS:
    - PERFORMANCE/PREVISÃO: Use 'query_global_performance'. Ela dá o CPL real e a PREDIÇÃO (campo forecast). Para perguntas de "Como está indo" ou "Previsão", use esta.
    - ORÇAMENTO/CONSUMO: Use 'query_budget_comparison'. Ela dá o Planejado vs Real. Para perguntas de "Consumo" ou "Orçamento", use esta.
4. REALIDADE TEMPORAL:
    - Fevereiro/2026 é o mês ATUAL e OPERACIONAL.
    - Março/2026 é PLANEJAMENTO FUTURO. Ignore Março a menos que perguntem especificamente por ele. Se a ferramenta retornar Março como "esta semana", CORRIJA e procure a semana de Fevereiro.
5. TRANSPARÊNCIA: Informe a data do dado mais recente (campo latest_data_date) se houver delay.

CONTEXTO DASHBOARD ATUAL:
- Unidade: "${context?.unidade || 'Todas'}"
- Curso: "${context?.curso || 'Todos'}"
- Período do Filtro: ${dateRange.start} até ${dateRange.end} (Nota: Dados reais disponíveis até ontém)`;

        let chatContents = [...conversationHistory];
        if (chatContents.length === 0 || chatContents[chatContents.length - 1]?.parts?.[0]?.text !== message) {
            chatContents.push({ role: "user", parts: [{ text: message }] });
        }

        const MODELS = [
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash",
            "gemini-3-flash"
        ];

        let toolExecutionCount = 0;
        const maxToolExecutions = 5;
        let finalMessage = "Desculpe, ocorreu um erro no processamento após múltiplas tentativas.";

        /**
         * Helper para chamar Gemini com Fallback de Chaves e Modelos
         */
        async function fetchGeminiWithFallback(contents: any[], tools: any[], systemInstruction: string) {
            let lastError = null;

            // Loop Externo: Chaves de API
            for (const apiKey of apiKeys) {
                // Loop Interno: Modelos
                for (const modelId of MODELS) {
                    try {
                        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
                        console.log(`Gaia Elite: Tentando modelo ${modelId} com chave ...${apiKey.slice(-4)}`);

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

                        // Se quota excedida (429), tenta próximo modelo/chave
                        if (response.status === 429) {
                            console.warn(`Gaia Elite: Quota excedida (429) para ${modelId}. Tentando próximo...`);
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
                        // Se for erro de rede ou outro, também continua tentando outros modelos/chaves
                    }
                }
            }
            throw lastError || new Error("Falha total: Todas as chaves e modelos falharam.");
        }

        while (toolExecutionCount < maxToolExecutions) {
            const responseData = await fetchGeminiWithFallback(chatContents, TOOLS, systemInstruction);
            const candidate = responseData?.candidates?.[0];
            if (!candidate) break; // Graceful exit if no candidate

            const part = candidate?.content?.parts?.[0];
            if (!part) break; // Graceful exit if no part

            if (part.functionCall) {
                const { name, args } = part.functionCall;
                console.log(`Gaia Elite: Tool ${name} chamada com`, args);
                let toolResult = {};

                try {
                    if (name === "list_available_fields") {
                        const { data } = await supabase.from('vw_dashboard_semanal_detalhado2').select(args.field);
                        toolResult = { available_values: Array.from(new Set((data || []).map((r: any) => r[args.field]))) };
                    } else if (name === "query_budget_comparison") {
                        // SQUAD FIX: Fetch weeks around NOW to ensure the current week is present
                        const now = new Date();
                        const sixWeeksAgo = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        const sixWeeksAhead = new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                        const { data } = await supabase
                            .from('vw_dashboard_semanal_detalhado2')
                            .select('*')
                            .filter('unidade', args.unidade && args.unidade !== 'Todas' ? 'ilike' : 'neq', args.unidade && args.unidade !== 'Todas' ? `%${args.unidade}%` : 'null')
                            .gte('data_inicio_semana', sixWeeksAgo)
                            .lte('data_inicio_semana', sixWeeksAhead)
                            .order('data_inicio_semana', { ascending: false });

                        // Tagging periods to avoid hallucination
                        toolResult = (data || []).map((week: any) => {
                            const weekStart = new Date(week.data_inicio_semana + 'T12:00:00');
                            const weekEnd = new Date(week.data_fim_semana + 'T12:00:00');
                            let periodType = "FUTURE_PLANNING";
                            if (now >= weekStart && now <= weekEnd) periodType = "CURRENT_WEEK";
                            else if (now > weekEnd) periodType = "PAST_WEEK";

                            return { ...week, period_status: periodType };
                        });
                    } else if (name === "query_global_performance") {
                        // Harden filtering: prioritizes dashboard context over tool's inferred arguments
                        const filter_unidade = (args.unidade && args.unidade !== 'Todas') ? args.unidade : (context?.unidade || null);
                        const filter_curso = (args.curso && args.curso !== 'Todos') ? args.curso : (context?.curso || null);

                        // SQUAD HARDEN: Enforce D-1 logic (Performance data has 24h delay)
                        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        const filter_start = args.start_date || dateRange.start;
                        let filter_end = args.end_date || dateRange.end;
                        if (filter_end > yesterday) filter_end = yesterday;

                        const { data } = await supabase.rpc("get_gaia_data", {
                            p_start_date: filter_start,
                            p_end_date: filter_end,
                            p_unidade: filter_unidade,
                            p_curso: filter_curso,
                            p_hide_branding: context?.hideBranding ?? true,
                            p_exclude_ead: context?.excludeEad ?? false
                        });

                        // Agregar tendência conservadora (Harden check for data?.stats?.daily)
                        if (data && data.stats && data.stats.daily && Array.isArray(data.stats.daily) && data.stats.daily.length > 0) {
                            const latestDate = data.stats.daily[data.stats.daily.length - 1].data_referencia;
                            const { forecast, trend } = calculateTrend(data.stats.daily);
                            data.stats.forecast = {
                                next_7_days_avg_cpl: forecast,
                                trend: trend,
                                latest_data_date: latestDate // TRANSPARENCY: AI knows when data stopped
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
                finalMessage = part?.text || "Sem conteúdo.";
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
