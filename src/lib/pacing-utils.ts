import { endOfMonth } from "date-fns";

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
export function getDynamicThresholds(currentDate: Date, monthDate: Date): DynamicThresholds {
    const totalDays = endOfMonth(monthDate).getDate();
    const currentDay = currentDate.getDate();

    const monthProgress = currentDay / totalDays; // 0.0 to 1.0
    const daysRemaining = totalDays - currentDay;

    // Tolerance decreases linearly as month progresses
    const baseTolerance = 0.20; // 20% at start of month
    const progressFactor = daysRemaining / totalDays;
    const tolerance = baseTolerance * progressFactor;

    // Ensure minimum tolerance of 2% even at end of month
    const minTolerance = 0.02;
    const effectiveTolerance = Math.max(tolerance, minTolerance);

    return {
        expectedProgress: monthProgress,
        idealMin: Math.max(0, monthProgress - effectiveTolerance),
        idealMax: Math.min(1, monthProgress + effectiveTolerance),
        warningMin: Math.max(0, monthProgress - (effectiveTolerance * 1.5)),
        warningMax: Math.min(1, monthProgress + (effectiveTolerance * 1.5)),
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
    monthDate: Date
): PacingStatus {
    const thresholds = getDynamicThresholds(currentDate, monthDate);

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
            return "No Ritmo";
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
