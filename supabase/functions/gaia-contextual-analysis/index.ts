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
    filters?: {
        unidade?: string;
        curso?: string;
        hideBranding?: boolean;
    };
    metrics?: {
        predicted_cpl?: number | null;
        cpl?: number | null;
        conversoes?: number;
    };
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

        const { creativeId, periodStart, periodEnd, filters, metrics }: AnalysisRequest = await req.json();
        if (!creativeId) throw new Error("Missing creativeId");
        if (!periodStart || !periodEnd) {
            throw new Error("periodStart and periodEnd are required - must match UI filter period");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Temporal Logic (D-1 Enforcement)
        // Clamp endDate to yesterday to ensure only complete data
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        let endDate = periodEnd;
        if (endDate > yesterday) {
            console.warn(`[TEMPORAL] endDate ${endDate} > yesterday ${yesterday}, clamping to yesterday`);
            endDate = yesterday;
        }
        const startDate = periodStart;
        console.log(`[PERIOD] Using explicit period: ${startDate} to ${endDate} (UI-aligned)`);

        // 2. Data Fetching
        const { data: asset } = await supabase.from("fact_creative_assets").select("*").eq("ad_id", creativeId).single();
        if (!asset) throw new Error("Asset not found");

        let query = supabase.from("vw_creative_analysis_complete")
            .select("*")
            .eq("ad_id", creativeId)
            .gte("data_referencia", startDate)
            .lte("data_referencia", endDate);

        if (filters?.unidade && filters.unidade !== "all") {
            query = query.eq("unidade", filters.unidade);
        }
        if (filters?.curso && filters.curso !== "all") {
            query = query.eq("curso", filters.curso);
        }

        const { data: perfData } = await query;

        // 3. Filter Branding (ALIGNED WITH UI)
        const filteredData = (perfData || []).filter(row => {
            if (filters?.hideBranding === false) return true; // Only filter if requested

            const u = (row.unidade || "").toLowerCase();
            const c = (row.curso || "").toLowerCase();
            const campName = (row.campaign_name || "").toLowerCase();

            const isEad = u.includes("ead") || c.includes("ead");
            const isBranding = u.includes("branding") || u.includes("institucional") ||
                c.includes("branding") || campName.includes("branding") ||
                campName.includes("institucional");

            if (isEad) return true;
            return !isBranding;
        });

        // 4. Metrics Aggregation
        const totals = filteredData.reduce((acc: any, row: any) => {
            const imp = row.impressoes || 0;
            const hookRate = row.hook_rate || 0;
            const holdRate = row.hold_rate || 0;

            // Calculate Raw Actions (approximate from rate)
            const hookAction = (hookRate * imp) / 100; // 3s Views or Clicks All
            const holdAction = (holdRate * hookAction) / 100; // ThruPlays or Link Clicks

            return {
                impressions: acc.impressions + imp,
                clicks: acc.clicks + (row.cliques || 0),
                conversions: acc.conversions + (row.conversoes || 0),
                spend: acc.spend + (row.investimento || 0),
                // Accumulate weighted sums
                weighted_hook: acc.weighted_hook + hookAction,
                weighted_hold: acc.weighted_hold + holdAction,
                hold_denominator: acc.hold_denominator + hookAction
            };
        }, { impressions: 0, clicks: 0, conversions: 0, spend: 0, weighted_hook: 0, weighted_hold: 0, hold_denominator: 0 });

        const ctr = totals.impressions > 0 ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0;
        let cpa = totals.conversions > 0 ? Number((totals.spend / totals.conversions).toFixed(2)) : null;

        // Andromeda Metrics (True Weighted Average)
        const avgHook = totals.impressions > 0 ? ((totals.weighted_hook / totals.impressions) * 100).toFixed(2) : "0.00";
        const avgHold = totals.hold_denominator > 0 ? ((totals.weighted_hold / totals.hold_denominator) * 100).toFixed(2) : "0.00";

        // Context Data (Latest Row)
        const latestRow = filteredData[0] || {};
        const currentFreq = latestRow.frequency || 1.0;
        const creativeType = latestRow.creative_type || "Imagem";
        const adName = latestRow.ad_name || "Desconhecido";
        const campaignName = latestRow.campaign_name || "";

        // OVERRIDE Current CPA with UI value (for absolute parity even in rounding)
        if (metrics?.cpl !== undefined && metrics.cpl !== null) {
            console.log(`[PARITY] Using UI-provided actual cpl: ${metrics.cpl}`);
            cpa = metrics.cpl;
        }

        // 5. Daily Aggregation for Regression (1 point per day)
        const dailyAgg: Record<string, { spend: number, convs: number }> = {};
        filteredData.forEach(d => {
            const date = d.data_referencia.split('T')[0]; // Date truncation consistency
            if (!dailyAgg[date]) dailyAgg[date] = { spend: 0, convs: 0 };
            dailyAgg[date].spend += (d.investimento || 0);
            dailyAgg[date].convs += (d.conversoes || 0);
        });

        const dailyData = Object.entries(dailyAgg)
            .map(([date, metrics]) => ({ date, ...metrics }))
            .filter(d => d.convs > 0 && d.spend > 0) // ALIGNED: Must have spend and conversions
            .sort((a, b) => a.date.localeCompare(b.date)) // ALIGNED string sort
            .slice(-14);

        console.log(`[DEBUG] active regression days: ${dailyData.length}`);
        console.log(`[DEBUG] dailyData CPLs:`, dailyData.map(d => (d.spend / d.convs).toFixed(2)));

        let forecast = { predicted_cpl: null as number | null, trend_direction: "stable", confidence_r2: 0 };
        if (dailyData.length >= 5) { // FIX: Match frontend minimum (not 2)
            const x = dailyData.map((_, i) => i + 1);
            const y = dailyData.map(d => d.spend / d.convs);
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

                // ALIGNED: Pure float projection, round only at output
                forecast.predicted_cpl = Math.max(0, slope * (n + 1) + intercept);

                // OVERRIDE with UI values if provided (Absolute Parity)
                if (metrics?.predicted_cpl !== undefined && metrics.predicted_cpl !== null) {
                    console.log(`[PARITY] Using UI-provided predicted_cpl: ${metrics.predicted_cpl}`);
                    forecast.predicted_cpl = metrics.predicted_cpl;
                }

                forecast.confidence_r2 = Number(r2.toFixed(2));
                forecast.trend_direction = slope > 0.5 ? "rising" : slope < -0.5 ? "falling" : "stable";

                console.log(`[DEBUG] slope: ${slope.toFixed(4)}, intercept: ${intercept.toFixed(2)}, predicted: ${forecast.predicted_cpl}`);
            }
        }

        const performanceSnapshot: PerformanceSnapshot = {
            ctr, cpa, conversions: totals.conversions, impressions: totals.impressions,
            clicks: totals.clicks, spend: totals.spend,
            trend: forecast.trend_direction === "rising" ? "declining" : forecast.trend_direction === "falling" ? "improving" : "stable",
            forecast
        };

        // 5. Image & Prompt (ANDROMEDA STRATEGY 2.0)
        let imageBase64: string | null = null;
        if (asset.image_url) imageBase64 = await fetchImageAsBase64(asset.image_url);

        const isVideo = creativeType.toLowerCase().includes("video") || creativeType.toLowerCase().includes("vídeo");
        const hookBenchmark = isVideo ? "25% (Vídeo)" : "1.0% (Imagem)";
        const holdBenchmark = isVideo ? "30% (ThruPlay/3s)" : "85% (Link/All)";

        const prompt = `ATUE COMO: Gaia, Inteligência Artificial de Performance e Diretora de Criação da Ulbra (Andromeda System).

CONTEXTO DO CRIATIVO:
- Nome: ${adName}
- Campanha: ${campaignName}
- Formato: ${creativeType} (Analise conforme o formato)
- Período: ${startDate} a ${endDate}

PERFORMANCE REAL:
- Investimento: R$ ${totals.spend.toFixed(2)}
- Impressões: ${totals.impressions}
- Conversões: ${totals.conversions} (CPA R$ ${cpa ? cpa.toFixed(2) : 'N/A'})
- Previsão Trend: ${forecast.trend_direction} (CPA Futuro: R$ ${forecast.predicted_cpl ? forecast.predicted_cpl.toFixed(2) : 'N/A'})

SAÚDE DO CRIATIVO (Protocolo Andromeda):
1. HOOK RATE (Gancho/Parada): ${avgHook}%
   (Meta: > ${hookBenchmark})
2. HOLD RATE (Retenção/Interesse): ${avgHold}%
   (Meta: > ${holdBenchmark})
   *Nota Técnica: Vídeo usa ThruPlay (15s). Imagem usa proporção de clique no link.*
3. CTR LINK (Tráfego): ${ctr}%
4. FREQUÊNCIA ATUAL: ${currentFreq}x

TABELA DE REFERÊNCIA (Score Andromeda):
- VÍDEO HOOK (Meta 25%): <15% (Ruim), 15-25% (Médio), >25% (Bom)
- VÍDEO HOLD (Meta 30%): <20% (Ruim), 20-30% (Médio), >30% (Bom)
- IMAGEM HOOK (Meta 1.0%): <0.5% (Ruim), 0.5-1.0% (Médio), >1.0% (Bom)
- IMAGEM HOLD (Meta 85%): <60% (Ruim), 60-85% (Médio), >85% (Bom)

DIRETRIZES ESTRATÉGICAS:
1. "A PERGUNTA DE OURO": Das pessoas que pararam (Hook), quantas prendemos por 15s ou levaram pro site (Hold)?
   - *Resumo Mental*: O Hook é o vitrinista chamando o cliente na rua; o Hold é o vendedor convencendo o cliente a entrar na loja.
   - Se Hook alto e Hold baixo: "Clickbait" ou quebra de expectativa. Visual bom, conteúdo fraco.
   - Se Hook baixo e Hold alto: "Conteúdo Sênior". Capa ruim, mas quem entra, fica. (Melhorar Thumb).
2. APRENDIZADO vs RESULTADO:
   - Se Impressões < 2000 ou Conversões < 3: Declare status "EM APRENDIZADO". Recomende "AGUARDAR" e não pausar.
3. FADIGA:
   - Se Freq > 2.5x E Hook estiver baixo/caindo: Declare "FADIGA VISUAL".
4. NOMENCLATURA:
   - Se vir tags como [C1], entenda como Topo de Funil (foco em Hook). Se [C3], Fundo (foco em CPA).

Retorne EXCLUSIVAMENTE um JSON:
{
  "visual_description": "Descreva o que vê (cores, elementos, copy)...",
  "why_performs": "Explique o sucesso/fracasso correlacionando Hook (Atenção) vs Hold (Retenção)...",
  "improvement_suggestions": ["Sugestão 1 (Visual/Capa)", "Sugestão 2 (Conteúdo/Copy)", "Sugestão 3 (Estratégica)"],
  "fatigue_risk": "low"|"medium"|"high",
  "recommended_action": "scale"|"pause"|"iterate"|"test",
  "confidence_score": 0.0 a 1.0
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
