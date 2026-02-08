// Supabase Edge Function: gaia-contextual-analysis
// Analyzes creatives WITH performance context (KPIs) for actionable insights

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Missing environment variables");
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

        const firstHalfConv = firstHalf.reduce((sum: number, r: any) => sum + (r.conversoes || 0), 0);
        const secondHalfConv = secondHalf.reduce((sum: number, r: any) => sum + (r.conversoes || 0), 0);

        let trend: "improving" | "stable" | "declining" = "stable";
        if (secondHalfConv > firstHalfConv * 1.2) trend = "improving";
        else if (secondHalfConv < firstHalfConv * 0.8) trend = "declining";

        const performanceSnapshot: PerformanceSnapshot = {
            ctr,
            cpa,
            conversions: totals.conversions,
            impressions: totals.impressions,
            clicks: totals.clicks,
            spend: totals.spend,
            trend
        };

        console.log("Performance snapshot:", performanceSnapshot);

        // 4. Build contextual prompt for Gemini
        const prompt = `Você é a Gaia, uma Diretora de Criação Sênior especializada em anúncios de performance para instituições de ensino superior no Brasil (Ulbra).

Analise este criativo com base nos dados de performance REAIS fornecidos. Sua análise deve explicar POR QUE ele performa dessa forma.

**Dados do Criativo:**
- Título: ${asset.title || "N/A"}
- Copy: ${asset.body || "N/A"}
- Tipo: ${asset.creative_type || "IMAGE"}
${asset.hook_rate ? `- Hook Rate: ${asset.hook_rate}%` : ""}
${asset.hold_rate ? `- Hold Rate: ${asset.hold_rate}%` : ""}

**Performance Real (${startDate} a ${endDate}):**
- Impressões: ${totals.impressions.toLocaleString('pt-BR')}
- Cliques: ${totals.clicks.toLocaleString('pt-BR')}
- CTR: ${ctr}%
- Conversões: ${totals.conversions}
- CPA: ${cpa ? `R$ ${cpa.toFixed(2)}` : "N/A (sem conversões)"}
- Investimento: R$ ${totals.spend.toFixed(2)}
- Tendência: ${trend === "improving" ? "📈 Melhorando" : trend === "declining" ? "📉 Caindo" : "➡️ Estável"}

**Instruções:**
1. Explique POR QUE este criativo está performando assim (relacione copy/visual com os KPIs)
2. Sugira 2-3 melhorias específicas e acionáveis
3. Identifique o risco de fadiga (low/medium/high)
4. Recomende UMA ação: scale (escalar investimento), pause (pausar), iterate (criar variação), test (testar A/B)

**Formato de Resposta (JSON):**
{
  "why_performs": "Explicação detalhada conectando elementos criativos aos resultados...",
  "improvement_suggestions": ["Sugestão 1", "Sugestão 2", "Sugestão 3"],
  "fatigue_risk": "low" | "medium" | "high",
  "recommended_action": "scale" | "pause" | "iterate" | "test",
  "confidence_score": 0.85
}

Retorne apenas o JSON válido.`;

        // 5. Call Gemini API
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    },
                }),
            }
        );

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
        }

        const geminiData = await geminiResponse.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const tokensUsed = geminiData.usageMetadata?.totalTokenCount || 0;

        // 6. Parse JSON response
        let analysis = {
            why_performs: "Análise não disponível",
            improvement_suggestions: [] as string[],
            fatigue_risk: "medium" as const,
            recommended_action: "iterate" as const,
            confidence_score: 0.5
        };

        try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                analysis = {
                    why_performs: parsed.why_performs || analysis.why_performs,
                    improvement_suggestions: parsed.improvement_suggestions || [],
                    fatigue_risk: parsed.fatigue_risk || "medium",
                    recommended_action: parsed.recommended_action || "iterate",
                    confidence_score: parsed.confidence_score || 0.5
                };
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
            improvement_suggestions: analysis.improvement_suggestions,
            fatigue_risk: analysis.fatigue_risk,
            recommended_action: analysis.recommended_action,
            confidence_score: analysis.confidence_score,
            llm_model: "gemini-flash-latest",
            tokens_used: tokensUsed
        };

        const { error: insertError } = await supabase
            .from("creative_contextual_insights")
            .upsert(insertPayload, {
                onConflict: "ad_id,analysis_period_start,analysis_period_end"
            });

        if (insertError) {
            console.error("Insert error:", insertError);
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
