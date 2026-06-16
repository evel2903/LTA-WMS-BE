import { ParseDurationToMs } from '@common/Helpers/Duration';

describe('ParseDurationToMs', () => {
  it('parses unit suffixes', () => {
    expect(ParseDurationToMs('500ms')).toBe(500);
    expect(ParseDurationToMs('30s')).toBe(30 * 1000);
    expect(ParseDurationToMs('15m')).toBe(15 * 60 * 1000);
    expect(ParseDurationToMs('1h')).toBe(60 * 60 * 1000);
    expect(ParseDurationToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('treats a bare number as seconds', () => {
    expect(ParseDurationToMs('900')).toBe(900 * 1000);
  });

  it('throws on invalid input', () => {
    expect(() => ParseDurationToMs('abc')).toThrow('Invalid duration');
    expect(() => ParseDurationToMs('10y')).toThrow('Invalid duration');
  });
});
