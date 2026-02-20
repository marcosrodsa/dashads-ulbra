const fs = require('fs');

async function run() {
    const envFile = fs.readFileSync('.env', 'utf-8');
    const urlMatch = envFile.match(/VITE_SUPABASE_URL=(.*)/);
    const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

    const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
    const supabaseKey = keyMatch ? keyMatch[1].trim() : null;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Tokens not found in .env string parsing.");
        return;
    }

    console.log("Found VITE_SUPABASE_URL:", supabaseUrl);
    console.log("Invoking seed-knowledge...");

    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/seed-knowledge`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });
        const text = await response.text();
        console.log("Status:", response.status);
        console.log("Response:", text);
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
