// apply-sql: Fix get_gaia_data to use fact_ads_performance_daily for ALL-platform totals
// Root cause: vw_creative_analysis_complete is META only -> underreports spend by ~4x
// Fix: totals + daily from fact_ads_performance_daily (Meta + Google, all campaigns)
//      top_creatives still from vw_creative_analysis_complete (Meta, for creative names)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const dbUrl = Deno.env.get("SUPABASE_DB_URL");
        if (!dbUrl) throw new Error("SUPABASE_DB_URL not configured");

        const pool = new Pool(dbUrl, 1, true);
        const conn = await pool.connect();

        const fixGaiaData = [
            "CREATE OR REPLACE FUNCTION get_gaia_data(",
            "  p_start_date DATE,",
            "  p_end_date DATE,",
            "  p_unidade TEXT DEFAULT NULL,",
            "  p_curso TEXT DEFAULT NULL,",
            "  p_hide_branding BOOLEAN DEFAULT FALSE,",
            "  p_exclude_ead BOOLEAN DEFAULT FALSE",
            ")",
            "RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $gfn$",
            "DECLARE",
            "  v_daily JSONB;",
            "  v_creatives JSONB;",
            "  v_where_raw TEXT;",
            "  v_where_view TEXT;",
            "BEGIN",
            "  -- WHERE clause for fact_ads_performance_daily (ALL platforms - Meta + Google)",
            "  v_where_raw := format('date BETWEEN %L AND %L', p_start_date, p_end_date);",
            "  IF p_unidade IS NOT NULL AND p_unidade <> '' AND p_unidade <> 'Todas' THEN",
            "    v_where_raw := v_where_raw || format(' AND unidade ILIKE %L', '%' || p_unidade || '%');",
            "  END IF;",
            "  -- Note: NO branding filter for global totals - user asked for complete picture",
            "  IF p_exclude_ead THEN",
            "    v_where_raw := v_where_raw || ' AND unidade NOT ILIKE ''%EAD%''';",
            "  END IF;",
            "  -- WHERE clause for view (top creatives - Meta only, with filters)",
            "  v_where_view := format('data_referencia BETWEEN %L AND %L', p_start_date, p_end_date);",
            "  IF p_unidade IS NOT NULL AND p_unidade <> '' AND p_unidade <> 'Todas' THEN",
            "    v_where_view := v_where_view || format(' AND unidade ILIKE %L', '%' || p_unidade || '%');",
            "  END IF;",
            "  IF p_hide_branding THEN",
            "    v_where_view := v_where_view || ' AND campaign_name NOT ILIKE ''%Branding%'' AND campaign_name NOT ILIKE ''%Brand%''';",
            "  END IF;",
            "  IF p_exclude_ead THEN",
            "    v_where_view := v_where_view || ' AND unidade NOT ILIKE ''%EAD%''';",
            "  END IF;",
            "  -- DAILY STATS + TOTALS: from fact_ads_performance_daily (Meta + Google, real numbers)",
            "  EXECUTE format(",
            "    'SELECT jsonb_build_object(",
            "       ''totals'', jsonb_build_object(",
            "           ''spend'', COALESCE(SUM(spend), 0),",
            "           ''conversions'', COALESCE(SUM(conversions), 0),",
            "           ''impressions'', COALESCE(SUM(impressions), 0),",
            "           ''clicks'', COALESCE(SUM(clicks), 0)",
            "       ),",
            "       ''daily'', COALESCE(jsonb_agg(sub ORDER BY sub.data_referencia), ''[]''::jsonb)",
            "    )",
            "    FROM (",
            "      SELECT date as data_referencia,",
            "             SUM(spend) as spend,",
            "             SUM(conversions) as conversions,",
            "             SUM(impressions) as impressions,",
            "             SUM(clicks) as clicks",
            "      FROM fact_ads_performance_daily",
            "      WHERE %s",
            "      GROUP BY date",
            "      ORDER BY date",
            "    ) sub',",
            "    v_where_raw",
            "  ) INTO v_daily;",
            "  -- TOP CREATIVES: from vw_creative_analysis_complete (Meta, for creative names)",
            "  EXECUTE format(",
            "    'SELECT COALESCE(jsonb_agg(sub), ''[]''::jsonb)",
            "     FROM (",
            "       SELECT ad_name,",
            "              campaign_name as campanha,",
            "              MAX(unidade) as unidade,",
            "              MAX(curso) as curso,",
            "              SUM(conversoes)::int as conversions,",
            "              ROUND(SUM(investimento)::numeric, 2) as spend,",
            "              CASE WHEN SUM(conversoes) > 0 THEN ROUND((SUM(investimento)/SUM(conversoes))::numeric,2) ELSE 0 END as cpl,",
            "              CASE WHEN SUM(impressoes) > 0 THEN ROUND((SUM(cliques)::numeric/SUM(impressoes))*100,2) ELSE 0 END as ctr,",
            "              ROUND(SUM(impressoes::numeric*COALESCE(hook_rate,0))/NULLIF(SUM(impressoes),0),2) as hook_rate,",
            "              ROUND(SUM(impressoes::numeric*COALESCE(hold_rate,0))/NULLIF(SUM(impressoes),0),2) as hold_rate",
            "       FROM vw_creative_analysis_complete",
            "       WHERE %s",
            "       GROUP BY campaign_name, ad_name",
            "       ORDER BY conversions DESC",
            "       LIMIT 5",
            "     ) sub',",
            "    v_where_view",
            "  ) INTO v_creatives;",
            "  RETURN jsonb_build_object('stats', v_daily, 'top_creatives', v_creatives);",
            "END;",
            "$gfn$;"
        ].join("\n");

        const grants = [
            "GRANT EXECUTE ON FUNCTION get_gaia_data(DATE, DATE, TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;",
            "GRANT EXECUTE ON FUNCTION get_gaia_data(DATE, DATE, TEXT, TEXT, BOOLEAN, BOOLEAN) TO service_role;",
            "GRANT EXECUTE ON FUNCTION get_gaia_data(DATE, DATE, TEXT, TEXT, BOOLEAN, BOOLEAN) TO anon;"
        ];

        console.log("Applying get_gaia_data fix (all-platform totals)...");
        await conn.queryObject(fixGaiaData);
        for (const grant of grants) {
            await conn.queryObject(grant);
        }

        conn.release();
        await pool.end();

        return new Response(
            JSON.stringify({ success: true, message: "get_gaia_data fixed: now uses fact_ads_performance_daily for real all-platform spend totals (Meta + Google)!" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error: any) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
