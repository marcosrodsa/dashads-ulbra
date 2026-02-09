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

        // A. Ultra-Resilient Payload Extraction
        let adId = "";

        // 1. Try Query Parameters (First priority for simple triggers)
        const url = new URL(req.url);
        adId = url.searchParams.get("adId") || url.searchParams.get("ad_id") || url.searchParams.get("id") || "";

        // 2. Try JSON Body (If not in Query Params)
        if (!adId && req.method !== "GET") {
            try {
                const body = await req.json();
                console.log("Incoming Payload:", JSON.stringify(body));

                if (Array.isArray(body)) {
                    const first = body[0];
                    adId = first?.adId || first?.ad_id || first?.id || "";
                } else if (body && typeof body === "object") {
                    adId = (body as any).adId || (body as any).ad_id || (body as any).id || "";
                } else if (typeof body === "string") {
                    adId = body;
                }
            } catch (e) {
                console.warn("Payload is not JSON or empty:", (e as Error).message);
            }
        }

        if (!adId) {
            console.error("Critical: Could not find adId in URL or Body");
            throw new Error("Missing adId in payload (Checked: Query Params, JSON Body [adId, ad_id, id])");
        }

        // 1. Fetch Ad & Creative Info (Adding account_id, image_hash and object_story_spec)
        console.log(`Enriching creative for adId: ${adId}`);
        const adResponse = await fetch(
            `https://graph.facebook.com/v21.0/${adId}?fields=account_id,preview_shareable_link,effective_status,adlabels,recommendations,creative{id,name,title,body,image_url,thumbnail_url,video_id,effective_object_story_id,image_hash,object_story_spec,asset_feed_spec}&access_token=${META_API_KEY}`
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

        // --- RAIO-X LOG (Squad Debug) ---
        console.log("--------- RAIO-X: AD CREATIVE OBJECT ---------");
        console.log(JSON.stringify(creative, null, 2));
        console.log("----------------------------------------------");

        // 2. High-Resolution Asset Retrieval Strategy
        let highResImageUrl = creative.image_url || creative.thumbnail_url || "";
        const storyId = creative.effective_object_story_id;
        const accountId = adData.account_id;

        // --- TRIPLE-THREAT ASSET RETRIEVAL ---
        let foundHash = creative.image_hash;

        // A. Hunt in Story Spec
        if (!foundHash && creative.object_story_spec) {
            const spec = creative.object_story_spec;
            console.log("Deep Hunting in object_story_spec...");
            foundHash = spec.link_data?.image_hash ||
                spec.photo_data?.image_hash ||
                spec.video_data?.image_hash ||
                spec.link_data?.child_attachments?.[0]?.image_hash;
        }

        // B. Hunt in Asset Feed (Dynamic Ads)
        if (!foundHash && creative.asset_feed_spec) {
            console.log("Deep Hunting in asset_feed_spec...");
            const assets = creative.asset_feed_spec.images || [];
            foundHash = assets[0]?.hash;
            if (assets[0]?.url && !highResImageUrl) highResImageUrl = assets[0].url;
        }

        if (foundHash) console.log(`🔍 Hash detected: ${foundHash}`);
        else console.log("⚠️ No image_hash found in Creative or Specs");

        // Strategy 1: Fetch via Image Hash (Requires only ads_read)
        if (foundHash && accountId) {
            console.log(`Fetching high-res asset via Image Hash: ${foundHash}`);
            try {
                const adImageResponse = await fetch(
                    `https://graph.facebook.com/v21.0/act_${accountId}/adimages?hashes=["${foundHash}"]&fields=permalink_url,url,original_height,original_width&access_token=${META_API_KEY}`
                );
                const adImageData = await adImageResponse.json();
                const imageAsset = adImageData.data?.[0];

                if (imageAsset?.permalink_url) {
                    highResImageUrl = imageAsset.permalink_url;
                    console.log("✅ High-res permalink_url found via Image Hash");
                }
            } catch (e) {
                console.warn("Could not fetch high-res via image hash:", e);
            }
        }

        // Strategy 2: If hash failed or not available, try Story (Fallback)
        if (storyId && (!highResImageUrl || highResImageUrl === creative.image_url || highResImageUrl.includes("p64x64"))) {
            console.log(`Fallback: Fetching story assets for storyId: ${storyId}`);
            try {
                const storyResponse = await fetch(
                    `https://graph.facebook.com/v21.0/${storyId}?fields=full_picture,picture,attachments{media}&access_token=${META_API_KEY}`
                );
                const storyData = await storyResponse.json();

                if (storyData.error) {
                    console.warn(`Story fetch blocked by permission: ${storyData.error.message}`);
                } else if (storyData.full_picture) {
                    highResImageUrl = storyData.full_picture;
                    console.log("✅ High-res full_picture found via Story");
                } else if (storyData.attachments?.data?.[0]?.media?.image?.src) {
                    highResImageUrl = storyData.attachments.data[0].media.image.src;
                    console.log("✅ High-res image found in Story attachments");
                }
            } catch (e) {
                console.warn("Could not fetch high-res story picture:", e);
            }
        }

        // Strategy 3: Ultimate Fallback via AdPreview (Scraping the preview src)
        if (!highResImageUrl || highResImageUrl === creative.image_url || highResImageUrl.includes("p64x64")) {
            console.log("Ultimate Fallback: Extracting from AdPreview...");
            try {
                const previewResponse = await fetch(
                    `https://graph.facebook.com/v21.0/${creative.id}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${META_API_KEY}`
                );
                const previewData = await previewResponse.json();
                const html = previewData.data?.[0]?.body;
                if (html) {
                    const imgMatch = html.match(/src="(https:\/\/scontent[^"]+)/);
                    if (imgMatch && imgMatch[1]) {
                        highResImageUrl = imgMatch[1].replace(/&amp;/g, '&');
                        console.log("✅ High-res image extracted from AdPreview");
                    }
                }
            } catch (e) {
                console.warn("Could not extract from preview:", e);
            }
        }

        const isVideo = !!creative.video_id;
        const creativeType = isVideo ? "VIDEO" : "IMAGE";

        // C. Video Thumbnail Strategy
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
                    if (!foundHash && !storyId) highResImageUrl = bestThumbnail.uri;
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

        // --- TEXT EXTRACTION STRATEGY ---
        let adBody = creative.body || "";

        // A. Hunt in Object Story Spec (Link/Photo/Video)
        if (!adBody && creative.object_story_spec) {
            const spec = creative.object_story_spec;
            console.log("Deep Hunting for Text in object_story_spec...");
            adBody = spec.link_data?.message ||
                spec.photo_data?.caption ||
                spec.video_data?.message ||
                spec.text_data?.message || // Sometimes simple text ads
                "";
        }

        // B. Hunt in Asset Feed (DCO / Dynamic Ads)
        if (!adBody && creative.asset_feed_spec) {
            console.log("Deep Hunting for Text in asset_feed_spec...");
            const bodies = creative.asset_feed_spec.bodies || [];
            if (bodies.length > 0 && bodies[0].text) {
                adBody = bodies[0].text;
            }
        }

        // C. Ultimate Fallback: Fetch Story Message via Graph API
        if (!adBody && storyId) {
            console.log(`Fallback: Fetching story message for storyId: ${storyId}`);
            try {
                const storyMsgResponse = await fetch(
                    `https://graph.facebook.com/v21.0/${storyId}?fields=message&access_token=${META_API_KEY}`
                );
                const storyMsgData = await storyMsgResponse.json();
                if (storyMsgData.message) {
                    adBody = storyMsgData.message;
                    console.log("✅ Text found via Story ID");
                }
            } catch (e) {
                console.warn("Could not fetch story message:", e);
            }
        }

        if (adBody) console.log("✅ Ad Body Extracted:", adBody.substring(0, 50) + "...");
        else console.warn("⚠️ No Ad Body found after deep hunt");

        const assets = {
            ad_id: adId,
            title: creative.title || "",
            body: adBody,
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
