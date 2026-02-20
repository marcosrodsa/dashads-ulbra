// Test script to run via supabase local injection
async function seed() {
    try {
        console.log("Invoking seed-knowledge locally...");
        // Since supabase functions serve runs locally on 54321
        const response = await fetch("http://127.0.0.1:54321/functions/v1/seed-knowledge", {
            method: 'POST'
        });

        const data = await response.text();
        console.log("Status:", response.status);
        console.log("Response:", data);
    } catch (e) {
        console.error("Error:", e);
    }
}

seed();
