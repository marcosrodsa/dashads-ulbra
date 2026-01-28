import { endOfMonth, startOfDay, differenceInDays } from "date-fns";

export type PacingStatus = "success" | "warning" | "error";

export interface DynamicThresholds {
    expectedProgress: number;
    idealMin: number;
    idealMax: number;
    warningMin: number;
    warningMax: number;
    tolerance: number;
}

/**
 * Calculate dynamic pacing thresholds based on current day of month
 * Tolerance decreases as month progresses:
 * - Early month: ±20% tolerance
 * - Mid month: ±10% tolerance  
 * - Late month: ±2% tolerance
 */
export function getDynamicThresholds(currentDate: Date, monthDate: Date, customRange?: { from: Date; to: Date }): DynamicThresholds {
    let totalDays: number;
    let currentDay: number;
    let progress: number;

    if (customRange) {
        // Pacing relative to a specific range (e.g. a week)
        const dFrom = startOfDay(customRange.from);
        const dTo = startOfDay(customRange.to);
        const dCurrent = startOfDay(currentDate);

        const total = Math.max(1, differenceInDays(dTo, dFrom) + 1);

        if (dCurrent < dFrom) {
            progress = 0;
            currentDay = 0;
        } else if (dCurrent > dTo) {
            progress = 1;
            currentDay = total;
        } else {
            currentDay = differenceInDays(dCurrent, dFrom) + 1;
            progress = currentDay / total;
        }
        totalDays = total;
    } else {
        // Default: Pacing relative to month
        const dCurrent = startOfDay(currentDate);
        const dStart = startOfDay(monthDate);
        totalDays = endOfMonth(monthDate).getDate();
        currentDay = dCurrent.getDate();
        progress = currentDay / totalDays;
    }

    const daysRemaining = Math.max(0, totalDays - currentDay);

    // Tolerance decreases as we approach the end of the range
    const baseTolerance = 0.20;
    const progressFactor = totalDays > 0 ? daysRemaining / totalDays : 0;
    const tolerance = baseTolerance * progressFactor;

    const minTolerance = 0.02;
    const effectiveTolerance = Math.max(tolerance, minTolerance);

    return {
        expectedProgress: progress,
        idealMin: Math.max(0, progress - effectiveTolerance),
        idealMax: Math.min(1.2, progress + effectiveTolerance), // Allow some overspend budget padding
        warningMin: Math.max(0, progress - (effectiveTolerance * 1.5)),
        warningMax: Math.min(1.5, progress + (effectiveTolerance * 1.5)),
        tolerance: effectiveTolerance,
    };
}

/**
 * Get pacing status based on dynamic thresholds
 * @param utilization - Current spend / budget ratio (0.0 to 1.0+)
 * @param currentDate - Current date
 * @param monthDate - Month being analyzed
 */
export function getDynamicPacingStatus(
    utilization: number,
    currentDate: Date,
    monthDate: Date,
    customRange?: { from: Date; to: Date }
): PacingStatus {
    const thresholds = getDynamicThresholds(currentDate, monthDate, customRange);

    // Critical: Outside warning range
    if (utilization < thresholds.warningMin || utilization > thresholds.warningMax) {
        return "error";
    }

    // Warning: Outside ideal range but within warning range
    if (utilization < thresholds.idealMin || utilization > thresholds.idealMax) {
        return "warning";
    }

    // Success: Within ideal range
    return "success";
}

/**
 * Get human-readable status label in Portuguese
 */
export function getPacingStatusLabel(status: PacingStatus): string {
    switch (status) {
        case "error":
            return "Crítico";
        case "warning":
            return "Atenção";
        case "success":
            return "Dentro do Ritmo";
    }
}

/**
 * Format expected range for tooltip
 */
export function formatExpectedRange(thresholds: DynamicThresholds): string {
    const minPct = (thresholds.idealMin * 100).toFixed(0);
    const maxPct = (thresholds.idealMax * 100).toFixed(0);
    return `${minPct}% - ${maxPct}%`;
}
