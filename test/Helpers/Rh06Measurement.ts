export interface TimingSummary {
  MinMs: number;
  AvgMs: number;
  P50Ms: number;
  P95Ms: number;
  MaxMs: number;
  PassedThreshold: boolean;
}

export function BuildTimingSummary(durations: number[], thresholdMs: number): TimingSummary {
  if (durations.length === 0) throw new Error('RH-06 timing summary requires at least one duration');
  for (const duration of durations) {
    if (!Number.isFinite(duration) || duration < 0) {
      throw new Error('RH-06 duration must be finite and non-negative');
    }
  }
  if (!Number.isFinite(thresholdMs) || thresholdMs < 0) {
    throw new Error('RH-06 threshold must be finite and non-negative');
  }

  const sorted = [...durations].sort((left, right) => left - right);
  const rawP50 = PercentileRaw(sorted, 0.5);
  const rawP95 = PercentileRaw(sorted, 0.95);
  let average = 0;
  for (let index = 0; index < durations.length; index += 1) {
    average += (durations[index] - average) / (index + 1);
  }
  return {
    MinMs: Round(sorted[0]),
    AvgMs: Round(average),
    P50Ms: Round(rawP50),
    P95Ms: Round(rawP95),
    MaxMs: Round(sorted[sorted.length - 1]),
    PassedThreshold: rawP95 <= thresholdMs,
  };
}

function PercentileRaw(sorted: number[], value: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(value * sorted.length) - 1));
  return sorted[index];
}

function Round(value: number): number {
  return Number(value.toFixed(3));
}
