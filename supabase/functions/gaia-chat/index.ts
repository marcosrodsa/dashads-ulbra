// Supabase Edge Function: gaia-chat
// Chat conversacional com Gaia usando RAG para contexto de dados

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
    };
}

interface PerformanceContext {
    totalSpend: number;
    totalConversions: number;
    avgCPL: number;
    avgCTR: number;
    topCreatives: any[];
    periodDays: number;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get user from auth header
        const authHeader = req.headers.get("Authorization");
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

        // 3. Fetch performance context (RAG)
        const dateRange = context?.dateRange || {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            end: new Date().toISOString().split("T")[0]
        };

        let performanceQuery = supabase
            .from("vw_creative_analysis_complete")
            .select("*")
            .gte("data_referencia", dateRange.start)
            .lte("data_referencia", dateRange.end);

        if (context?.unidade) {
            performanceQuery = performanceQuery.eq("unidade", context.unidade);
        }

        const { data: perfData, error: perfError } = await performanceQuery;

        let performanceContext: PerformanceContext = {
            totalSpend: 0,
            totalConversions: 0,
            avgCPL: 0,
            avgCTR: 0,
            topCreatives: [],
            periodDays: Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24))
        };

        if (!perfError && perfData && perfData.length > 0) {
            const totals = perfData.reduce((acc: any, row: any) => ({
                spend: acc.spend + (row.investimento || 0),
                conversions: acc.conversions + (row.conversoes || 0),
                impressions: acc.impressions + (row.impressoes || 0),
                clicks: acc.clicks + (row.cliques || 0)
            }), { spend: 0, conversions: 0, impressions: 0, clicks: 0 });

            performanceContext = {
                totalSpend: totals.spend,
                totalConversions: totals.conversions,
                avgCPL: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
                avgCTR: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
                topCreatives: perfData
                    .sort((a: any, b: any) => (b.conversoes || 0) - (a.conversoes || 0))
                    .slice(0, 5)
                    .map((c: any) => ({
                        name: c.ad_name,
                        conversions: c.conversoes,
                        cpl: c.cpl,
                        ctr: c.ctr
                    })),
                periodDays: performanceContext.periodDays
            };
        }

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
        const systemPrompt = `Você é a Gaia, uma especialista em análise de mídia paga e performance de anúncios.
Você tem acesso aos seguintes dados de performance do período (${performanceContext.periodDays} dias):

📊 MÉTRICAS GERAIS:
- Investimento total: R$ ${performanceContext.totalSpend.toFixed(2)}
- Conversões totais: ${performanceContext.totalConversions}
- CPL médio: R$ ${performanceContext.avgCPL.toFixed(2)}
- CTR médio: ${performanceContext.avgCTR.toFixed(2)}%

🏆 TOP 5 CRIATIVOS:
${performanceContext.topCreatives.map((c, i) =>
            `${i + 1}. ${c.name || 'Sem nome'} - ${c.conversions} conv, CPL R$${(c.cpl || 0).toFixed(2)}, CTR ${(c.ctr || 0).toFixed(2)}%`
        ).join('\n')}

INSTRUÇÕES:
1. Responda de forma direta e profissional
2. Use os dados fornecidos para embasar suas respostas
3. Quando não souber algo, seja honesta
4. Formate números em português (R$, %, vírgulas)
5. Sugira ações práticas quando apropriado
6. Se perguntarem sobre previsões, use tendências dos dados disponíveis`;

        // 6. Call Gemini API
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

        const geminiBody = {
            contents: [
                { role: "user", parts: [{ text: systemPrompt }] },
                ...conversationHistory.slice(0, -1).map(m => ({
                    role: m.role,
                    parts: [{ text: m.content }]
                })),
                { role: "user", parts: [{ text: message }] }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
            }
        };

        const geminiResponse = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(geminiBody)
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error("Gemini API error:", errorText);
            throw new Error("Gemini API error");
        }

        const geminiData = await geminiResponse.json();
        const assistantMessage = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Desculpe, não consegui processar sua pergunta. Tente novamente.";

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
        console.error("Gaia Chat error:", error);
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
