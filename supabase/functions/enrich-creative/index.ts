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

        // A. Robust Payload Parsing
        let adId = "";
        try {
            const body = await req.json();
            console.log("Raw Payload received:", JSON.stringify(body));
            adId = body.adId;
        } catch (e) {
            console.error("Failed to parse JSON body:", e);
            throw new Error("Invalid JSON payload");
        }

        if (!adId) throw new Error("Missing adId in payload");

        // 1. Fetch Ad & Creative Info (Adding effective_object_story_id)
        console.log(`Enriching creative for adId: ${adId}`);
        const adResponse = await fetch(
            `https://graph.facebook.com/v21.0/${adId}?fields=preview_shareable_link,effective_status,adlabels,recommendations,creative{id,name,title,body,image_url,thumbnail_url,video_id,effective_object_story_id}&access_token=${META_API_KEY}`
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

        // 2. High-Resolution Asset Retrieval Strategy
        let highResImageUrl = creative.image_url || creative.thumbnail_url || "";
        const storyId = creative.effective_object_story_id;

        // B. If it's a Post-based ad, fetch rich assets (full_picture, picture, attachments)
        if (storyId) {
            console.log(`Fetching high-res story assets for storyId: ${storyId}`);
            try {
                // Expanding fields to find the best possible image
                const storyResponse = await fetch(
                    `https://graph.facebook.com/v21.0/${storyId}?fields=full_picture,picture,attachments{media}&access_token=${META_API_KEY}`
                );
                const storyData = await storyResponse.json();
                console.log("Story Metadata received:", JSON.stringify(storyData));

                if (storyData.full_picture) {
                    highResImageUrl = storyData.full_picture;
                    console.log("✅ High-res full_picture found");
                } else if (storyData.attachments?.data?.[0]?.media?.image?.src) {
                    highResImageUrl = storyData.attachments.data[0].media.image.src;
                    console.log("✅ High-res image found in attachments");
                } else if (storyData.picture) {
                    highResImageUrl = storyData.picture;
                    console.log("⚠️ Fallback to 'picture' field (medium res)");
                }
            } catch (e) {
                console.warn("Could not fetch high-res story picture:", e);
            }
        }

        const isVideo = !!creative.video_id;
        const creativeType = isVideo ? "VIDEO" : "IMAGE";

        // B. If it's a video, try to get the highest quality thumbnail
        let videoThumbnailUrl = creative.thumbnail_url || null;
        if (isVideo && creative.video_id) {
            console.log(`Fetching highest quality thumbnail for video: ${creative.video_id}`);
            try {
                const videoAssetResponse = await fetch(
                    `https://graph.facebook.com/v21.0/${creative.video_id}?fields=thumbnails{uri,is_preferred,height,width}&access_token=${META_API_KEY}`
                );
                const videoAssetData = await videoAssetResponse.json();
                const bestThumbnail = videoAssetData.thumbnails?.data?.sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0];
                if (bestThumbnail?.uri) {
                    videoThumbnailUrl = bestThumbnail.uri;
                    // Also use this as the primary image_url if it's high res
                    if (!storyId) highResImageUrl = bestThumbnail.uri;
                }
            } catch (e) {
                console.warn("Could not fetch high-res video thumbnail:", e);
            }
        }

        console.log(`Detected type: ${creativeType} for adId: ${adId}`);

        // 3. Fetch Video Metrics (ONLY if video)
        let hookRate = null;
        let holdRate = null;

        if (isVideo) {
            // ... (keep existing metrics code)
            const insightResponse = await fetch(
                `https://graph.facebook.com/v21.0/${adId}/insights?fields=video_3_sec_watched_actions,video_p100_watched_actions,impressions&access_token=${META_API_KEY}`
            );
            const insightData = await insightResponse.json();
            const insights = insightData.data?.[0];

            if (insights) {
                const impressions = parseInt(insights.impressions || "0");
                const v3s = insights.video_3_sec_watched_actions?.find((a: any) => a.action_type === "video_view")?.value || 0;
                const v100 = insights.video_p100_watched_actions?.find((a: any) => a.action_type === "video_view")?.value || 0;
                if (impressions > 0) hookRate = Number(((v3s / impressions) * 100).toFixed(2));
                if (v3s > 0) holdRate = Number(((v100 / v3s) * 100).toFixed(2));
            }
        }

        const assets = {
            ad_id: adId,
            title: creative.title || "",
            body: creative.body || "",
            image_url: highResImageUrl,
            video_id: creative.video_id || null,
            video_thumbnail_url: videoThumbnailUrl,
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
