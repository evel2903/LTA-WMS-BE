import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';

const ACTIONS = new Set<string>(Object.values(ActionCode));
const OBJECTS = new Set<string>(Object.values(ObjectType));
const ROLES = new Set<string>(Object.values(RoleCode));

/**
 * Validates reason-code JSONB shape before persist: every action/object/role entry
 * must be a known enum member, and the effective window must be ordered.
 */
export class ReasonCodePayloadValidator {
  public static Validate(payload: {
    AppliesToActions?: ActionCode[];
    AppliesToObjects?: ObjectType[];
    AllowedRoleCodes?: RoleCode[] | null;
    EffectiveFrom?: Date | null;
    EffectiveTo?: Date | null;
  }): void {
    this.AssertNonEmpty(payload.AppliesToActions, 'AppliesToActions');
    this.AssertNonEmpty(payload.AppliesToObjects, 'AppliesToObjects');
    this.AssertSubset(payload.AppliesToActions, ACTIONS, 'AppliesToActions');
    this.AssertSubset(payload.AppliesToObjects, OBJECTS, 'AppliesToObjects');
    if (payload.AllowedRoleCodes != null) {
      this.AssertSubset(payload.AllowedRoleCodes, ROLES, 'AllowedRoleCodes');
    }
    if (
      payload.EffectiveFrom != null &&
      payload.EffectiveTo != null &&
      payload.EffectiveTo.getTime() <= payload.EffectiveFrom.getTime()
    ) {
      throw new BusinessRuleException('EffectiveTo must be after EffectiveFrom');
    }
  }

  private static AssertNonEmpty(values: unknown[] | undefined, field: string): void {
    if (values !== undefined && values.length === 0) {
      throw new BusinessRuleException(`${field} must not be empty`);
    }
  }

  private static AssertSubset(values: string[] | undefined, allowed: Set<string>, field: string): void {
    if (!values) return;
    for (const value of values) {
      if (!allowed.has(value)) {
        throw new BusinessRuleException(`Invalid ${field} value: ${value}`);
      }
    }
  }
}
