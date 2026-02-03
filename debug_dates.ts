
import { startOfWeek, endOfWeek, format } from "date-fns";

const filtersWeek = "2026-02-23";

const datePart = String(filtersWeek).slice(0, 10);
const wDate = new Date(`${datePart}T00:00:00`);

const effectiveStart = startOfWeek(wDate, { weekStartsOn: 1 });
const effectiveEnd = endOfWeek(wDate, { weekStartsOn: 1 });

const weeklyFromDate = format(startOfWeek(effectiveStart, { weekStartsOn: 1 }), "yyyy-MM-dd");
// CRITICAL: Checking if endOfWeek overlaps or extends further than expected
const weeklyToDate = format(endOfWeek(effectiveEnd, { weekStartsOn: 1 }), "yyyy-MM-dd");

console.log({
    input: filtersWeek,
    wDate: wDate.toString(),
    effectiveStart: effectiveStart.toString(),
    effectiveEnd: effectiveEnd.toString(),
    weeklyFromDate,
    weeklyToDate
});
