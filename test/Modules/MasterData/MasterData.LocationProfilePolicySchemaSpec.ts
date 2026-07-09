import {
  CapacityPolicyFields,
  CompliancePolicyFields,
  EligibilityPolicyFields,
  MixPolicyFields,
  OperationPolicyFields,
  ValidatePolicyAgainstSpec,
} from '@modules/MasterData/Domain/ValueObjects/LocationProfilePolicySchema';

describe('LocationProfilePolicySchema.ValidatePolicyAgainstSpec (FFB-06)', () => {
  it('accepts undefined, null and an empty object', () => {
    expect(ValidatePolicyAgainstSpec(undefined, CapacityPolicyFields)).toEqual([]);
    expect(ValidatePolicyAgainstSpec(null, CapacityPolicyFields)).toEqual([]);
    expect(ValidatePolicyAgainstSpec({}, CapacityPolicyFields)).toEqual([]);
  });

  it('accepts every whitelisted key at its declared type, for all 5 policies', () => {
    expect(ValidatePolicyAgainstSpec({ RequireCapacityQty: true }, CapacityPolicyFields)).toEqual([]);
    expect(
      ValidatePolicyAgainstSpec({ RequiredTemperatureClass: 'AMBIENT', BondedOnly: false }, CompliancePolicyFields),
    ).toEqual([]);
    expect(ValidatePolicyAgainstSpec({ putawayBlocked: true, pickFace: false }, EligibilityPolicyFields)).toEqual([]);
    expect(
      ValidatePolicyAgainstSpec({ putawayAllowed: false, replenishmentBlocked: true }, OperationPolicyFields),
    ).toEqual([]);
    expect(ValidatePolicyAgainstSpec({ MixSkuPolicy: 'NoMix', mixLotPolicy: 'NoMix' }, MixPolicyFields)).toEqual([]);
  });

  it('rejects a non-object value (array, string, number)', () => {
    expect(ValidatePolicyAgainstSpec([], CapacityPolicyFields)).toEqual(['must be a JSON object']);
    expect(ValidatePolicyAgainstSpec('nope', CapacityPolicyFields)).toEqual(['must be a JSON object']);
    expect(ValidatePolicyAgainstSpec(1, CapacityPolicyFields)).toEqual(['must be a JSON object']);
  });

  it('rejects an unknown key not in the spec', () => {
    expect(ValidatePolicyAgainstSpec({ RequireCapacityQty: true, palletSlots: 6 }, CapacityPolicyFields)).toEqual([
      'unknown key "palletSlots"',
    ]);
  });

  it('rejects a known key with the wrong primitive type', () => {
    expect(ValidatePolicyAgainstSpec({ RequireCapacityQty: 'true' }, CapacityPolicyFields)).toEqual([
      '"RequireCapacityQty" must be a boolean',
    ]);
    expect(ValidatePolicyAgainstSpec({ RequiredTemperatureClass: 123 }, CompliancePolicyFields)).toEqual([
      '"RequiredTemperatureClass" must be a string',
    ]);
  });

  it('reports every violation, not just the first', () => {
    expect(ValidatePolicyAgainstSpec({ RequireCapacityQty: 'yes', extraKey: 1 }, CapacityPolicyFields)).toEqual([
      '"RequireCapacityQty" must be a boolean',
      'unknown key "extraKey"',
    ]);
  });

  it('[Review][Patch] accepts a real boolean OR a case-insensitive "true"/"false" string for the keys BoolPolicy/PolicyExplicitFalse actually tolerate at read time (putawayBlocked, replenishmentAllowed, allowReplenishment, canReplenish)', () => {
    expect(ValidatePolicyAgainstSpec({ putawayBlocked: 'True' }, EligibilityPolicyFields)).toEqual([]);
    expect(ValidatePolicyAgainstSpec({ putawayBlocked: 'FALSE' }, OperationPolicyFields)).toEqual([]);
    expect(ValidatePolicyAgainstSpec({ replenishmentAllowed: 'false' }, EligibilityPolicyFields)).toEqual([]);
    expect(ValidatePolicyAgainstSpec({ allowReplenishment: 'true' }, OperationPolicyFields)).toEqual([]);
    expect(ValidatePolicyAgainstSpec({ canReplenish: false }, OperationPolicyFields)).toEqual([]);
  });

  it('[Review][Patch] still rejects a tolerant-boolean key holding a non-boolean-ish string, and putawayAllowed stays strict boolean-only (no string tolerance, matching its `=== false` reader)', () => {
    expect(ValidatePolicyAgainstSpec({ putawayBlocked: 'yes' }, OperationPolicyFields)).toEqual([
      '"putawayBlocked" must be a boolean (or "true"/"false" string)',
    ]);
    expect(ValidatePolicyAgainstSpec({ putawayAllowed: 'false' }, OperationPolicyFields)).toEqual([
      '"putawayAllowed" must be a boolean',
    ]);
  });

  it('[Review][Patch] a strict-boolean-only key (read via PolicyFlag, no string tolerance) still rejects a string value', () => {
    expect(ValidatePolicyAgainstSpec({ replenishmentBlocked: 'true' }, OperationPolicyFields)).toEqual([
      '"replenishmentBlocked" must be a boolean',
    ]);
    expect(ValidatePolicyAgainstSpec({ pickFace: 'true' }, EligibilityPolicyFields)).toEqual([
      '"pickFace" must be a boolean',
    ]);
  });
});
