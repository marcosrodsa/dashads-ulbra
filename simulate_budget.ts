
// Mock of the raw rows returned by Supabase for the week of Feb 23
// Simulating potential duplicates or granular rows that look like duplicates
// In the SQL screenshot, we see ONE row for "23 fev a 01 mar" with 93k.
// But maybe the VIEW returns multiple rows per Unit/Platform that sum up to 93k?
// Or maybe it returns multiple rows that SHOULD be 93k total, but the reduce logic sums them incorrectly?

// Let's assume the View returns granularity: Week | Unit | Course | Platform
// Total 93k.
// Let's try to mock 2 rows that sum to 93k.
const mockRows = [
    { orcamento_semanal: 50000, unidade: "Ulbra EAD", plataforma: "Meta" },
    { orcamento_semanal: 43762.97, unidade: "Ulbra Canoas", plataforma: "Google" }
];

const safeNumber = (v: any) => Number(v) || 0;

// Logic from Budget.tsx
const plannedTotal = mockRows.reduce((acc, r) => acc + safeNumber(r.orcamento_semanal), 0);

console.log("Planned Total (Simple Sum):", plannedTotal);

// What if the dashboard query returns DUPLICATE rows because of left joins?
// The user filters are EMPTY? Or specific?
// Screenshot 1: "Periodo: 23/02 - 01/03". "Semana: 23 fev a 01 mar".
// Dashboard Total: 158k.
// 93k * 1.6? No.
// 93k + 57k (previous week) = 150k. Close to 158k.

// Let's verify if `weeklyRows` fetch logic in Budget.tsx might include previous week.
// The script `debug_dates.ts` confirmed `weeklyFromDate` = 23, `weeklyToDate` = 01.
// Query: .gte("data_inicio_semana", "2026-02-23").lte("data_inicio_semana", "2026-03-01")

// If the database has a row with `data_inicio_semana` = '2026-02-16', it is NOT included.
// UNLESS date timezone conversion shifts it? 2026-02-23T00:00:00Z vs Local?

console.log("Hypothesis: Checking if Aggregation logic doubles specific rows?");
