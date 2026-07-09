/**
 * Canonical key/type schema for LocationProfile's 5 JSONB policy blobs (FFB-06). Lists ONLY the
 * keys actual runtime code reads today (LocationPolicyValidator, ReleasePutawayTaskUseCase,
 * ReplenishmentTaskLifecycleService) — not every field once envisioned for these policies. Adding
 * a key here without wiring a real reader is scope creep; removing one that a reader still checks
 * is a regression.
 */

/**
 * 'boolean-tolerant' exists because the runtime readers for a handful of keys are themselves
 * tolerant of a string "true"/"false" in addition to a real boolean (BoolPolicy, PolicyExplicitFalse
 * in ReleasePutawayTaskUseCase.ts/ReplenishmentTaskLifecycleService.ts) — the whitelist validator
 * must accept exactly what those readers accept, never less, per this story's own guardrail ("KHÔNG
 * được siết chặt hơn 3 helper này"). Do NOT use this for a key read via strict `=== true`/`=== false`
 * (PolicyFlag, or OperationPolicy.putawayAllowed) — those must stay plain 'boolean'.
 */
export type PolicyFieldType = 'boolean' | 'string' | 'boolean-tolerant';

export type PolicyFieldSpec = Record<string, PolicyFieldType>;

function matchesFieldType(value: unknown, type: PolicyFieldType): boolean {
  if (type === 'boolean-tolerant') {
    return typeof value === 'boolean' || (typeof value === 'string' && ['true', 'false'].includes(value.toLowerCase()));
  }
  return typeof value === type;
}

/**
 * Named key groupings used by ReplenishmentTaskLifecycleService's policy-flag helpers
 * (PolicyBlocks/PolicyFlag/PolicyExplicitFalse/ResolveMixPolicy). Kept as single source of truth so
 * the helper call sites can't silently drift from the whitelist above via a copy-pasted typo.
 */
export const ReplenishmentBlockFlagKeys = [
  'replenishmentBlocked',
  'pickFaceBlocked',
  'pickBlocked',
  'blockReplenishment',
  'replenishmentDisabled',
] as const;

export const ReplenishmentAllowFlagKeys = ['replenishmentAllowed', 'allowReplenishment', 'canReplenish'] as const;

export const EligibilityPickFaceKeys = ['pickFace', 'isPickFace', 'replenishmentTarget'] as const;

export const OperationPickFaceKeys = ['pickFace', 'isPickFace', 'replenishmentAllowed'] as const;

export const MixSkuPolicyKeys = ['MixSkuPolicy', 'mixSkuPolicy'] as const;
export const MixOwnerPolicyKeys = ['MixOwnerPolicy', 'mixOwnerPolicy'] as const;
export const MixLotPolicyKeys = ['MixLotPolicy', 'mixLotPolicy'] as const;

export const CapacityPolicyFields: PolicyFieldSpec = {
  RequireCapacityQty: 'boolean',
};

export const CompliancePolicyFields: PolicyFieldSpec = {
  RequiredTemperatureClass: 'string',
  BondedOnly: 'boolean',
};

/**
 * EligibilityPolicy and OperationPolicy are read by the same replenishment-blocking helpers
 * (PolicyBlocks/PolicyFlag/PolicyExplicitFalse) against an almost-identical key set — but
 * putawayAllowed is OperationPolicy-only, and the pick-face flag list differs by one key between
 * the two. Keep them as distinct specs so that difference stays visible.
 */
export const EligibilityPolicyFields: PolicyFieldSpec = {
  putawayBlocked: 'boolean-tolerant',
  replenishmentBlocked: 'boolean',
  pickFaceBlocked: 'boolean',
  pickBlocked: 'boolean',
  blockReplenishment: 'boolean',
  replenishmentDisabled: 'boolean',
  replenishmentAllowed: 'boolean-tolerant',
  allowReplenishment: 'boolean-tolerant',
  canReplenish: 'boolean-tolerant',
  pickFace: 'boolean',
  isPickFace: 'boolean',
  replenishmentTarget: 'boolean',
};

export const OperationPolicyFields: PolicyFieldSpec = {
  putawayBlocked: 'boolean-tolerant',
  putawayAllowed: 'boolean',
  replenishmentBlocked: 'boolean',
  pickFaceBlocked: 'boolean',
  pickBlocked: 'boolean',
  blockReplenishment: 'boolean',
  replenishmentDisabled: 'boolean',
  replenishmentAllowed: 'boolean-tolerant',
  allowReplenishment: 'boolean-tolerant',
  canReplenish: 'boolean-tolerant',
  pickFace: 'boolean',
  isPickFace: 'boolean',
};

/**
 * Both PascalCase and camelCase variants are whitelisted because ReplenishmentTaskLifecycleService
 * .ResolveMixPolicy reads both today (backward-compat duck-typing, not this story's doing) — the
 * write-side FE form only needs to emit the PascalCase variant (see story Dev Notes).
 */
export const MixPolicyFields: PolicyFieldSpec = {
  MixSkuPolicy: 'string',
  mixSkuPolicy: 'string',
  MixOwnerPolicy: 'string',
  mixOwnerPolicy: 'string',
  MixLotPolicy: 'string',
  mixLotPolicy: 'string',
};

/**
 * Every interface below keeps a `[key: string]: unknown` index signature on purpose: it lets a
 * pre-existing LocationProfile row with free-form legacy JSON keep flowing through untyped read
 * paths without a cast (AC5 — read must stay tolerant of old data), while still giving named,
 * typed access to every key the whitelist above allows.
 */

export interface CapacityPolicy {
  RequireCapacityQty?: boolean;
  [key: string]: unknown;
}

export interface CompliancePolicy {
  RequiredTemperatureClass?: string;
  BondedOnly?: boolean;
  [key: string]: unknown;
}

export interface EligibilityPolicy {
  putawayBlocked?: boolean;
  replenishmentBlocked?: boolean;
  pickFaceBlocked?: boolean;
  pickBlocked?: boolean;
  blockReplenishment?: boolean;
  replenishmentDisabled?: boolean;
  replenishmentAllowed?: boolean;
  allowReplenishment?: boolean;
  canReplenish?: boolean;
  pickFace?: boolean;
  isPickFace?: boolean;
  replenishmentTarget?: boolean;
  [key: string]: unknown;
}

export interface OperationPolicy {
  putawayBlocked?: boolean;
  putawayAllowed?: boolean;
  replenishmentBlocked?: boolean;
  pickFaceBlocked?: boolean;
  pickBlocked?: boolean;
  blockReplenishment?: boolean;
  replenishmentDisabled?: boolean;
  replenishmentAllowed?: boolean;
  allowReplenishment?: boolean;
  canReplenish?: boolean;
  pickFace?: boolean;
  isPickFace?: boolean;
  [key: string]: unknown;
}

export interface MixPolicy {
  MixSkuPolicy?: string;
  mixSkuPolicy?: string;
  MixOwnerPolicy?: string;
  mixOwnerPolicy?: string;
  MixLotPolicy?: string;
  mixLotPolicy?: string;
  [key: string]: unknown;
}

/**
 * Validates that `value` contains only keys present in `spec`, each matching its declared
 * primitive type. Returns a human-readable error per violation; empty array means valid. `{}` and
 * `undefined` are always valid (every policy field is optional at every key).
 */
export function ValidatePolicyAgainstSpec(value: unknown, spec: PolicyFieldSpec): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value !== 'object' || Array.isArray(value)) return ['must be a JSON object'];

  const errors: string[] = [];
  for (const [key, actual] of Object.entries(value as Record<string, unknown>)) {
    const expectedType = spec[key];
    if (!expectedType) {
      errors.push(`unknown key "${key}"`);
      continue;
    }
    if (actual !== undefined && !matchesFieldType(actual, expectedType)) {
      const expectedLabel = expectedType === 'boolean-tolerant' ? 'boolean (or "true"/"false" string)' : expectedType;
      errors.push(`"${key}" must be a ${expectedLabel}`);
    }
  }
  return errors;
}
