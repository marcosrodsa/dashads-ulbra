// Supabase Edge Function: gaia-contextual-analysis
// Analyzes creatives WITH performance context (KPIs) for actionable insights

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to fetch image and convert to Base64 safely (Avoiding any stack-based methods)
async function fetchImageAsBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();

        const bytes = new Uint8Array(arrayBuffer);
        // Use a more memory-efficient way to convert to base64
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk as any);
        }
        return btoa(binary);
    } catch (e) {
        console.error("Error fetching image:", e);
        return null;
    }
}

interface AnalysisRequest {
    creativeId: string;
    periodStart?: string;  // ISO date, default: 30 days ago
    periodEnd?: string;    // ISO date, default: today
}

interface PerformanceSnapshot {
    ctr: number;
    cpa: number | null;
    conversions: number;
    impressions: number;
    clicks: number;
    spend: number;
    trend: "improving" | "stable" | "declining";
    forecast?: {
        predicted_cpl: number | null;
        predicted_conversions: number | null;
        trend_direction: string;
        confidence_r2: number;
    };
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("DEBUG: gaia-contextual-analysis invoked - Build: 09/02 16:45");
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Missing Supabase environment variables");
        }

        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set in environment variables");
        }

        const { creativeId, periodStart, periodEnd }: AnalysisRequest = await req.json();

        if (!creativeId) {
            throw new Error("Missing creativeId");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Calculate date range (default: last 30 days)
        const endDate = periodEnd || new Date().toISOString().split('T')[0];
        const startDate = periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        console.log(`Analyzing creative ${creativeId} from ${startDate} to ${endDate}`);

        // 1. Fetch creative asset (image, copy)
        const { data: asset, error: assetError } = await supabase
            .from("fact_creative_assets")
            .select("*")
            .eq("ad_id", creativeId)
            .single();

        if (assetError || !asset) {
            throw new Error(`Creative asset not found: ${creativeId}`);
        }

        // 2. Fetch performance data from vw_creative_analysis_complete
        const { data: perfData, error: perfError } = await supabase
            .from("vw_creative_analysis_complete")
            .select("*")
            .eq("ad_id", creativeId)
            .gte("data_referencia", startDate)
            .lte("data_referencia", endDate);

        if (perfError) {
            console.error("Performance query error:", perfError);
            throw new Error("Could not fetch performance data");
        }

        // 3. Aggregate performance metrics (view already has aggregated data per day)
        const totals = (perfData || []).reduce((acc: { impressions: number, clicks: number, conversions: number, spend: number }, row: any) => ({
            impressions: acc.impressions + (row.impressoes || 0),
            clicks: acc.clicks + (row.cliques || 0),
            conversions: acc.conversions + (row.conversoes || 0),
            spend: acc.spend + (row.investimento || 0),
        }), { impressions: 0, clicks: 0, conversions: 0, spend: 0 });

        const ctr = totals.impressions > 0
            ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2))
            : 0;
        const cpa = totals.conversions > 0
            ? Number((totals.spend / totals.conversions).toFixed(2))
            : null;

        // Calculate trend (compare first half vs second half of period)
        const midpoint = Math.floor((perfData || []).length / 2);
        const firstHalf = (perfData || []).slice(0, midpoint);
        const secondHalf = (perfData || []).slice(midpoint);

        // Calculate trend based on CPL (lower is better) - compare first half vs second half
        const firstHalfSpend = firstHalf.reduce((sum: number, r: any) => sum + (r.investimento || 0), 0);
        const secondHalfSpend = secondHalf.reduce((sum: number, r: any) => sum + (r.investimento || 0), 0);
        const firstHalfConv = firstHalf.reduce((sum: number, r: any) => sum + (r.conversoes || 0), 0);
        const secondHalfConv = secondHalf.reduce((sum: number, r: any) => sum + (r.conversoes || 0), 0);

        const firstHalfCPL = firstHalfConv > 0 ? firstHalfSpend / firstHalfConv : null;
        const secondHalfCPL = secondHalfConv > 0 ? secondHalfSpend / secondHalfConv : null;

        let trend: "improving" | "stable" | "declining" = "stable";

        // If we have CPL data for both halves, compare CPL (lower = better = improving)
        if (firstHalfCPL !== null && secondHalfCPL !== null) {
            const cplChange = (secondHalfCPL - firstHalfCPL) / firstHalfCPL;
            if (cplChange < -0.15) trend = "improving";  // CPL dropped 15%+ = improving
            else if (cplChange > 0.15) trend = "declining";  // CPL rose 15%+ = declining
        } else if (secondHalfConv > firstHalfConv * 1.2) {
            // Fallback to conversions if no CPL data
            trend = "improving";
        } else if (secondHalfConv < firstHalfConv * 0.8) {
            trend = "declining";
        }

        // Helper function for Linear Regression (Least Squares)
        const calculateLinearRegression = (x: number[], y: number[]) => {
            const n = x.length;
            if (n === 0) return { slope: 0, intercept: 0, r2: 0 };

            const sumX = x.reduce((a, b) => a + b, 0);
            const sumY = y.reduce((a, b) => a + b, 0);
            const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
            const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;

            // Calculate R2
            const yMean = sumY / n;
            const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
            const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
            const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

            return { slope, intercept, r2 };
        };

        // --- PREDICTIVE ANALYTICS (Phase 1) ---
        // Prepare daily data series for regression
        const dailyData = (perfData || [])
            .filter((d: any) => d.investimento > 0) // Filter out days with 0 spend
            .sort((a: any, b: any) => new Date(a.data_referencia).getTime() - new Date(b.data_referencia).getTime());

        let forecast = {
            predicted_cpl: null as number | null,
            predicted_conversions: null as number | null,
            trend_direction: "stable",
            confidence_r2: 0
        };

        if (dailyData.length >= 5) { // Need at least 5 data points for meaningful regression
            const days = dailyData.map((_: any, i: number) => i + 1); // x: Day 1, 2, 3...
            const cpls = dailyData.map((d: any) => d.conversoes > 0 ? d.investimento / d.conversoes : d.investimento); // y: CPL (fallback to spend if 0 conv to analyze cost trend)

            const regression = calculateLinearRegression(days, cpls);

            // Forecast for 7 days ahead
            const lastDayIndex = days.length;
            const futureDayIndex = lastDayIndex + 7;
            const predictedCplVal = regression.slope * futureDayIndex + regression.intercept;

            forecast.predicted_cpl = Math.max(0, Number(predictedCplVal.toFixed(2))); // Clamp to 0
            forecast.confidence_r2 = Number(regression.r2.toFixed(2));

            // Determine Trend Direction from Slope
            if (regression.slope > 0.5) forecast.trend_direction = "rising"; // CPL increasing > 0.50 per day
            else if (regression.slope < -0.5) forecast.trend_direction = "falling"; // CPL decreasing > 0.50 per day
            else forecast.trend_direction = "stable";

            console.log(`🔮 Predictive Analysis: Slope=${regression.slope.toFixed(4)}, R2=${regression.r2}, ForecastCPL=${forecast.predicted_cpl}`);
        } else {
            console.log("ℹ️ Not enough data points for predictive analysis (min 5 days with spend).");
        }

        const performanceSnapshot: PerformanceSnapshot = {
            ctr,
            cpa,
            conversions: totals.conversions,
            impressions: totals.impressions,
            clicks: totals.clicks,
            spend: totals.spend,
            trend,
            forecast // Adding forecast to snapshot for frontend use
        };

        console.log("Performance snapshot:", performanceSnapshot);

        // 4. PRE-FETCH IMAGE (Required for prompt flag)
        let imageBase64: string | null = null;
        if (asset.image_url) {
            console.log("Fetching image for analysis:", asset.image_url);
            imageBase64 = await fetchImageAsBase64(asset.image_url);
        }

        // 5. Build contextual prompt for Gemini
        const prompt = `Você é a Gaia, uma Diretora de Criação Sênior especializada em anúncios de performance para instituições de ensino superior no Brasil (Ulbra).

Analise este criativo com base nos dados de performance REAIS fornecidos. Sua análise deve explicar POR QUE ele performa dessa forma.

**Dados do Criativo:**
- Título: ${asset.title || "N/A"}
- Copy: ${asset.body || "N/A"}
- Tipo: ${asset.creative_type || "IMAGE"}
${asset.hook_rate ? `- Hook Rate: ${asset.hook_rate}%` : ""}
${asset.hold_rate ? `- Hold Rate: ${asset.hold_rate}%` : ""}
- Imagem Fornecida: ${imageBase64 ? "SIM (Use a imagem enviada para a análise visual)" : "NÃO (Ocorreu um erro técnico ao buscar a imagem)"}

**Performance Real (${startDate} a ${endDate}):**
- Impressões: ${totals.impressions.toLocaleString('pt-BR')}
- Cliques: ${totals.clicks.toLocaleString('pt-BR')}
- CTR: ${ctr}%
- Conversões: ${totals.conversions}
- CPA: ${cpa ? `R$ ${cpa.toFixed(2)}` : "N/A (sem conversões)"}
- Investimento: R$ ${totals.spend.toFixed(2)}
- Tendência Histórica: ${trend === "improving" ? "📈 Melhorando" : trend === "declining" ? "📉 Caindo" : "➡️ Estável"}

**🔮 Previsão (Próximos 7 Dias):**
${forecast.predicted_cpl ? `- CPA Projetado: R$ ${forecast.predicted_cpl.toFixed(2)}` : "- CPA Projetado: Dados insuficientes"}
- Direção da Tendência: ${forecast.trend_direction === "rising" ? "⚠️ Subindo" : forecast.trend_direction === "falling" ? "✅ Caindo" : "➡️ Estável"}
${forecast.confidence_r2 > 0.6 ? `(Alta Confiança Estatística: R²=${forecast.confidence_r2})` : "(Baixa Confiança Estatística)"}

**Instruções:**
1. Descreva visualmente o criativo em 1 parágrafo (elementos, cores, texto na imagem). IMPORTANTE: Se a imagem NÃO foi fornecida (indicado acima), escreva OBRIGATORIAMENTE: "Diagnóstico visual indisponível para este criativo devido a erro de acesso à imagem." e NÃO invente ou alucine detalhes visuais nem sugestões baseadas em imagens que você não viu.
2. Explique POR QUE este criativo está performando assim (relacione copy/visual com os KPIs).
3. **COMENTE A PREVISÃO:** Se a tendência é de alta no CPA, alerte o usuário. Se é de queda, sugira aproveitar.
4. Sugira 2-3 melhorias específicas e acionáveis (baseadas na imagem APENAS se disponível).
5. Identifique o risco de fadiga (low/medium/high).
6. Recomende UMA ação: scale (escalar investimento), pause (pausar), iterate (criar variação), test (testar A/B).

**Formato de Resposta (JSON):**
{
  "visual_description": "Descrição visual detalhada da imagem...",
  "why_performs": "Explicação detalhada conectando elementos criativos aos resultados...",
  "improvement_suggestions": ["Sugestão 1", "Sugestão 2", "Sugestão 3"],
  "fatigue_risk": "low" | "medium" | "high",
  "recommended_action": "scale" | "pause" | "iterate" | "test",
  "confidence_score": 0.85
}

IMPORTANTE: Retorne APENAS o JSON. NÃO formate com Markdown. NÃO use \`\`\`json.
Retorne apenas o JSON válido.`;

        // 6. Call Gemini API
        // Prepare request parts
        const parts: any[] = [{ text: prompt }];

        if (imageBase64) {
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64
                }
            });
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        console.log("DEBUG: Contextual Analysis - Target Gemini URL:", `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 8) + '...' : 'MISSING'}`);

        const geminiResponse = await fetch(
            geminiUrl,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                        response_mime_type: "application/json",
                    },
                }),
            }
        );

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            if (geminiResponse.status === 429) {
                console.warn("Gemini 429 Quota Exceeded for Contextual Analysis");
                // Return a mock "Quota Exceeded" analysis result so frontend doesn't crash
                const quotaFallback = {
                    success: true,
                    saved: false,
                    performance: performanceSnapshot,
                    analysis: {
                        visual_description: "Diagnóstico indisponível temporariamente devido a limite de cota da IA.",
                        why_performs: "⚠️ Cota da IA excedida temporariamente. Tente novamente em alguns minutos.",
                        improvement_suggestions: ["Verifique o plano no Google AI Studio", "Aguarde a renovação da cota"],
                        fatigue_risk: "medium",
                        recommended_action: "iterate",
                        confidence_score: 0.0
                    }
                };
                return new Response(JSON.stringify(quotaFallback), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200
                });
            }
            throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
        }

        const geminiData = await geminiResponse.json();
        const finishReason = geminiData.candidates?.[0]?.finishReason;
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const tokensUsed = geminiData.usageMetadata?.totalTokenCount || 0;

        console.log(`DEBUG: Gemini Response - FinishReason: ${finishReason}, Length: ${rawText.length}, Tokens: ${tokensUsed}`);

        if (finishReason === "MAX_TOKENS") {
            console.warn("⚠️ Gemini response truncated due to MAX_TOKENS limit.");
        }

        // 6. Parse JSON response
        let analysis = {
            visual_description: "",
            why_performs: "Análise não disponível (Erro de processamento da IA)",
            improvement_suggestions: ["Tente gerar novamente"],
            fatigue_risk: "medium" as const,
            recommended_action: "iterate" as const,
            confidence_score: 0.5
        };

        try {
            // Remove Markdown code blocks if present ( ```json ... ``` )
            const cleanText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

            // Try parsing the cleaned text directly first
            try {
                const parsed = JSON.parse(cleanText);
                analysis = { ...analysis, ...parsed };
            } catch (e) {
                // Check if it looks truncated
                if (cleanText.startsWith("{") && !cleanText.endsWith("}")) {
                    console.warn("DEBUG: JSON appears truncated. Response length:", cleanText.length);
                }

                // If direct parse fails, try extracting with regex as fallback
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    analysis = { ...analysis, ...parsed };
                } else {
                    console.warn("DEBUG: No JSON structure found in response.");
                }
            }
        } catch (parseError) {
            console.error("Parse Error:", parseError, "Raw:", rawText);
        }

        // 7. Save to creative_contextual_insights
        const insertPayload = {
            ad_id: creativeId,
            analysis_period_start: startDate,
            analysis_period_end: endDate,
            performance_snapshot: performanceSnapshot,
            why_performs: analysis.why_performs,
            visual_description: analysis.visual_description, // NEW: Save in history
            improvement_suggestions: analysis.improvement_suggestions,
            fatigue_risk: analysis.fatigue_risk,
            recommended_action: analysis.recommended_action,
            confidence_score: analysis.confidence_score,
            llm_model: "gemini-2.5-flash",
            tokens_used: tokensUsed
        };

        const { error: insertError } = await supabase
            .from("creative_contextual_insights")
            .insert(insertPayload);

        if (insertError) {
            console.error("DEBUG: Insert error creative_contextual_insights:", JSON.stringify(insertError));
            // Log specifically if it's a missing column error to help the user
            if (insertError.code === "PGRST204" || (insertError as any).message?.includes("column")) {
                console.warn("CRITICAL: Column 'visual_description' seems to be missing in 'creative_contextual_insights'. Run sql/consolidate_gaia_history.sql");
            }
        }

        // 8. Upsert visual description to fact_creative_vectors
        if (analysis.visual_description) {
            console.log("Upserting visual description...");
            const { error: vectorError } = await supabase
                .from("fact_creative_vectors")
                .upsert({
                    ad_id: creativeId,
                    visual_description: analysis.visual_description
                }, { onConflict: "ad_id" });

            if (vectorError) console.error("Error upserting vectors:", vectorError);
        }

        return new Response(
            JSON.stringify({
                success: true,
                saved: !insertError,
                performance: performanceSnapshot,
                analysis,
                tokensUsed
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error) {
        console.error("Contextual analysis error:", error);
        return new Response(
            JSON.stringify({
                error: (error as Error).message || "Internal server error",
                success: false
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
