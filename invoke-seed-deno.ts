import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
const env = await load();
const supabaseUrl = env["SUPABASE_URL"];
const supabaseKey = env["SUPABASE_SERVICE_ROLE_KEY"];

console.log("Using URL:", supabaseUrl);
console.log("Seeding Knowledge Base in Prod...");

const req = await fetch(`${supabaseUrl}/functions/v1/seed-knowledge`, {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
    }
});

console.log("Status:", req.status);
console.log("Body:", await req.text());
