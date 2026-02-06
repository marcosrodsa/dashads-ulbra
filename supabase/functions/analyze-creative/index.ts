// Supabase Edge Function: analyze-creative
// Uses Gemini API to generate insights for ad creatives

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreativeMetrics {
    creativeName: string;
    creativeId: string;
    conversoes: number;
    cpl: number | null;
    ctr: number;
    investimento: number;
    avgCPL: number | null;
}

interface Insight {
    type: "success" | "warning" | "danger" | "tip";
    title: string;
    description: string;
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY not configured");
        }

        const { metrics }: { metrics: CreativeMetrics } = await req.json();

        if (!metrics) {
            throw new Error("Missing metrics data");
        }

        // Build context for Gemini
        const cplRatio = metrics.cpl && metrics.avgCPL ? (metrics.cpl / metrics.avgCPL) : 1;
        const cplStatus = cplRatio < 0.7 ? "excelente (30% abaixo da média)" :
            cplRatio < 0.9 ? "bom (10-30% abaixo da média)" :
                cplRatio < 1.1 ? "na média" :
                    cplRatio < 1.3 ? "em alerta (10-30% acima da média)" :
                        "crítico (30%+ acima da média)";

        const prompt = `Você é a Gaia, uma especialista em performance de mídia paga para instituições de ensino superior no Brasil (Ulbra).

Analise este criativo de anúncio e forneça recomendações acionáveis para o time de marketing.

**Dados do Criativo:**
- Nome: ${metrics.creativeName}
- Conversões (leads): ${metrics.conversoes}
- CPL (Custo Por Lead): R$ ${metrics.cpl?.toFixed(2) || "N/A"}
- CPL Médio da conta: R$ ${metrics.avgCPL?.toFixed(2) || "N/A"}
- Status CPL: ${cplStatus}
- CTR: ${metrics.ctr.toFixed(2)}%
- Investimento: R$ ${metrics.investimento.toFixed(2)}

**Instruções de Resposta:**
1. Analise se o criativo está saturado ou se deve ser escalado.
2. Sugira melhorias específicas baseadas no CTR e no CPL.
3. Retorne OBRIGATORIAMENTE um array JSON válido.
4. Forneça entre 3 e 4 insights acionáveis.

**Formato da Saída (JSON):**
[
  {
    "type": "success" | "warning" | "danger" | "tip",
    "title": "Título Curto",
    "description": "Explicação completa com ação recomendada (máximo 200 caracteres)."
  }
]

Retorne apenas o array JSON.`;

        // Call Gemini API (using gemini-flash-latest which is stable/complete)
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
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

        // Parse JSON from response
        let insights: Insight[] = [];
        try {
            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                insights = JSON.parse(jsonMatch[0]);
            } else {
                const cleaned = rawText.replace(/```json|```/g, "").trim();
                if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
                    insights = JSON.parse(cleaned);
                }
            }
        } catch (parseError) {
            console.error("Parse Error:", parseError, "Raw:", rawText);
            insights = [{
                type: "warning",
                title: "Gaia: Erro de Formatação",
                description: "A IA gerou a análise, mas o formato não pôde ser interpretado. Tente regerar."
            }];
        }

        // 3. Save to Supabase (fact_creative_insights)
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const insertPayload = {
            ad_id: metrics.creativeId,
            copy_tone: rawText.includes("urgente") ? "Urgente" : "Profissional",
            mental_triggers: [],
            copy_score: 8,
            visual_score: 7,
            diagnostico: rawText,
            analyzed_at: new Date().toISOString(),
            llm_model: "gemini-flash-latest",
            conversions_at_analysis: metrics.conversoes,
            cpl_at_analysis: metrics.cpl,
            ctr_at_analysis: metrics.ctr
        };

        const { error: insertError } = await supabase
            .from("fact_creative_insights")
            .insert(insertPayload);

        return new Response(
            JSON.stringify({
                insights,
                success: true,
                saved: !insertError
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Edge function error:", error);
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
