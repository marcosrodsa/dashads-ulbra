// ============================================================================
// SUPABASE EDGE FUNCTION: enrich-creative
// ============================================================================
// Descrição: Busca assets criativos da Meta Graph API e armazena em cache
// Autor: @dev
// Data: 04/02/2026
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configurações
const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN")!;
const GRAPH_API_VERSION = "v21.0";
const CACHE_TTL_DAYS = 7;

// Types
interface CreativeAssets {
    ad_id: string;
    title: string | null;
    body: string | null;
    cta_type: string | null;
    image_url: string | null;
    video_id: string | null;
    video_thumbnail_url: string | null;
    creative_type: string;
    fetched_at: string;
}

interface GraphAPIResponse {
    id: string;
    creative?: {
        title?: string;
        body?: string;
        call_to_action_type?: string;
        image_url?: string;
        video_id?: string;
        object_story_spec?: {
            link_data?: {
                name?: string;
                message?: string;
            };
        };
    };
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

serve(async (req) => {
    try {
        // 1. Parse request
        const { ad_id } = await req.json();

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

        // 3. Verificar cache
        const { data: cached, error: cacheError } = await supabase
            .from('fact_creative_assets')
            .select('*')
            .eq('ad_id', ad_id)
            .single();

        // Se cache válido (< 7 dias e não stale), retornar
        if (cached && !cached.is_stale && isWithinDays(cached.fetched_at, CACHE_TTL_DAYS)) {
            console.log(`[CACHE HIT] ad_id: ${ad_id}`);
            return new Response(JSON.stringify(cached), {
                headers: { "Content-Type": "application/json" },
            });
        }

        console.log(`[CACHE MISS] ad_id: ${ad_id} - Fetching from Graph API`);

        // 4. Buscar na Meta Graph API
        const graphUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${ad_id}`;
        const params = new URLSearchParams({
            fields: 'creative{title,body,call_to_action_type,image_url,video_id,object_story_spec}',
            access_token: META_ACCESS_TOKEN,
        });

        const graphResponse = await fetch(`${graphUrl}?${params}`);

        if (!graphResponse.ok) {
            const errorText = await graphResponse.text();
            console.error(`[GRAPH API ERROR] ${graphResponse.status}: ${errorText}`);

            // Salvar erro no banco
            await supabase
                .from('fact_creative_assets')
                .upsert({
                    ad_id,
                    fetch_error: `Graph API error: ${graphResponse.status}`,
                    fetch_attempts: (cached?.fetch_attempts || 0) + 1,
                    fetched_at: new Date().toISOString(),
                });

            return new Response(
                JSON.stringify({
                    error: "Graph API error",
                    status: graphResponse.status,
                    details: errorText
                }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const data: GraphAPIResponse = await graphResponse.json();
        const creative = data.creative;

        if (!creative) {
            return new Response(
                JSON.stringify({ error: "No creative data found for this ad_id" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        // 5. Processar dados
        const assets: CreativeAssets = {
            ad_id,
            title: creative.title || creative.object_story_spec?.link_data?.name || null,
            body: creative.body || creative.object_story_spec?.link_data?.message || null,
            cta_type: creative.call_to_action_type || null,
            image_url: creative.image_url || null,
            video_id: creative.video_id || null,
            video_thumbnail_url: null,
            creative_type: creative.video_id ? 'video' : 'image',
            fetched_at: new Date().toISOString(),
        };

        // 6. Se for vídeo, buscar thumbnail
        if (creative.video_id) {
            try {
                const videoUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${creative.video_id}`;
                const videoParams = new URLSearchParams({
                    fields: 'picture',
                    access_token: META_ACCESS_TOKEN,
                });

                const videoResponse = await fetch(`${videoUrl}?${videoParams}`);

                if (videoResponse.ok) {
                    const videoData = await videoResponse.json();
                    assets.video_thumbnail_url = videoData.picture || null;
                }
            } catch (videoError) {
                console.error(`[VIDEO FETCH ERROR] video_id: ${creative.video_id}`, videoError);
                // Continuar mesmo se falhar (thumbnail é opcional)
            }
        }

        // 7. Salvar/atualizar cache
        const { data: savedAssets, error: saveError } = await supabase
            .from('fact_creative_assets')
            .upsert({
                ...assets,
                is_stale: false,
                fetch_error: null,
                fetch_attempts: 0,
            })
            .select()
            .single();

        if (saveError) {
            console.error(`[DB SAVE ERROR]`, saveError);
            return new Response(
                JSON.stringify({ error: "Failed to save to database", details: saveError }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        console.log(`[SUCCESS] ad_id: ${ad_id} - Assets saved to cache`);

        return new Response(JSON.stringify(savedAssets), {
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
// FUNÇÕES AUXILIARES
// ============================================================================

function isWithinDays(dateString: string, days: number): boolean {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays < days;
}
