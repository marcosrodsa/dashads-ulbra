// Supabase Edge Function: gaia-contextual-analysis
// Analyzes creatives WITH performance context (KPIs) for actionable insights

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to fetch image and convert to Base64 safely
async function fetchImageAsBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
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
    periodStart?: string;
    periodEnd?: string;
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
        trend_direction: string;
        confidence_r2: number;
    };
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        console.log("DEBUG: gaia-contextual-analysis - Build: 10/02 15:10 (Precision & Fallback)");

        // 0. API Keys & Supabase Setup
        const apiKeys: string[] = [];
        const env = Deno.env.toObject();
        if (env.GEMINI_API_KEY) apiKeys.push(env.GEMINI_API_KEY);
        Object.keys(env).forEach(key => {
            if (key.startsWith("GEMINI_API_KEY_") && env[key]) apiKeys.push(env[key]);
        });

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase env vars");
        if (apiKeys.length === 0) throw new Error("No Gemini API Keys found");

        const { creativeId, periodStart, periodEnd }: AnalysisRequest = await req.json();
        if (!creativeId) throw new Error("Missing creativeId");

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Temporal Logic (D-1 Enforcement)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        let endDate = periodEnd || yesterday;
        if (endDate > yesterday) endDate = yesterday;
        const startDate = periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // 2. Data Fetching
        const { data: asset } = await supabase.from("fact_creative_assets").select("*").eq("ad_id", creativeId).single();
        if (!asset) throw new Error("Asset not found");

        const { data: perfData } = await supabase.from("vw_creative_analysis_complete")
            .select("*").eq("ad_id", creativeId).gte("data_referencia", startDate).lte("data_referencia", endDate);

        // 3. Metrics Aggregation
        const totals = (perfData || []).reduce((acc: any, row: any) => ({
            impressions: acc.impressions + (row.impressoes || 0),
            clicks: acc.clicks + (row.cliques || 0),
            conversions: acc.conversions + (row.conversoes || 0),
            spend: acc.spend + (row.investimento || 0),
        }), { impressions: 0, clicks: 0, conversions: 0, spend: 0 });

        const ctr = totals.impressions > 0 ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0;
        const cpa = totals.conversions > 0 ? Number((totals.spend / totals.conversions).toFixed(2)) : null;

        // 4. Regression & Trend (ALIGNED WITH FRONTEND LOGIC - Last 14 days only!)
        const dailyData = (perfData || [])
            .filter((d: any) => d.conversoes > 0) // FIX: Only days with actual conversions
            .sort((a, b) => new Date(a.data_referencia).getTime() - new Date(b.data_referencia).getTime())
            .slice(-14); // FIX: LIMIT TO LAST 14 DAYS (match frontend)

        console.log(`[DEBUG] creativeId: ${creativeId}, dailyData.length: ${dailyData.length}`);
        console.log(`[DEBUG] dailyData CPLs:`, dailyData.map(d => (d.investimento / d.conversoes).toFixed(2)));

        let forecast = { predicted_cpl: null as number | null, trend_direction: "stable", confidence_r2: 0 };
        if (dailyData.length >= 5) { // FIX: Match frontend minimum (not 2)
            const x = dailyData.map((_, i) => i + 1);
            const y = dailyData.map(d => d.investimento / d.conversoes); // FIX: Pure CPL, no fallback
            const n = x.length;
            const sumX = x.reduce((a, b) => a + b, 0), sumY = y.reduce((a, b) => a + b, 0);
            const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0), sumXX = x.reduce((s, xi) => s + xi * xi, 0);

            const denominator = n * sumXX - sumX * sumX;
            if (denominator === 0) {
                console.log(`[DEBUG] Denominator is zero, cannot compute regression`);
            } else {
                const slope = (n * sumXY - sumX * sumY) / denominator;
                const intercept = (sumY - slope * sumX) / n;
                const yMean = sumY / n;
                const ssTot = y.reduce((s, yi) => s + Math.pow(yi - yMean, 2), 0);
                const ssRes = y.reduce((s, yi, i) => s + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
                const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

                forecast.predicted_cpl = Math.max(0, Number((slope * (n + 1) + intercept).toFixed(2))); // FIX: n+1 (tomorrow)
                forecast.confidence_r2 = Number(r2.toFixed(2));
                forecast.trend_direction = slope > 0.5 ? "rising" : slope < -0.5 ? "falling" : "stable";

                console.log(`[DEBUG] slope: ${slope.toFixed(4)}, intercept: ${intercept.toFixed(2)}, predicted: ${forecast.predicted_cpl}`);
            }
        }

        const performanceSnapshot: PerformanceSnapshot = {
            ctr, cpa, conversions: totals.conversions, impressions: totals.impressions,
            clicks: totals.clicks, spend: totals.spend, trend: "stable", forecast
        };

        // 5. Image & Prompt
        let imageBase64: string | null = null;
        if (asset.image_url) imageBase64 = await fetchImageAsBase64(asset.image_url);

        const prompt = `Você é a Gaia, Diretora de Criação Sênior da Ulbra.
Analise este criativo com base nos dados de performance REAIS.
KPIs (${startDate} a ${endDate}): ${totals.impressions} imps, ${totals.conversions} convs, CPA R$ ${cpa || 'N/A'}.
Previsão: CPA Projetado R$ ${forecast.predicted_cpl || 'N/A'}, Direção: ${forecast.trend_direction}.

Instruções:
- Se imagem indisponível, diga: "Diagnóstico visual indisponível".
- Explique o PORQUÊ do resultado correlacionando visual/copy com KPIs.
- Sugira 3 melhorias e indique risco de fadiga.

Retorne EXCLUSIVAMENTE um JSON:
{
  "visual_description": "...",
  "why_performs": "...",
  "improvement_suggestions": ["..."],
  "fatigue_risk": "low"|"medium"|"high",
  "recommended_action": "scale"|"pause"|"iterate"|"test",
  "confidence_score": 0.0
}`;

        // 6. Gemini Fallback Execution
        const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
        async function fetchWithFallback(parts: any[]) {
            let lastErr = null;
            for (const key of apiKeys) {
                for (const model of MODELS) {
                    try {
                        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
                        const r = await fetch(url, {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.7, response_mime_type: "application/json" } })
                        });
                        if (r.status === 429) continue;
                        if (!r.ok) throw new Error(await r.text());
                        return await r.json();
                    } catch (e: any) { lastErr = e; }
                }
            }
            throw lastErr || new Error("Fallback failed");
        }

        const parts: any[] = [{ text: prompt }];
        if (imageBase64) parts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64 } });

        const data = await fetchWithFallback(parts);
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const analysis = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, "").trim());

        // 7. Persist & Respond
        const { error: insertError } = await supabase.from("creative_contextual_insights").insert({
            ad_id: creativeId,
            analysis_period_start: startDate,
            analysis_period_end: endDate,
            performance_snapshot: performanceSnapshot,
            why_performs: analysis.why_performs,
            improvement_suggestions: analysis.improvement_suggestions,
            fatigue_risk: analysis.fatigue_risk,
            recommended_action: analysis.recommended_action,
            confidence_score: analysis.confidence_score,
            llm_model: "fallback-logic-v3.1"
        });

        if (insertError) {
            console.error("DEBUG: Insert Error:", insertError);
        }

        if (analysis.visual_description) {
            await supabase.from("fact_creative_vectors").upsert({
                ad_id: creativeId, visual_description: analysis.visual_description
            }, { onConflict: "ad_id" });
        }

        return new Response(JSON.stringify({ success: true, performance: performanceSnapshot, analysis }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error: any) {
        console.error("Contextual Analysis Failure:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
