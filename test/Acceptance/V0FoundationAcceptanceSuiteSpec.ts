import { randomUUID } from 'crypto';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IAuditLogRepository } from '@modules/AccessControl/Application/Interfaces/IAuditLogRepository';
import { ReasonCodeCatalog } from '@modules/AccessControl/Application/Services/ReasonCodeCatalog';
import { SeedReasonCodeCatalog } from '@modules/AccessControl/Application/Services/ReasonCodeCatalogSeed';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { PermissionChecker } from '@modules/AccessControl/Application/Services/PermissionChecker';
import { ApproverDirectory } from '@modules/AccessControl/Application/Services/ApproverDirectory';
import {
  PERMISSION_CATALOG,
  ROLE_CATALOG,
  ROLE_PERMISSION_GRANTS,
} from '@modules/AccessControl/Application/Services/AccessControlCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { CreateApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/CreateApprovalRequestUseCase';
import { ApproveApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/ApproveApprovalRequestUseCase';
import { DataScopeEntity } from '@modules/AccessControl/Domain/Entities/DataScopeEntity';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import { AuditLogEntity } from '@modules/AccessControl/Domain/Entities/AuditLogEntity';
import { AuditLogOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/AuditLogOrmMapper';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';
import {
  InMemoryApprovalRequestRepository,
  InMemoryAuditLogRepository,
  InMemoryDataScopeRepository,
  InMemoryPermissionRepository,
  InMemoryReasonCodeRepository,
  InMemoryRolePermissionRepository,
  InMemoryRoleRepository,
  InMemoryUserRoleRepository,
  StubAuditedTransaction,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';
import { IMasterDataOwnershipPolicyRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataOwnershipPolicyRepository';
import { DefaultMasterDataOwnershipPolicies } from '@modules/MasterData/Application/Services/DefaultMasterDataOwnershipPolicies';
import { Tier1MasterDataChecklistService } from '@modules/MasterData/Application/Services/Tier1MasterDataChecklistService';
import { Tier1MasterDataFixtureBuilder } from '@modules/MasterData/Application/Services/Tier1MasterDataFixtureBuilder';
import { VerifyTier1MasterDataChecklistUseCase } from '@modules/MasterData/Application/UseCases/VerifyTier1MasterDataChecklistUseCase';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';
import { RuleResolver } from '@modules/WarehouseProfile/Application/Services/RuleResolver';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfileChecklistService } from '@modules/WarehouseProfile/Application/Services/WarehouseProfileChecklistService';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { VerifyWarehouseProfileChecklistUseCase } from '@modules/WarehouseProfile/Application/UseCases/VerifyWarehouseProfileChecklistUseCase';
import { ProfileChecklistItemCode } from '@modules/WarehouseProfile/Domain/Constants/ProfileChecklistItemCode';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { ProfileChecklistItemStatus } from '@modules/WarehouseProfile/Domain/Enums/ProfileChecklistItemStatus';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import {
  InMemoryRuleDefinitionRepository,
  InMemoryRuleGroupRepository,
  InMemoryWarehouseProfileRuleRepository,
} from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';
import { InMemoryWarehouseProfileRepository } from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';
import {
  At,
  BuildBinding,
  BuildProfile,
  BuildRule,
} from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

const TIER1_WAREHOUSE_ID = '00000000-0000-0000-0000-00000000a602';
const OWNER_T1_ID = '00000000-0000-0000-0000-00000000a608';

class MemoryMasterDataOwnershipPolicyRepository implements IMasterDataOwnershipPolicyRepository {
  constructor(private readonly policies = DefaultMasterDataOwnershipPolicies()) {}

  public async List() {
    return this.policies;
  }

  public async FindByObjectGroup(objectGroup: MasterDataObjectGroup) {
    return this.policies.find((policy) => policy.ObjectGroup === objectGroup) ?? null;
  }
}

type AccessControlWorld = {
  roles: InMemoryRoleRepository;
  permissions: InMemoryPermissionRepository;
  rolePermissions: InMemoryRolePermissionRepository;
  userRoles: InMemoryUserRoleRepository;
  dataScopes: InMemoryDataScopeRepository;
  checker: PermissionChecker;
};

type RuleWorld = {
  profiles: InMemoryWarehouseProfileRepository;
  groups: InMemoryRuleGroupRepository;
  definitions: InMemoryRuleDefinitionRepository;
  bindings: InMemoryWarehouseProfileRuleRepository;
  resolver: RuleResolver;
  checklist: VerifyWarehouseProfileChecklistUseCase;
};

const ctx = (actorUserId: string, roles: string[] = ['WMS_ADMIN']): AuditContext => ({
  ActorUserId: actorUserId,
  ActorRoleCodes: roles,
  ActorType: ActorType.User,
  CorrelationId: 'corr-c12-foundation',
  RequestId: 'req-c12-foundation',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest-c12',
});

async function seedAccessControlWorld(): Promise<AccessControlWorld> {
  const roles = new InMemoryRoleRepository();
  const permissions = new InMemoryPermissionRepository();
  const rolePermissions = new InMemoryRolePermissionRepository();
  const userRoles = new InMemoryUserRoleRepository();
  const dataScopes = new InMemoryDataScopeRepository();

  await SeedAccessControlRbac(roles, permissions, rolePermissions);
  const adminRole = await roles.FindByCode(RoleCode.WmsAdmin);
  if (!adminRole) {
    throw new Error('WMS admin role was not seeded');
  }

  for (const userId of ['requester-1', 'approver-1']) {
    await userRoles.Create(
      new UserRoleEntity({
        Id: randomUUID(),
        UserId: userId,
        RoleId: adminRole.Id,
        AssignedAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    );
  }
  await dataScopes.Create(
    new DataScopeEntity({
      Id: randomUUID(),
      PrincipalType: PrincipalType.Role,
      PrincipalId: adminRole.Id,
      ScopeType: DataScopeType.Warehouse,
      ScopeValueId: TIER1_WAREHOUSE_ID,
      CreatedAt: new Date('2026-06-01T00:00:00.000Z'),
      UpdatedAt: new Date('2026-06-01T00:00:00.000Z'),
    }),
  );

  return {
    roles,
    permissions,
    rolePermissions,
    userRoles,
    dataScopes,
    checker: new PermissionChecker(userRoles, rolePermissions, permissions, dataScopes, roles),
  };
}

async function seedRuleWorld(): Promise<RuleWorld> {
  const profiles = new InMemoryWarehouseProfileRepository();
  const groups = new InMemoryRuleGroupRepository();
  const definitions = new InMemoryRuleDefinitionRepository();
  const bindings = new InMemoryWarehouseProfileRuleRepository();
  await groups.Create(
    new RuleGroupEntity({
      Id: 'group-active',
      GroupCode: 'R-COM',
      GroupName: 'Compliance',
      CatalogState: RuleGroupCatalogState.Active,
      CreatedAt: At,
      UpdatedAt: At,
    }),
  );

  const resolver = new RuleResolver(profiles, definitions, bindings, groups, new ConditionEvaluator());
  const preview = new PreviewRuleResolutionUseCase(resolver, new RuleConflictDetector());
  const checklistService = new WarehouseProfileChecklistService(profiles, groups, definitions, bindings, preview);

  return {
    profiles,
    groups,
    definitions,
    bindings,
    resolver,
    checklist: new VerifyWarehouseProfileChecklistUseCase(profiles, resolver, checklistService),
  };
}

function buildActiveProfile(
  id: string,
  overrides: {
    warehouseId?: string | null;
    ownerId?: string | null;
    version?: number;
  } = {},
): WarehouseProfileEntity {
  const scopeKey = new ScopeKeyService().Build({
    WarehouseTypeCode: 'TIER_1',
    WarehouseId: overrides.warehouseId,
    OwnerId: overrides.ownerId,
  });
  return new WarehouseProfileEntity({
    ...BuildProfile({
      Id: id,
      WarehouseTypeCode: 'TIER_1',
      WarehouseId: overrides.warehouseId,
      Version: overrides.version,
    }),
    WarehouseId: overrides.warehouseId ?? null,
    OwnerId: overrides.ownerId ?? null,
    ScopeKey: scopeKey,
    Status: WarehouseProfileStatus.Active,
  });
}

function itemStatus(result: Awaited<ReturnType<VerifyWarehouseProfileChecklistUseCase['Execute']>>, code: string) {
  const item = result.Items.find((candidate) => candidate.Code === code);
  if (!item) {
    throw new Error(`Missing checklist item ${code}`);
  }
  return item.Status;
}

function assertAuditCore(entry: AuditEntry): void {
  expect(entry.ActorUserId).toBeDefined();
  expect(entry.ActorType).toBe(ActorType.User);
  expect(entry.Action).toBeDefined();
  expect(entry.ObjectType).toBeDefined();
  expect(entry.CorrelationId).toBe('corr-c12-foundation');
}

describe('C12 V0 Foundation acceptance suite', () => {
  it('AC-01 accepts the Tier 1 foundation graph, source-of-truth policy, reason code and inventory model', async () => {
    const fixture = new Tier1MasterDataFixtureBuilder().Build();
    const checklist = await new VerifyTier1MasterDataChecklistUseCase(
      new MemoryMasterDataOwnershipPolicyRepository(),
      new Tier1MasterDataChecklistService(),
    ).Execute(fixture);

    expect(checklist.HasFailures).toBe(false);
    expect(checklist.Items.filter((item) => item.Status === 'Fail')).toEqual([]);
    expect(fixture.Site).toMatchObject({ SiteCode: 'SITE-TIER1', Status: MasterDataStatus.Active });
    expect(fixture.Warehouse).toMatchObject({
      SiteId: fixture.Site.Id,
      WarehouseCode: 'WH-TIER1',
      Status: MasterDataStatus.Active,
    });
    expect(fixture.Zone).toMatchObject({ WarehouseId: fixture.Warehouse.Id, Status: MasterDataStatus.Active });
    expect(fixture.Locations.map((location) => location.ParentLocationId)).toEqual([
      null,
      fixture.Locations[0].Id,
      fixture.Locations[1].Id,
    ]);
    expect(fixture.Owner.Status).toBe(MasterDataStatus.Active);
    expect(fixture.Sku).toMatchObject({
      DefaultOwnerId: fixture.Owner.Id,
      ItemStatus: SkuStatus.Active,
      BaseUomId: fixture.Uoms[0].Id,
    });
    expect(fixture.ItemCoverage).toMatchObject({
      SkuId: fixture.Sku.Id,
      WarehouseId: fixture.Warehouse.Id,
      DefaultReceiveWarehouseId: fixture.Warehouse.Id,
      DefaultShipWarehouseId: fixture.Warehouse.Id,
    });
    expect(fixture.InventoryStatus).toMatchObject({
      StatusCode: 'AVAILABLE',
      AllowsAllocation: true,
      AllowsPick: true,
    });
    expect(fixture.InventoryDimension).toMatchObject({
      OwnerId: fixture.Owner.Id,
      SkuId: fixture.Sku.Id,
      WarehouseId: fixture.Warehouse.Id,
      LocationId: fixture.Locations[2].Id,
      InventoryStatusId: fixture.InventoryStatus.Id,
    });
    expect(fixture.InventoryBalance).toMatchObject({ DimensionId: fixture.InventoryDimension.Id, QtyAvailable: 8 });
    expect([fixture.Site, fixture.Warehouse, fixture.Sku, fixture.InventoryDimension]).toEqual(
      expect.arrayContaining([expect.objectContaining({ SourceSystem: 'A6Fixture', ReferenceId: expect.any(String) })]),
    );
    expect(checklist.Items).toContainEqual(expect.objectContaining({ Code: 'MD-OWNERSHIP', Status: 'Pass' }));

    const reasonCodes = new InMemoryReasonCodeRepository();
    await SeedReasonCodeCatalog(reasonCodes);
    const reasonResult = await new ReasonCodeCatalog(reasonCodes).ValidateReason({
      ReasonCode: 'RC-ADJUST',
      Action: ActionCode.Adjust,
      ObjectType: ObjectType.InventoryStatus,
    });
    expect((await reasonCodes.List(0, 100)).TotalItems).toBeGreaterThanOrEqual(12);
    expect(reasonResult).toMatchObject({ EvidenceRequired: true, ApprovalRequired: false });
  });

  it('AC-02 accepts the six-role matrix and denies out-of-scope or self-approval access', async () => {
    const world = await seedAccessControlWorld();

    const roleList = await world.roles.List(0, 100);
    expect(roleList.Items.map((role) => role.RoleCode)).toEqual(ROLE_CATALOG.map((role) => role.Code));
    expect(roleList.Items.every((role) => role.IsSystem && role.Status === RoleStatus.Active)).toBe(true);
    expect(new Set(ROLE_PERMISSION_GRANTS.map((grant) => grant.Role))).toEqual(
      new Set([
        RoleCode.WmsAdmin,
        RoleCode.WarehouseSupervisor,
        RoleCode.WarehouseCoordinator,
        RoleCode.Operator,
        RoleCode.Qc,
        RoleCode.InventoryAccountant,
      ]),
    );
    expect((await world.permissions.List(0, 1000)).TotalItems).toBe(PERMISSION_CATALOG.length);

    const inScope = await world.checker.Check({
      UserId: 'approver-1',
      Action: ActionCode.Create,
      ObjectType: ObjectType.Zone,
      Scope: { WarehouseId: TIER1_WAREHOUSE_ID },
    });
    const outOfScope = await world.checker.Check({
      UserId: 'approver-1',
      Action: ActionCode.Create,
      ObjectType: ObjectType.Zone,
      Scope: { WarehouseId: 'warehouse-outside-scope' },
    });
    const selfApproval = await world.checker.Check({
      UserId: 'approver-1',
      Action: ActionCode.Approve,
      ObjectType: ObjectType.ApprovalRequest,
      Scope: { WarehouseId: TIER1_WAREHOUSE_ID, RequesterUserId: 'approver-1' },
    });

    expect(inScope).toEqual({ Allowed: true });
    expect(outOfScope).toEqual({ Allowed: false, Reason: 'OUT_OF_SCOPE' });
    expect(selfApproval).toEqual({ Allowed: false, Reason: 'SELF_APPROVAL' });
  });

  it('AC-02 accepts V0 mutation audit records with actor/action/object/time/reason/before-after/reference and immutable read model', async () => {
    const access = await seedAccessControlWorld();
    const approvalRequests = new InMemoryApprovalRequestRepository();
    const reasonCodes = new InMemoryReasonCodeRepository();
    await SeedReasonCodeCatalog(reasonCodes);
    const reasonCatalog = new ReasonCodeCatalog(reasonCodes);

    const createAudit = new StubAuditedTransaction();
    const approval = await new CreateApprovalRequestUseCase(
      approvalRequests,
      new ApproverDirectory(access.permissions, access.rolePermissions),
      reasonCatalog,
      createAudit as unknown as AuditedTransaction,
    ).Execute(
      {
        Action: ActionCode.Adjust,
        TargetObjectType: ObjectType.InventoryStatus,
        TargetObjectId: 'inventory-balance-tier1',
        TargetObjectCode: 'INV-BAL-TIER1',
        Scope: { WarehouseId: TIER1_WAREHOUSE_ID },
        ReasonCode: 'RC-ADJUST',
        ReasonNote: 'C12 fixture adjustment evidence',
        EvidenceRefs: [{ ref: 'c12://inventory-balance' }],
        ReferenceType: 'V0FoundationAcceptance',
        ReferenceId: 'C12-AC02-AUDIT',
      },
      ctx('requester-1'),
    );

    const approveAudit = new StubAuditedTransaction();
    await new ApproveApprovalRequestUseCase(
      approvalRequests,
      access.checker,
      reasonCatalog,
      approveAudit as unknown as AuditedTransaction,
    ).Execute({ Id: approval.Id, ReasonCode: 'RC-APPROVE', ReasonNote: 'C12 acceptance approval' }, ctx('approver-1'));

    const createEntry = createAudit.Entries[0];
    const approveEntry = approveAudit.Entries[0];
    for (const entry of [createEntry, approveEntry]) {
      assertAuditCore(entry);
      expect(entry.ReferenceType).toBe('V0FoundationAcceptance');
      expect(entry.ReferenceId).toBe('C12-AC02-AUDIT');
      expect(entry.ReasonCodeId).toEqual(expect.any(String));
    }
    expect(createEntry).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.ApprovalRequest,
      ObjectCode: 'INV-BAL-TIER1',
      AfterJson: expect.objectContaining({ Decision: 'PENDING' }),
    });
    expect(approveEntry).toMatchObject({
      Action: ActionCode.Approve,
      ObjectType: ObjectType.ApprovalRequest,
      ObjectCode: 'INV-BAL-TIER1',
      BeforeJson: expect.objectContaining({ Decision: 'PENDING' }),
      AfterJson: expect.objectContaining({ Decision: 'APPROVED' }),
    });

    const auditRecord = new AuditLogEntity({
      Id: 'audit-c12-approval',
      OccurredAt: new Date('2026-06-21T00:00:00.000Z'),
      ...approveEntry,
    });
    expect(auditRecord.OccurredAt).toBeInstanceOf(Date);
    expect(AuditLogOrmMapper.FromEntry(approveEntry)).toBeInstanceOf(AuditLogOrmEntity);
    expect(
      (new InMemoryAuditLogRepository() as IAuditLogRepository & { Update?: unknown; Delete?: unknown }).Update,
    ).toBeUndefined();
    expect(
      (new InMemoryAuditLogRepository() as IAuditLogRepository & { Update?: unknown; Delete?: unknown }).Delete,
    ).toBeUndefined();
  });

  it('AC-03 accepts active profile resolution, specificity, priority override and compliance precedence', async () => {
    const world = await seedRuleWorld();
    const fallback = buildActiveProfile('profile-type-fallback');
    const warehouseSpecific = buildActiveProfile('profile-warehouse-specific', { warehouseId: TIER1_WAREHOUSE_ID });
    await world.profiles.Create(fallback);
    await world.profiles.Create(warehouseSpecific);

    const fallbackRule = BuildRule({
      RuleCode: 'TYPE-FALLBACK',
      WarehouseTypeCode: 'TIER_1',
      PrecedenceTier: RulePrecedenceTier.Operation,
    });
    const warehouseRule = BuildRule({
      RuleCode: 'WAREHOUSE-SPECIFIC',
      WarehouseTypeCode: 'TIER_1',
      WarehouseId: TIER1_WAREHOUSE_ID,
      PrecedenceTier: RulePrecedenceTier.Operation,
    });
    await world.definitions.Create(fallbackRule);
    await world.definitions.Create(warehouseRule);
    await world.bindings.Create(BuildBinding(fallback.Id, fallbackRule.Id));
    await world.bindings.Create(BuildBinding(warehouseSpecific.Id, warehouseRule.Id));

    const activeDecision = await world.resolver.Resolve({
      WarehouseTypeCode: 'TIER_1',
      WarehouseId: TIER1_WAREHOUSE_ID,
      EvaluatedAt: At,
      Attributes: {},
    });
    expect(activeDecision.Winner?.RuleCode).toBe('WAREHOUSE-SPECIFIC');

    const specificity = BuildRule({
      RuleCode: 'OWNER-SPECIFIC',
      WarehouseTypeCode: 'TIER_1',
      OwnerId: OWNER_T1_ID,
      PrecedenceTier: RulePrecedenceTier.Operation,
      Priority: 999,
    });
    const generic = BuildRule({
      RuleCode: 'GENERIC-LOW-PRIORITY',
      WarehouseTypeCode: 'TIER_1',
      PrecedenceTier: RulePrecedenceTier.Operation,
      Priority: 1,
    });
    await world.definitions.Create(specificity);
    await world.definitions.Create(generic);
    await world.bindings.Create(BuildBinding(warehouseSpecific.Id, specificity.Id));
    await world.bindings.Create(BuildBinding(warehouseSpecific.Id, generic.Id));
    const specificityDecision = await world.resolver.Resolve({
      WarehouseTypeCode: 'TIER_1',
      WarehouseId: TIER1_WAREHOUSE_ID,
      OwnerId: OWNER_T1_ID,
      EvaluatedAt: At,
      Attributes: {},
    });
    expect(specificityDecision.Winner?.RuleCode).toBe('OWNER-SPECIFIC');

    const overriddenPriority = BuildRule({
      RuleCode: 'BINDING-PRIORITY-OVERRIDE',
      WarehouseTypeCode: 'TIER_1',
      WarehouseId: TIER1_WAREHOUSE_ID,
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      Priority: 999,
    });
    const defaultPriority = BuildRule({
      RuleCode: 'DEFAULT-PRIORITY',
      WarehouseTypeCode: 'TIER_1',
      WarehouseId: TIER1_WAREHOUSE_ID,
      PrecedenceTier: RulePrecedenceTier.OwnerContract,
      Priority: 100,
    });
    await world.definitions.Create(overriddenPriority);
    await world.definitions.Create(defaultPriority);
    await world.bindings.Create(BuildBinding(warehouseSpecific.Id, overriddenPriority.Id, { OverridePriority: 1 }));
    await world.bindings.Create(BuildBinding(warehouseSpecific.Id, defaultPriority.Id));
    const priorityDecision = await world.resolver.Resolve({
      WarehouseTypeCode: 'TIER_1',
      WarehouseId: TIER1_WAREHOUSE_ID,
      EvaluatedAt: At,
      Attributes: {},
    });
    expect(priorityDecision.Winner?.RuleCode).toBe('BINDING-PRIORITY-OVERRIDE');

    const complianceBlock = BuildRule({
      RuleCode: 'COMPLIANCE-HARD-BLOCK',
      WarehouseTypeCode: 'TIER_1',
      PrecedenceTier: RulePrecedenceTier.Compliance,
      ControlMode: RuleControlMode.HardBlock,
      Priority: 999,
    });
    await world.definitions.Create(complianceBlock);
    await world.bindings.Create(BuildBinding(warehouseSpecific.Id, complianceBlock.Id));
    const precedenceDecision = await world.resolver.Resolve({
      WarehouseTypeCode: 'TIER_1',
      WarehouseId: TIER1_WAREHOUSE_ID,
      OwnerId: OWNER_T1_ID,
      EvaluatedAt: At,
      Attributes: {},
    });
    expect(precedenceDecision.Winner?.RuleCode).toBe('COMPLIANCE-HARD-BLOCK');
    expect(precedenceDecision.Allowed).toBe(false);
  });

  it('AC-03 accepts checklist pass/fail behavior for profile readiness and precedence conflicts', async () => {
    const passWorld = await seedRuleWorld();
    const passingProfile = buildActiveProfile('profile-checklist-pass');
    await passWorld.profiles.Create(passingProfile);
    const passingRule = BuildRule({
      RuleCode: 'TIER1-SOFT-WARNING',
      WarehouseTypeCode: 'TIER_1',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      RequiresReason: true,
      RuleGroupId: 'group-active',
    });
    await passWorld.definitions.Create(passingRule);
    await passWorld.bindings.Create(BuildBinding(passingProfile.Id, passingRule.Id));

    const passResult = await passWorld.checklist.Execute({ ProfileId: passingProfile.Id, EvaluatedAt: At });
    expect(passResult.OverallStatus).toBe(ProfileChecklistItemStatus.Pass);
    expect(itemStatus(passResult, ProfileChecklistItemCode.ActiveProfile)).toBe(ProfileChecklistItemStatus.Pass);
    expect(itemStatus(passResult, ProfileChecklistItemCode.PrecedenceConflict)).toBe(ProfileChecklistItemStatus.Pass);

    const failWorld = await seedRuleWorld();
    const conflictProfile = buildActiveProfile('profile-checklist-conflict');
    await failWorld.profiles.Create(conflictProfile);
    const ruleA = BuildRule({
      RuleCode: 'OP-CONFLICT-A',
      WarehouseTypeCode: 'TIER_1',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      RuleGroupId: 'group-active',
    });
    const ruleB = BuildRule({
      RuleCode: 'OP-CONFLICT-B',
      WarehouseTypeCode: 'TIER_1',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.ApprovalRequired,
      RuleGroupId: 'group-active',
    });
    await failWorld.definitions.Create(ruleA);
    await failWorld.definitions.Create(ruleB);
    await failWorld.bindings.Create(BuildBinding(conflictProfile.Id, ruleA.Id));
    await failWorld.bindings.Create(BuildBinding(conflictProfile.Id, ruleB.Id));

    const failResult = await failWorld.checklist.Execute({ ProfileId: conflictProfile.Id, EvaluatedAt: At });
    expect(failResult.OverallStatus).toBe(ProfileChecklistItemStatus.Fail);
    expect(itemStatus(failResult, ProfileChecklistItemCode.PrecedenceConflict)).toBe(ProfileChecklistItemStatus.Fail);
  });
});
