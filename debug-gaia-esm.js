import fs from 'fs';

async function testGaiaChat() {
    const envFile = fs.readFileSync('.env', 'utf-8');
    const urlMatch = envFile.match(/VITE_SUPABASE_URL=(.*)/);
    const keyMatch = envFile.match(/SUPABASE_ANON_KEY=(.*)/);

    const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
    const supabaseKey = keyMatch ? keyMatch[1].trim() : null;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Tokens not found.");
        return;
    }

    console.log("Found URL:", supabaseUrl);

    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/gaia-chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: null,
                message: "Quais são os melhores e piores criativos em Hook Rate e Hold Rate?",
                context: {
                    dateRange: { start: "2026-02-01", end: "2026-02-28" },
                    unidade: "Todas",
                    curso: "Todos",
                    hideBranding: false,
                    excludeEad: false
                }
            })
        });
        const text = await response.text();
        console.log("Status:", response.status);
        console.log("Response:", text);
    } catch (e) {
        console.error("Error:", e);
    }
}
testGaiaChat();
