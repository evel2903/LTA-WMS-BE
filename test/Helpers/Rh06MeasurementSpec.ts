import { BuildTimingSummary } from '@test/Helpers/Rh06Measurement';

describe('RH-06 timing summary', () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0.001])(
    'rejects invalid duration %s',
    (duration) => {
      expect(() => BuildTimingSummary([duration], 5)).toThrow('finite and non-negative');
    },
  );

  it('compares the raw percentile before rounding serialized metrics', () => {
    expect(BuildTimingSummary([5.0004], 5)).toEqual({
      MinMs: 5,
      AvgMs: 5,
      P50Ms: 5,
      P95Ms: 5,
      MaxMs: 5,
      PassedThreshold: false,
    });
  });

  it('uses nearest-rank percentiles and rejects an empty sample set', () => {
    expect(BuildTimingSummary([1, 2, 3, 4, 100], 100)).toMatchObject({ P50Ms: 3, P95Ms: 100 });
    expect(() => BuildTimingSummary([], 5)).toThrow('at least one duration');
  });

  it('keeps the average finite when individually finite durations would overflow a sum', () => {
    const summary = BuildTimingSummary([Number.MAX_VALUE, Number.MAX_VALUE], Number.MAX_VALUE);

    expect(summary.AvgMs).toBe(Number.MAX_VALUE);
    expect(Number.isFinite(summary.AvgMs)).toBe(true);
  });
});
