// ============================================================================
// SUPABASE EDGE FUNCTION: analyze-with-llm
// ============================================================================
// Descrição: Analisa criativos usando Gemini LLM (copy + visual)
// Autor: @dev
// Data: 04/02/2026
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

// Configurações
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Types
interface AnalysisRequest {
    ad_id: string;
    title?: string;
    body?: string;
    image_url?: string;
    performance: {
        conversions: number;
        cpl: number;
        ctr: number;
    };
}

interface CopyAnalysis {
    tone: string;
    mental_triggers: string[];
    score: number;
    suggestions: string;
}

interface VisualAnalysis {
    emotion: string;
    score: number;
    suggestions: string;
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

serve(async (req) => {
    const startTime = Date.now();

    try {
        // 1. Parse request
        const requestData: AnalysisRequest = await req.json();
        const { ad_id, title, body, image_url, performance } = requestData;

        if (!ad_id) {
            return new Response(
                JSON.stringify({ error: "ad_id is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // 2. Inicializar Supabase Client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // 3. Verificar se já existe análise
        const { data: existingInsight } = await supabase
            .from('fact_creative_insights')
            .select('*')
            .eq('ad_id', ad_id)
            .order('analyzed_at', { ascending: false })
            .limit(1)
            .single();

        if (existingInsight) {
            console.log(`[EXISTING ANALYSIS] ad_id: ${ad_id}`);
            return new Response(JSON.stringify(existingInsight), {
                headers: { "Content-Type": "application/json" },
            });
        }

        console.log(`[NEW ANALYSIS] ad_id: ${ad_id}`);

        // 4. Análise de Copy
        let copyAnalysis: CopyAnalysis | null = null;

        if (title || body) {
            copyAnalysis = await analyzeCopy(title, body, performance);
        }

        // 5. Análise Visual
        let visualAnalysis: VisualAnalysis | null = null;

        if (image_url) {
            visualAnalysis = await analyzeVisual(image_url, performance);
        }

        // 6. Salvar insights no banco
        const processingTime = Date.now() - startTime;

        const { data: savedInsight, error: saveError } = await supabase
            .from('fact_creative_insights')
            .insert({
                ad_id,
                copy_tone: copyAnalysis?.tone || null,
                mental_triggers: copyAnalysis?.mental_triggers || null,
                copy_score: copyAnalysis?.score || null,
                copy_suggestions: copyAnalysis?.suggestions || null,
                visual_emotion: visualAnalysis?.emotion || null,
                visual_score: visualAnalysis?.score || null,
                visual_suggestions: visualAnalysis?.suggestions || null,
                conversions_at_analysis: performance.conversions,
                cpl_at_analysis: performance.cpl,
                ctr_at_analysis: performance.ctr,
                processing_time_ms: processingTime,
            })
            .select()
            .single();

        if (saveError) {
            console.error(`[DB SAVE ERROR]`, saveError);
            return new Response(
                JSON.stringify({ error: "Failed to save insights", details: saveError }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        console.log(`[SUCCESS] ad_id: ${ad_id} - Analysis completed in ${processingTime}ms`);

        return new Response(JSON.stringify(savedInsight), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(`[UNEXPECTED ERROR]`, error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});

// ============================================================================
// ANÁLISE DE COPY (TEXTO)
// ============================================================================

async function analyzeCopy(
    title: string | undefined,
    body: string | undefined,
    performance: { conversions: number; cpl: number; ctr: number }
): Promise<CopyAnalysis> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const copyText = [title, body].filter(Boolean).join("\n\n");

    const prompt = `
Você é um especialista em copywriting para anúncios de cursos superiores.

Analise este anúncio:

TÍTULO: "${title || 'N/A'}"
TEXTO: "${body || 'N/A'}"

PERFORMANCE:
- Conversões: ${performance.conversions}
- CPL: R$ ${performance.cpl}
- CTR: ${performance.ctr}%

Retorne APENAS um JSON válido (sem markdown, sem explicações) com esta estrutura:
{
  "tone": "urgente|emocional|racional",
  "mental_triggers": ["escassez", "prova_social", "autoridade"],
  "score": 8,
  "suggestions": "Adicionar número específico de vagas disponíveis para aumentar urgência"
}

REGRAS:
- tone: escolha apenas UMA opção (urgente, emocional ou racional)
- mental_triggers: array com 1-3 gatilhos identificados
- score: número de 1 a 10 (qualidade do copy)
- suggestions: texto livre com 1-2 sugestões práticas
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Limpar markdown se houver
    const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
        return JSON.parse(jsonText);
    } catch (parseError) {
        console.error(`[JSON PARSE ERROR] Copy Analysis:`, jsonText);
        // Fallback
        return {
            tone: "racional",
            mental_triggers: [],
            score: 5,
            suggestions: "Não foi possível analisar o copy automaticamente.",
        };
    }
}

// ============================================================================
// ANÁLISE VISUAL (IMAGEM)
// ============================================================================

async function analyzeVisual(
    imageUrl: string,
    performance: { conversions: number; cpl: number; ctr: number }
): Promise<VisualAnalysis> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Fetch image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    const prompt = `
Você é um especialista em design de anúncios para cursos superiores.

Analise esta imagem de anúncio.

PERFORMANCE:
- Conversões: ${performance.conversions}
- CPL: R$ ${performance.cpl}
- CTR: ${performance.ctr}%

Retorne APENAS um JSON válido (sem markdown, sem explicações) com esta estrutura:
{
  "emotion": "aspiracional|confiança|urgência",
  "score": 7,
  "suggestions": "Adicionar texto overlay com benefício principal para aumentar clareza"
}

REGRAS:
- emotion: escolha apenas UMA opção (aspiracional, confiança ou urgência)
- score: número de 1 a 10 (qualidade visual)
- suggestions: texto livre com 1-2 sugestões práticas
`;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg",
            },
        },
    ]);

    const responseText = result.response.text();

    // Limpar markdown se houver
    const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
        return JSON.parse(jsonText);
    } catch (parseError) {
        console.error(`[JSON PARSE ERROR] Visual Analysis:`, jsonText);
        // Fallback
        return {
            emotion: "confiança",
            score: 5,
            suggestions: "Não foi possível analisar a imagem automaticamente.",
        };
    }
}
