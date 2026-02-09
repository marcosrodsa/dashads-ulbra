// Supabase Edge Function: gaia-chat
// Chat conversacional com Gaia usando RAG para contexto de dados
// VERSÃO OTIMIZADA (RPC)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
    sessionId?: string;
    message: string;
    context?: {
        dateRange?: { start: string; end: string };
        unidade?: string;
        platform?: string;
        hideBranding?: boolean;
        excludeEad?: boolean;
    };
}

interface PerformanceContext {
    totalSpend: number;
    totalConversions: number;
    avgCPL: number;
    avgCTR: number;
    topCreatives: any[];
    periodDays: number;
    forecast: {
        cpl: number;
        trend: string;
    };
}

const calculateLinearRegression = (x: number[], y: number[]) => {
    const n = x.length;
    if (n === 0) return { slope: 0, intercept: 0, r2: 0 };

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const denominator = (n * sumXX - sumX * sumX);
    if (denominator === 0) return { slope: 0, intercept: 0, r2: 0 };

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R2
    const yMean = sumY / n;
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
    const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

    return { slope, intercept, r2 };
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("Gaia Chat: Request received (RPC Mode)");
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

        // --- DEBUG: LOG ENVIRONMENT & TOKENS ---
        console.log("--- DEBUG: EDGE FUNCTION START ---");
        console.log("Target SUPABASE_URL:", supabaseUrl);
        console.log("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? `Present (starts with ${supabaseServiceKey.substring(0, 8)}...)` : "MISSING");
        console.log("GEMINI_API_KEY:", geminiApiKey ? `Present (starts with ${geminiApiKey.substring(0, 8)}...)` : "MISSING");

        const authHeader = req.headers.get("Authorization");
        console.log("Incoming Auth Header:", authHeader ? `Present (starts with ${authHeader.substring(0, 15)}...)` : "MISSING");
        console.log("----------------------------------");

        if (!geminiApiKey) {
            throw new Error("GEMINI_API_KEY is not set in environment variables");
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get user from auth header
        let userId: string | null = null;

        if (authHeader) {
            const token = authHeader.replace("Bearer ", "");
            const { data: { user } } = await supabase.auth.getUser(token);
            userId = user?.id || null;
        }

        const body: ChatRequest = await req.json();
        const { sessionId, message, context } = body;

        if (!message) {
            throw new Error("Message is required");
        }

        // 1. Create or get session
        let currentSessionId = sessionId;
        if (!currentSessionId && userId) {
            const { data: newSession, error: sessionError } = await supabase
                .from("chat_sessions")
                .insert({
                    user_id: userId,
                    title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
                    context: context || {}
                })
                .select("id")
                .single();

            if (sessionError) {
                console.error("Session creation error:", sessionError);
                throw new Error("Could not create chat session");
            }
            currentSessionId = newSession.id;
        }

        // 2. Save user message
        if (currentSessionId) {
            await supabase.from("chat_messages").insert({
                session_id: currentSessionId,
                role: "user",
                content: message
            });
        }

        // 3. Fetch performance context via RPC (Optimized)
        const dateRange = context?.dateRange || {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            end: new Date().toISOString().split("T")[0]
        };

        const periodDays = Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24));

        console.log("Gaia Chat: Calling RPC get_gaia_data with params:", {
            p_start_date: dateRange.start,
            p_end_date: dateRange.end,
            p_unidade: context?.unidade,
            p_hide_branding: context?.hideBranding,
            p_exclude_ead: context?.excludeEad
        });

        const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_gaia_data', {
                p_start_date: dateRange.start,
                p_end_date: dateRange.end,
                p_unidade: context?.unidade || null, // Ensure null, not undefined
                p_hide_branding: context?.hideBranding || false,
                p_exclude_ead: context?.excludeEad || false
            });

        if (rpcError) {
            console.error("RPC Error Details:", JSON.stringify(rpcError));
            // Do not throw immediately, allow fallback to empty logic to debugging LLM area if needed,
            // but for now, let's treat DB error as fatal for context but not for chat?
            // actually, if RPC fails, we should probably tell the user or proceed with empty stats.
            console.error("Proceeding with empty context due to RPC error.");
        }

        // Parse RPC Data
        // Structure: { stats: { totals: {...}, daily: [...] }, top_creatives: [...] }
        const stats = rpcData?.stats || { totals: {}, daily: [] };
        const totals = stats.totals || { spend: 0, conversions: 0, impressions: 0, clicks: 0 };
        const dailyDataArray = stats.daily || [];
        const topCreativesList = rpcData?.top_creatives || [];

        let forecast = { cpl: 0, trend: "Dados insuficientes" };

        // 3.1 Calculate Forecast locally (on lightweight daily data)
        try {
            console.log(`Gaia Chat: Computing forecast on ${dailyDataArray.length} days.`);

            const daysX: number[] = [];
            const cplY: number[] = []; // CPL diário

            // dailyDataArray is ordered by date from SQL
            dailyDataArray.forEach((day: any, i: number) => {
                const spend = Number(day.spend) || 0;
                const conv = Number(day.conversions) || 0;

                if (spend > 0) {
                    daysX.push(i + 1);
                    const cpl = conv > 0 ? spend / conv : spend;
                    cplY.push(Number.isFinite(cpl) ? cpl : 0);
                }
            });

            if (daysX.length >= 5) {
                const reg = calculateLinearRegression(daysX, cplY);
                if (Number.isFinite(reg.slope) && Number.isFinite(reg.intercept)) {
                    const futureCPL = Math.max(0, reg.slope * (daysX.length + 7) + reg.intercept);
                    let trendDir = "➡️ Estável";
                    if (reg.slope > 0.5) trendDir = "⚠️ Alta";
                    if (reg.slope < -0.5) trendDir = "✅ Queda";

                    const r2val = Number.isFinite(reg.r2) ? reg.r2 : 0;
                    forecast = {
                        cpl: Number.isFinite(futureCPL) ? futureCPL : 0,
                        trend: `${trendDir} (R²=${r2val.toFixed(2)})`
                    };
                    console.log(`Gaia Chat: Forecast Result: CPL ${forecast.cpl}, Trend ${forecast.trend}`);
                }
            }
        } catch (err) {
            console.error("Gaia Chat: Forecast Logic Error", err);
        }

        let performanceContext: PerformanceContext = {
            totalSpend: Number(totals.spend) || 0,
            totalConversions: Number(totals.conversions) || 0,
            avgCPL: Number(totals.conversions) > 0 ? Number(totals.spend) / Number(totals.conversions) : 0,
            avgCTR: Number(totals.impressions) > 0 ? (Number(totals.clicks) / Number(totals.impressions)) * 100 : 0,
            topCreatives: topCreativesList.map((c: any) => ({
                name: c.ad_name,
                conversions: c.conversions,
                cpl: c.cpl,
                ctr: c.ctr
            })),
            periodDays,
            forecast
        };

        // 4. Get conversation history
        let conversationHistory: { role: string; content: string }[] = [];
        if (currentSessionId) {
            const { data: historyData } = await supabase
                .from("chat_messages")
                .select("role, content")
                .eq("session_id", currentSessionId)
                .order("created_at", { ascending: true })
                .limit(10);

            if (historyData) {
                conversationHistory = historyData.map((m: any) => ({
                    role: m.role === "assistant" ? "model" : "user",
                    content: m.content
                }));
            }
        }

        // 5. Build Gemini prompt with context
        const brandingNote = context?.hideBranding ? "⚠️ NOTA: Os dados abaixo EXCLUEM campanhas de Branding (foco total em Performance)." : "";

        const systemPrompt = `Você é a Gaia, uma especialista em análise de mídia paga e performance de anúncios.
Você tem acesso aos seguintes dados de performance do período (${performanceContext.periodDays} dias - Intervalo: ${dateRange.start} até ${dateRange.end}):

${brandingNote}

📊 MÉTRICAS GERAIS:
- Investimento total: R$ ${performanceContext.totalSpend.toFixed(2)}
- Conversões totais: ${performanceContext.totalConversions}
- CPL médio: R$ ${performanceContext.avgCPL.toFixed(2)}
- CTR médio: ${performanceContext.avgCTR.toFixed(2)}%

🔮 PREVISÃO GLOBAL (Próximos 7 Dias):
- CPL Projetado (Conta): ${performanceContext.forecast.cpl > 0 ? `R$ ${performanceContext.forecast.cpl.toFixed(2)}` : "Dados insuficientes"}
- Tendência: ${performanceContext.forecast.trend}

🏆 TOP 5 CRIATIVOS (Mais Conversões):
${performanceContext.topCreatives.map((c, i) =>
            `${i + 1}. ${c.name || 'Sem nome'} - ${c.conversions} conv, CPL R$${(Number(c.cpl) || 0).toFixed(2)}, CTR ${(Number(c.ctr) || 0).toFixed(2)}%`
        ).join('\n')}

INSTRUÇÕES:
1. Responda de forma direta e profissional
2. Use os dados fornecidos para embasar suas respostas
3. Quando não souber algo, seja honesta
4. Formate números em português (R$, %, vírgulas)
5. Sugira ações práticas quando apropriado
6. Se perguntarem sobre previsões, use tendências dos dados disponíveis
7. SEJA PROATIVA: Ao final da resposta, faça uma pergunta estratégica para engajar o usuário (ex: "Quer que eu detalhe o motivo da alta no CPL?", "Devemos focar na Unidade X?").`;

        console.log("Gaia Chat: Calling Gemini API...");
        // 6. Call Gemini API
        // User requested Gemini 2.5 Flash
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

        console.log("DEBUG: Target Gemini URL:", `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey ? 'HIDDEN_KEY' : 'MISSING'}`);

        const geminiBody = {
            system_instruction: {
                parts: [{ text: systemPrompt }]
            },
            contents: [
                ...conversationHistory.map(m => ({
                    role: m.role,
                    parts: [{ text: m.content }]
                })),
                { role: "user", parts: [{ text: message }] }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            }
        };

        const geminiResponse = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(geminiBody)
        });

        let assistantMessage = "";

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error("Gemini API error:", errorText);

            if (geminiResponse.status === 429) {
                assistantMessage = "⚠️ **Limite de Cota Atingido (429)**\n\nO limite gratuito da API do Google Gemini foi excedido neste momento. Por favor, aguarde alguns minutos e tente novamente, ou verifique seu plano no Google AI Studio.";
            } else {
                throw new Error(`Gemini API Error (${geminiResponse.status}): ${errorText}`);
            }
        } else {
            const geminiData = await geminiResponse.json();
            assistantMessage = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
                "Desculpe, não consegui processar sua pergunta. Tente novamente.";
        }

        console.log("Gaia Chat: Assistant replied success (or handled error).");

        // 7. Save assistant response
        if (currentSessionId) {
            await supabase.from("chat_messages").insert({
                session_id: currentSessionId,
                role: "assistant",
                content: assistantMessage,
                metadata: {
                    context_used: {
                        totalSpend: performanceContext.totalSpend,
                        totalConversions: performanceContext.totalConversions,
                        periodDays: performanceContext.periodDays
                    }
                }
            });
        }

        return new Response(
            JSON.stringify({
                success: true,
                sessionId: currentSessionId,
                message: assistantMessage,
                context: {
                    periodDays: performanceContext.periodDays,
                    totalConversions: performanceContext.totalConversions,
                    totalSpend: performanceContext.totalSpend
                }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Gaia Chat Runtime Error:", error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    }
});
