/**
 * Gaia Elite: Statistical Models
 * Bayesian A/B Testing & Fatigue Prediction
 */

/**
 * Calculates the probability that Variant B is better than Variant A
 * based on conversions and impressions (Beta distribution approximation).
 */
export function calculateWinProbability(
    convA: number,
    impA: number,
    convB: number,
    impB: number
): number {
    if (impA === 0 || impB === 0) return 0.5;

    const rateA = convA / impA;
    const rateB = convB / impB;

    // Simple Z-score to Bayesian approximation for performance
    const seA = Math.sqrt((rateA * (1 - rateA)) / impA);
    const seB = Math.sqrt((rateB * (1 - rateB)) / impB);

    if (seA === 0 && seB === 0) return rateB > rateA ? 1.0 : 0.0;

    const z = (rateB - rateA) / Math.sqrt(seA ** 2 + seB ** 2);

    // Normal cumulative distribution approximation
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + 1.330274 * t))));

    return z >= 0 ? 1 - p : p;
}

/**
 * Predicts CTR decay based on Frequency.
 * Ad fatigue usually follows an exponential or power-law decay.
 */
export function predictFatigue(initialCTR: number, currentFrequency: number): {
    predictedCTR: number;
    fatigueIndex: number; // 0 to 1, where 1 is total fatigue
} {
    // Model: CTR = InitialCTR * e^(-k * (Frequency - 1))
    // k is the decay constant, typically around 0.15 for Meta ads
    const k = 0.15;
    const predictedCTR = initialCTR * Math.exp(-k * (currentFrequency - 1));
    const fatigueIndex = 1 - (predictedCTR / initialCTR);

    return {
        predictedCTR: Number(predictedCTR.toFixed(4)),
        fatigueIndex: Number(fatigueIndex.toFixed(2))
    };
}
