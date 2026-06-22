export interface ParsedGs1Value extends Record<string, unknown> {
  Gtin?: string;
  Lot?: string;
  ExpiryDate?: string;
  Serial?: string;
  Quantity?: number;
  InvalidFields?: string[];
}

const AI_KEYS = new Set(['01', '10', '17', '21', '30']);

export class Gs1Parser {
  public static Parse(rawValue: string): ParsedGs1Value {
    const parsed: ParsedGs1Value = {};
    const matches = [...rawValue.matchAll(/\((\d{2})\)([^\(]+)/g)];
    for (const match of matches) {
      const ai = match[1];
      const value = match[2]?.trim() ?? '';
      if (!AI_KEYS.has(ai) || !value) continue;
      if (ai === '01') parsed.Gtin = value;
      if (ai === '10') parsed.Lot = value;
      if (ai === '17') parsed.ExpiryDate = Gs1Parser.ParseExpiry(value);
      if (ai === '21') parsed.Serial = value;
      if (ai === '30') {
        if (/^\d+(\.\d+)?$/.test(value)) {
          parsed.Quantity = Number(value);
        } else {
          parsed.InvalidFields = [...(parsed.InvalidFields ?? []), 'Quantity'];
        }
      }
    }
    return parsed;
  }

  private static ParseExpiry(value: string): string {
    if (!/^\d{6}$/.test(value)) return value;
    const year = Number(value.slice(0, 2));
    const month = value.slice(2, 4);
    const day = value.slice(4, 6);
    return `20${year.toString().padStart(2, '0')}-${month}-${day}`;
  }
}
