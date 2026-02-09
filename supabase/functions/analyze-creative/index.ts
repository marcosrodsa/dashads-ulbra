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
    imageUrl?: string | null;
    title?: string | null;
    body?: string | null;
}

interface Insight {
    type: "success" | "warning" | "danger" | "tip";
    title: string;
    description: string;
}

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

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("DEBUG: analyze-creative invoked - Build: 09/02 16:45");
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

        // Check if we have an image to analyze
        let imageBase64: string | null = null;
        if (metrics.imageUrl) {
            console.log("Fetching image for analysis:", metrics.imageUrl);
            imageBase64 = await fetchImageAsBase64(metrics.imageUrl);
        }

        const prompt = `Você é a Gaia, uma especialista em performance de mídia paga para instituições de ensino superior no Brasil (Ulbra).

Analise este criativo de anúncio (imagem e texto) e forneça recomendações acionáveis.

**Dados do Criativo:**
- Nome: ${metrics.creativeName}
- Título: ${metrics.title || "N/A"}
- Copy/Texto: ${metrics.body || "N/A"}
- Conversões (leads): ${metrics.conversoes}
- CPL (Custo Por Lead): R$ ${metrics.cpl?.toFixed(2) || "N/A"}
- CPL Médio da conta: R$ ${metrics.avgCPL?.toFixed(2) || "N/A"}
- Status CPL: ${cplStatus}
- CTR: ${metrics.ctr.toFixed(2)}%
- Investimento: R$ ${metrics.investimento.toFixed(2)}
- Imagem Fornecida: ${imageBase64 ? "SIM (Use a imagem enviada para a análise visual)" : "NÃO (Ocorreu um erro técnico ao buscar a imagem)"}

**Instruções de Resposta:**
1. Descreva visualmente o criativo em 1 parágrafo (elementos, cores, texto na imagem). IMPORTANTE: Se a imagem NÃO foi fornecida (indicado acima), escreva OBRIGATORIAMENTE: "Diagnóstico visual indisponível para este criativo devido a erro de acesso à imagem." e NÃO invente ou alucine detalhes visuais nem sugestões baseadas em imagens que você não viu.
2. Analise se o criativo está saturado ou se deve ser escalado.
3. Sugira melhorias específicas baseadas no CTR, CPL e na análise visual (APENAS se a imagem estiver disponível).
4. Retorne OBRIGATORIAMENTE um JSON válido com a estrutura abaixo.

**Formato da Saída (JSON):**
{
  "visual_description": "Descrição visual detalhada da imagem...",
  "insights": [
    {
      "type": "success" | "warning" | "danger" | "tip",
      "title": "Título Curto",
      "description": "Explicação completa com ação recomendada (máximo 200 caracteres)."
    }
  ]
}

Retorne apenas o JSON.`;

        // Prepare request parts
        const parts: any[] = [{ text: prompt }];

        if (imageBase64) {
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg", // Assuming JPEG for simplicity, or detect from URL/Header if needed
                    data: imageBase64
                }
            });
        }

        // Call Gemini API (using gemini-2.5-flash as requested)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        console.log("DEBUG: Quick Analysis - Target Gemini URL:", `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 8) + '...' : 'MISSING'}`);

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
                console.warn("Gemini 429 Quota Exceeded for Quick Analysis");
                // Return a mock "Quota Exceeded" analysis result so frontend doesn't crash
                const quotaFallback = {
                    insights: [{
                        type: "warning",
                        title: "Cota da IA Excedida",
                        description: "O limite gratuito da API do Google Gemini foi atingido. Tente novamente em alguns minutos."
                    }],
                    visualDescription: "Diagnóstico indisponível temporariamente devido a limite de cota da IA.",
                    success: true,
                    saved: false
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

        console.log(`DEBUG: Gemini Response - FinishReason: ${finishReason}, Length: ${rawText.length}`);

        if (finishReason === "MAX_TOKENS") {
            console.warn("⚠️ Gemini response truncated due to MAX_TOKENS limit.");
        }

        // Parse JSON from response
        // Parse JSON from response
        let insights: Insight[] = [];
        let visualDescription = "";

        try {
            // Remove Markdown code blocks if present (though JSON mode should prevent this)
            const cleanText = rawText.replace(/```json\n?|```/g, "").trim();

            if (cleanText.startsWith("{") && !cleanText.endsWith("}")) {
                console.warn("DEBUG: JSON appears truncated. Response length:", cleanText.length);
            }

            const parsed = JSON.parse(cleanText);

            if (Array.isArray(parsed)) {
                // Old format fallback
                insights = parsed;
            } else if (parsed.insights) {
                // New format
                insights = parsed.insights;
                visualDescription = parsed.visual_description || "";
            }

        } catch (parseError) {
            console.error("Parse Error:", parseError, "Raw:", rawText);
            // Try regex fallback for insights array
            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                try {
                    insights = JSON.parse(jsonMatch[0]);
                } catch (e) { }
            }

            if (insights.length === 0) {
                insights = [{
                    type: "warning",
                    title: "Gaia: Erro de Formatação",
                    description: "A IA gerou a análise, mas o formato não pôde ser interpretado. Tente regerar."
                }];
            }
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
            visual_description: visualDescription, // NEW: Save description in history
            diagnostico: JSON.stringify(insights), // Saving insights array as text/json
            analyzed_at: new Date().toISOString(),
            llm_model: "gemini-2.5-flash",
            conversions_at_analysis: metrics.conversoes,
            cpl_at_analysis: metrics.cpl,
            ctr_at_analysis: metrics.ctr
        };

        const { error: insertError } = await supabase
            .from("fact_creative_insights")
            .insert(insertPayload);

        if (insertError) {
            console.error("DEBUG: Insert error fact_creative_insights:", JSON.stringify(insertError));
            if (insertError.code === "PGRST204" || (insertError as any).message?.includes("column")) {
                console.warn("CRITICAL: Column 'visual_description' seems to be missing in 'fact_creative_insights'. Run sql/consolidate_gaia_history.sql");
            }
        }

        // 4. Upsert visual description to fact_creative_vectors
        if (visualDescription) {
            console.log("Upserting visual description...");
            const { error: vectorError } = await supabase
                .from("fact_creative_vectors")
                .upsert({
                    ad_id: metrics.creativeId,
                    visual_description: visualDescription
                }, { onConflict: "ad_id" });

            if (vectorError) console.error("Error upserting vectors:", vectorError);
        }

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
