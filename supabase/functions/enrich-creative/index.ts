import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichRequest {
    adId: string;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const META_API_KEY = Deno.env.get("META_API_KEY");
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!META_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Missing environment variables");
        }

        const { adId } = await req.json() as EnrichRequest;
        if (!adId) throw new Error("Missing adId");

        // 1. Fetch Ad & Creative Info
        console.log(`Enriching creative for adId: ${adId}`);
        // Fetching both ad-level fields and creative fields
        const adResponse = await fetch(
            `https://graph.facebook.com/v21.0/${adId}?fields=preview_shareable_link,effective_status,adlabels,recommendations,creative{id,name,title,body,image_url,thumbnail_url,video_id}&access_token=${META_API_KEY}`
        );
        const adData = await adResponse.json();

        if (adData.error) {
            console.error("Meta API error:", adData.error);
            throw new Error(`Meta API Error: ${adData.error.message}`);
        }

        const creative = adData.creative;
        if (!creative) {
            console.error("Creative data not found in Meta response:", adData);
            throw new Error("Creative not found");
        }

        // 2. Determination of Type (Simplified for Stability)
        // Meta fails if we request child_attachments for non-carousel ads.
        // For mass enrichment, we stick to basic types.
        const isVideo = !!creative.video_id;
        const creativeType = isVideo ? "VIDEO" : "IMAGE";

        console.log(`Detected type: ${creativeType} for adId: ${adId}`);

        // 3. Fetch Video Metrics (ONLY if video)
        let hookRate = null;
        let holdRate = null;

        if (isVideo) {
            console.log(`Fetching refined video insights for adId: ${adId}`);
            // Refined fields for Hook/Hold rate calculation as per user suggestion
            const insightResponse = await fetch(
                `https://graph.facebook.com/v21.0/${adId}/insights?fields=video_3_sec_watched_actions,video_p100_watched_actions,impressions&access_token=${META_API_KEY}`
            );
            const insightData = await insightResponse.json();
            const insights = insightData.data?.[0];

            if (insights) {
                const impressions = parseInt(insights.impressions || "0");

                // Filtering actions by 'video_view' as requested
                const v3s = insights.video_3_sec_watched_actions?.find((a: any) => a.action_type === "video_view")?.value || 0;
                const v100 = insights.video_p100_watched_actions?.find((a: any) => a.action_type === "video_view")?.value || 0;

                // Hook Rate (Captura): (v3s / impressions) * 100
                if (impressions > 0) hookRate = Number(((v3s / impressions) * 100).toFixed(2));

                // Hold Rate (Retenção): (v100 / v3s) * 100
                if (v3s > 0) holdRate = Number(((v100 / v3s) * 100).toFixed(2));
            }
        }

        const assets = {
            ad_id: adId,
            title: creative.title || "",
            body: creative.body || "",
            image_url: creative.image_url || creative.thumbnail_url || "",
            video_id: creative.video_id || null,
            video_thumbnail_url: creative.thumbnail_url || null,
            creative_type: creativeType,
            hook_rate: hookRate,
            hold_rate: holdRate,
            preview_shareable_link: adData.preview_shareable_link || null,
            effective_status: adData.effective_status || null,
            ad_labels: adData.adlabels?.map((l: any) => l.name) || [],
            recommendations: adData.recommendations || null,
            last_updated: new Date().toISOString(),
            is_stale: false,
            fetch_error: null
        };

        // 3. Cache in Supabase
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { error: upsertError } = await supabase
            .from("fact_creative_assets")
            .upsert(assets, { onConflict: "ad_id" });

        if (upsertError) {
            console.error("Supabase upsert error:", upsertError);
            throw new Error(`DB Error: ${upsertError.message}`);
        }

        return new Response(JSON.stringify({ assets, success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Enrichment error:", error);
        return new Response(JSON.stringify({ error: error.message, success: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
