import { BusinessRuleException } from '@common/Exceptions/AppException';

/**
 * Canonical `roleCode` policy (contract RH-CODE-01) shared by every create/get/assign/remove
 * boundary so case variation never becomes path-dependent.
 *
 * Order matters: trim -> raw ASCII validation -> ASCII uppercase. The raw pattern is the
 * case-insensitive ASCII form of the canonical regex, so it rejects non-ASCII input BEFORE
 * uppercasing. This stops Unicode expansion/confusables (e.g. `ß`.toUpperCase() === 'SS',
 * dotless `ı`.toUpperCase() === 'I', full-width `ＡＤＭＩＮ`) from fabricating a valid canonical
 * code, and keeps length bounded pre-expansion. The trimmed value is ASCII, so `.toUpperCase()`
 * is a 1:1 map and the result always matches ^[A-Z][A-Z0-9_]{1,49}$.
 */
const RAW_ROLE_CODE = /^[A-Za-z][A-Za-z0-9_]{1,49}$/;
const CANONICAL_ROLE_CODE = /^[A-Z][A-Z0-9_]{1,49}$/;

export function CanonicalizeRoleCode(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new BusinessRuleException('RoleCode must be a string');
  }
  const trimmed = raw.trim();
  if (!RAW_ROLE_CODE.test(trimmed)) {
    throw new BusinessRuleException('RoleCode must match ^[A-Za-z][A-Za-z0-9_]{1,49}$ (ASCII)');
  }
  const canonical = trimmed.toUpperCase();
  // Defense-in-depth: ASCII uppercase of a raw-valid code is always canonical, but assert the
  // final form so any future regression in that 1:1 assumption fails closed (400) rather than
  // persisting/looking-up a non-canonical value.
  if (!CANONICAL_ROLE_CODE.test(canonical)) {
    throw new BusinessRuleException('RoleCode canonical form is invalid');
  }
  return canonical;
}
