import { BusinessRuleException } from '@common/Exceptions/AppException';

/**
 * Parses a `YYYY-MM-DD` (or ISO) effective-date string into a UTC-midnight Date,
 * keeping the date axis stable across entity/mapper/migration (per A5 date-normalization guardrail).
 */
export function ParseEffectiveDate(value: string, label: string): Date {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BusinessRuleException(`${label} is required`);
  }
  const datePart = value.trim().slice(0, 10);
  const parsed = new Date(`${datePart}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BusinessRuleException(`${label} must be a valid date`);
  }
  return parsed;
}
