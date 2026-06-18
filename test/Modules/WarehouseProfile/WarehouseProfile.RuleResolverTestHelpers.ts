import { randomUUID } from 'crypto';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileRuleEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileRuleEntity';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { RuleAction, RuleCondition } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleConditionAction';

const scopeKeyService = new ScopeKeyService();

export const Far = new Date('2099-01-01T00:00:00.000Z');
export const Past = new Date('2020-01-01T00:00:00.000Z');
export const At = new Date('2026-06-01T00:00:00.000Z');

export type RuleScopeAxes = {
  WarehouseTypeCode?: string | null;
  WarehouseId?: string | null;
  ZoneId?: string | null;
  LocationType?: string | null;
  OwnerId?: string | null;
  SkuId?: string | null;
  ItemClass?: string | null;
  OrderType?: string | null;
  CustomerId?: string | null;
  SupplierId?: string | null;
};

export type BuildRuleOptions = RuleScopeAxes & {
  Id?: string;
  RuleCode?: string;
  PrecedenceTier?: RulePrecedenceTier;
  ControlMode?: RuleControlMode;
  Priority?: number;
  Status?: RuleStatus;
  EffectiveFrom?: Date;
  EffectiveTo?: Date | null;
  ConditionJson?: RuleCondition;
  ActionJson?: RuleAction;
  RequiresReason?: boolean;
  RequiresEvidence?: boolean;
  AllowOverride?: boolean;
  RuleGroupId?: string;
};

export function BuildRule(options: BuildRuleOptions = {}): RuleDefinitionEntity {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const scopeKey = scopeKeyService.Build({
    WarehouseTypeCode: options.WarehouseTypeCode ?? '',
    WarehouseId: options.WarehouseId,
    ZoneId: options.ZoneId,
    LocationType: options.LocationType,
    OwnerId: options.OwnerId,
    SkuId: options.SkuId,
    ItemClass: options.ItemClass,
    OrderType: options.OrderType,
    CustomerId: options.CustomerId,
    SupplierId: options.SupplierId,
  });

  return new RuleDefinitionEntity({
    Id: options.Id ?? randomUUID(),
    RuleCode: options.RuleCode ?? `RULE-${randomUUID().slice(0, 8)}`,
    RuleName: 'Rule',
    RuleGroupId: options.RuleGroupId ?? 'group-active',
    PrecedenceTier: options.PrecedenceTier ?? RulePrecedenceTier.Operation,
    ControlMode: options.ControlMode ?? RuleControlMode.SoftWarning,
    WarehouseTypeCode: options.WarehouseTypeCode ?? null,
    WarehouseId: options.WarehouseId ?? null,
    ZoneId: options.ZoneId ?? null,
    LocationType: options.LocationType ?? null,
    OwnerId: options.OwnerId ?? null,
    SkuId: options.SkuId ?? null,
    ItemClass: options.ItemClass ?? null,
    OrderType: options.OrderType ?? null,
    CustomerId: options.CustomerId ?? null,
    SupplierId: options.SupplierId ?? null,
    ScopeKey: scopeKey,
    ConditionJson: options.ConditionJson ?? {},
    ActionJson: options.ActionJson ?? {},
    Priority: options.Priority ?? 100,
    Status: options.Status ?? RuleStatus.Active,
    EffectiveFrom: options.EffectiveFrom ?? Past,
    EffectiveTo: options.EffectiveTo ?? null,
    RequiresReason: options.RequiresReason ?? false,
    RequiresEvidence: options.RequiresEvidence ?? false,
    AllowOverride: options.AllowOverride ?? false,
    CreatedAt: now,
    UpdatedAt: now,
  });
}

export function BuildProfile(
  options: { Id?: string; WarehouseTypeCode?: string; WarehouseId?: string | null; Version?: number } = {},
): WarehouseProfileEntity {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const scopeKey = scopeKeyService.Build({
    WarehouseTypeCode: options.WarehouseTypeCode ?? 'TIER_1',
    WarehouseId: options.WarehouseId,
  });
  return new WarehouseProfileEntity({
    Id: options.Id ?? randomUUID(),
    ProfileCode: `WP-${randomUUID().slice(0, 8)}`,
    ProfileName: 'Profile',
    WarehouseTypeCode: options.WarehouseTypeCode ?? 'TIER_1',
    Version: options.Version ?? 1,
    Status: WarehouseProfileStatus.Active,
    WarehouseId: options.WarehouseId ?? null,
    ScopeKey: scopeKey,
    EffectiveFrom: Past,
    EffectiveTo: null,
    CreatedAt: now,
    UpdatedAt: now,
  });
}

export function BuildBinding(
  warehouseProfileId: string,
  ruleDefinitionId: string,
  options: { IsEnabled?: boolean; OverridePriority?: number | null } = {},
): WarehouseProfileRuleEntity {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return new WarehouseProfileRuleEntity({
    Id: randomUUID(),
    WarehouseProfileId: warehouseProfileId,
    RuleDefinitionId: ruleDefinitionId,
    IsEnabled: options.IsEnabled ?? true,
    OverridePriority: options.OverridePriority ?? null,
    CreatedAt: now,
    UpdatedAt: now,
  });
}
