import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

async function seed() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
        return;
    }

    try {
        console.log("Invoking seed-knowledge on PROD...");
        const response = await fetch(`${supabaseUrl}/functions/v1/seed-knowledge`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.text();
        console.log("Status:", response.status);
        console.log("Response:", data);
    } catch (e) {
        console.error("Error:", e);
    }
}

seed();
