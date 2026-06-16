const UNIT_TO_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Parses a JWT-style duration string into milliseconds.
 * Supports: "ms", "s", "m", "h", "d" suffixes (e.g. "15m", "7d", "900s").
 * A bare number is treated as seconds (matching jsonwebtoken's `expiresIn`).
 */
export const ParseDurationToMs = (value: string): number => {
  const trimmed = value.trim();
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?$/.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  if (!unit) {
    return amount * 1000; // bare number => seconds
  }

  return amount * UNIT_TO_MS[unit];
};
