import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import { PermissionEntity } from '@modules/AccessControl/Domain/Entities/PermissionEntity';
import { RolePermissionEntity } from '@modules/AccessControl/Domain/Entities/RolePermissionEntity';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  IReasonCodeCatalog,
  ValidateReasonInput,
  ValidateReasonResult,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { ROLE_PERMISSION_GRANTS } from '@modules/AccessControl/Application/Services/AccessControlCatalog';
import {
  ApplyReadPrerequisite,
  DiffRolePermissions,
} from '@modules/AccessControl/Application/Services/RolePermissionDiff';
import { SetRolePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/SetRolePermissionsUseCase';
import { ResetRolePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/ResetRolePermissionsUseCase';
import {
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryRoleRepository,
  StubAuditedTransaction,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

const ctx: AuditContext = {
  ActorUserId: 'admin-1',
  ActorRoleCodes: [RoleCode.WmsAdmin],
  ActorType: ActorType.User,
  CorrelationId: 'corr-ra02',
  RequestId: 'req-ra02',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

class FakeReasonCatalog implements IReasonCodeCatalog {
  public LastInput: ValidateReasonInput | null = null;
  constructor(
    private readonly result: ValidateReasonResult = {
      ReasonCodeId: 'rc-id',
      EvidenceRequired: false,
      ApprovalRequired: false,
    },
    private readonly rejection?: Error,
  ) {}
  public async ValidateReason(input: ValidateReasonInput): Promise<ValidateReasonResult> {
    this.LastInput = input;
    if (this.rejection) throw this.rejection;
    return this.result;
  }
}

const now = new Date();

const permission = (action: ActionCode, objectType: ObjectType): PermissionEntity =>
  new PermissionEntity({ Id: randomUUID(), Action: action, ObjectType: objectType, CreatedAt: now, UpdatedAt: now });

/** Seeds a permission repo with exactly the pairs given (plus any extras) and returns them by key. */
const seedPermissions = async (
  permissionRepository: InMemoryPermissionRepository,
  pairs: Array<[ActionCode, ObjectType]>,
): Promise<Map<string, PermissionEntity>> => {
  const map = new Map<string, PermissionEntity>();
  for (const [action, objectType] of pairs) {
    const entity = permission(action, objectType);
    await permissionRepository.Create(entity);
    map.set(PermissionEntity.BuildCode(action, objectType), entity);
  }
  return map;
};

const grant = async (
  rolePermissionRepository: InMemoryRolePermissionRepository,
  roleId: string,
  permissionEntity: PermissionEntity,
): Promise<void> => {
  await rolePermissionRepository.Create(
    new RolePermissionEntity({ Id: randomUUID(), RoleId: roleId, PermissionId: permissionEntity.Id, CreatedAt: now }),
  );
};

interface World {
  roles: InMemoryRoleRepository;
  permissions: InMemoryPermissionRepository;
  rolePermissions: InMemoryRolePermissionRepository;
  reasonCatalog: FakeReasonCatalog;
  stub: StubAuditedTransaction;
  setUseCase: SetRolePermissionsUseCase;
  resetUseCase: ResetRolePermissionsUseCase;
}

const buildWorld = (reasonCatalog: FakeReasonCatalog = new FakeReasonCatalog()): World => {
  const roles = new InMemoryRoleRepository();
  const permissions = new InMemoryPermissionRepository();
  const rolePermissions = new InMemoryRolePermissionRepository();
  const stub = new StubAuditedTransaction();
  const audited = stub as unknown as AuditedTransaction;
  return {
    roles,
    permissions,
    rolePermissions,
    reasonCatalog,
    stub,
    setUseCase: new SetRolePermissionsUseCase(roles, rolePermissions, permissions, reasonCatalog, audited),
    resetUseCase: new ResetRolePermissionsUseCase(roles, rolePermissions, permissions, reasonCatalog, audited),
  };
};

describe('RolePermissionDiff (pure helpers)', () => {
  it('ApplyReadPrerequisite dedupes and adds Read for every objectType present', () => {
    const result = ApplyReadPrerequisite([
      { Action: ActionCode.Update, ObjectType: ObjectType.Sku },
      { Action: ActionCode.Update, ObjectType: ObjectType.Sku }, // duplicate
      { Action: ActionCode.Create, ObjectType: ObjectType.Sku },
      { Action: ActionCode.Read, ObjectType: ObjectType.Warehouse },
    ]);

    const keys = result.map((p) => `${p.Action}:${p.ObjectType}`).sort();
    expect(keys).toEqual(
      [
        `${ActionCode.Update}:${ObjectType.Sku}`,
        `${ActionCode.Create}:${ObjectType.Sku}`,
        `${ActionCode.Read}:${ObjectType.Sku}`,
        `${ActionCode.Read}:${ObjectType.Warehouse}`,
      ].sort(),
    );
  });

  it('ApplyReadPrerequisite on an empty set stays empty (no phantom Read)', () => {
    expect(ApplyReadPrerequisite([])).toEqual([]);
  });

  it('DiffRolePermissions computes added/removed by PermissionId', () => {
    const kept = permission(ActionCode.Read, ObjectType.Sku);
    const added = permission(ActionCode.Update, ObjectType.Sku);
    const removedPermission = permission(ActionCode.Create, ObjectType.Sku);
    const keptRolePermission = new RolePermissionEntity({
      Id: 'rp-kept',
      RoleId: 'role-1',
      PermissionId: kept.Id,
      CreatedAt: now,
    });
    const removedRolePermission = new RolePermissionEntity({
      Id: 'rp-removed',
      RoleId: 'role-1',
      PermissionId: removedPermission.Id,
      CreatedAt: now,
    });

    const diff = DiffRolePermissions([kept, added], [keptRolePermission, removedRolePermission]);

    expect(diff.Added).toEqual([added]);
    expect(diff.Removed).toEqual([removedRolePermission]);
  });
});

describe('SetRolePermissionsUseCase', () => {
  it('throws NotFound when the role does not exist', async () => {
    const { setUseCase } = buildWorld();
    await expect(
      setUseCase.Execute({ Id: 'missing', Permissions: [], Version: 0, ReasonCode: 'RC-X' }, ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('grants a permission and auto-adds its Read prerequisite, persisted and in the response', async () => {
    const { roles, permissions, rolePermissions, setUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );
    await seedPermissions(permissions, [
      [ActionCode.Update, ObjectType.Sku],
      [ActionCode.Read, ObjectType.Sku],
    ]);

    const result = await setUseCase.Execute(
      {
        Id: role.Id,
        Permissions: [{ Action: ActionCode.Update, ObjectType: ObjectType.Sku }],
        Version: 0,
        ReasonCode: 'RC-X',
      },
      ctx,
    );

    const persisted = await rolePermissions.FindByRoleId(role.Id);
    expect(persisted).toHaveLength(2);
    const responseCodes = result.Permissions.map((p) => PermissionEntity.BuildCode(p.Action, p.ObjectType)).sort();
    expect(responseCodes).toEqual(
      [
        PermissionEntity.BuildCode(ActionCode.Update, ObjectType.Sku),
        PermissionEntity.BuildCode(ActionCode.Read, ObjectType.Sku),
      ].sort(),
    );
    expect(result.Version).toBe(1);
  });

  it('rejects an N/A pair (not in the catalog) with BusinessRuleException', async () => {
    const { roles, setUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );
    await expect(
      setUseCase.Execute(
        {
          Id: role.Id,
          Permissions: [{ Action: ActionCode.Adjust, ObjectType: ObjectType.AuditLog }],
          Version: 0,
          ReasonCode: 'RC-X',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects a NEW grant of a write-action on Role/Permission (Signal 4 rider)', async () => {
    const { roles, permissions, setUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );
    await seedPermissions(permissions, [
      [ActionCode.Update, ObjectType.Role],
      [ActionCode.Read, ObjectType.Role],
    ]);

    await expect(
      setUseCase.Execute(
        {
          Id: role.Id,
          Permissions: [{ Action: ActionCode.Update, ObjectType: ObjectType.Role }],
          Version: 0,
          ReasonCode: 'RC-X',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rider does NOT block an existing seed-grant (only checks `added`, not `current`)', async () => {
    const { roles, permissions, rolePermissions, setUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({
        Id: 'role-admin',
        RoleCode: 'WMS_ADMIN',
        RoleName: 'Admin',
        IsSystem: true,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    const seeded = await seedPermissions(permissions, [
      [ActionCode.Update, ObjectType.Role],
      [ActionCode.Read, ObjectType.Role],
    ]);
    await grant(rolePermissions, role.Id, seeded.get(PermissionEntity.BuildCode(ActionCode.Update, ObjectType.Role))!);
    await grant(rolePermissions, role.Id, seeded.get(PermissionEntity.BuildCode(ActionCode.Read, ObjectType.Role))!);

    // Resubmitting the SAME full set (already-granted Update:Role stays in `current`, never
    // enters `added`) must not trip the rider -- WMS_ADMIN keeps its own seed-grant.
    await expect(
      setUseCase.Execute(
        {
          Id: role.Id,
          Permissions: [
            { Action: ActionCode.Update, ObjectType: ObjectType.Role },
            { Action: ActionCode.Read, ObjectType: ObjectType.Role },
          ],
          Version: 0,
          ReasonCode: 'RC-X',
        },
        ctx,
      ),
    ).resolves.toBeDefined();
  });

  it('rider does NOT block granting Read:Role / Read:Permission', async () => {
    const { roles, permissions, setUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );
    await seedPermissions(permissions, [[ActionCode.Read, ObjectType.Permission]]);

    await expect(
      setUseCase.Execute(
        {
          Id: role.Id,
          Permissions: [{ Action: ActionCode.Read, ObjectType: ObjectType.Permission }],
          Version: 0,
          ReasonCode: 'RC-X',
        },
        ctx,
      ),
    ).resolves.toBeDefined();
  });

  it("rejects removing a permission from a system role (Signal 2' add-only)", async () => {
    const { roles, permissions, rolePermissions, setUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({
        Id: 'role-admin',
        RoleCode: 'WMS_ADMIN',
        RoleName: 'Admin',
        IsSystem: true,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    const seeded = await seedPermissions(permissions, [
      [ActionCode.Update, ObjectType.Sku],
      [ActionCode.Read, ObjectType.Sku],
    ]);
    await grant(rolePermissions, role.Id, seeded.get(PermissionEntity.BuildCode(ActionCode.Update, ObjectType.Sku))!);
    await grant(rolePermissions, role.Id, seeded.get(PermissionEntity.BuildCode(ActionCode.Read, ObjectType.Sku))!);

    // Submitting an empty set on a system role tries to remove everything -> add-only blocks it.
    await expect(
      setUseCase.Execute({ Id: role.Id, Permissions: [], Version: 0, ReasonCode: 'RC-X' }, ctx),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('add-only does not block a pure addition on a system role (removed stays empty)', async () => {
    const { roles, permissions, setUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({
        Id: 'role-admin',
        RoleCode: 'WMS_ADMIN',
        RoleName: 'Admin',
        IsSystem: true,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    await seedPermissions(permissions, [
      [ActionCode.Update, ObjectType.Sku],
      [ActionCode.Read, ObjectType.Sku],
    ]);

    await expect(
      setUseCase.Execute(
        {
          Id: role.Id,
          Permissions: [{ Action: ActionCode.Update, ObjectType: ObjectType.Sku }],
          Version: 0,
          ReasonCode: 'RC-X',
        },
        ctx,
      ),
    ).resolves.toBeDefined();
  });

  it('permissions:[] on a non-system role is a legitimate full revoke', async () => {
    const { roles, permissions, rolePermissions, setUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );
    const seeded = await seedPermissions(permissions, [[ActionCode.Read, ObjectType.Sku]]);
    await grant(rolePermissions, role.Id, seeded.get(PermissionEntity.BuildCode(ActionCode.Read, ObjectType.Sku))!);

    const result = await setUseCase.Execute({ Id: role.Id, Permissions: [], Version: 0, ReasonCode: 'RC-X' }, ctx);

    expect(result.Permissions).toEqual([]);
    expect(await rolePermissions.FindByRoleId(role.Id)).toEqual([]);
  });

  it('deduplicates a request with the same {action, objectType} pair sent twice', async () => {
    const { roles, permissions, rolePermissions, setUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );
    await seedPermissions(permissions, [
      [ActionCode.Update, ObjectType.Sku],
      [ActionCode.Read, ObjectType.Sku],
    ]);

    await expect(
      setUseCase.Execute(
        {
          Id: role.Id,
          Permissions: [
            { Action: ActionCode.Update, ObjectType: ObjectType.Sku },
            { Action: ActionCode.Update, ObjectType: ObjectType.Sku },
          ],
          Version: 0,
          ReasonCode: 'RC-X',
        },
        ctx,
      ),
    ).resolves.toBeDefined();
    // No ConflictException from a double-Create of the same pair.
    expect(await rolePermissions.FindByRoleId(role.Id)).toHaveLength(2);
  });

  it('requires a mandatory reason: propagates rejection from an unknown/inactive/inapplicable reason code', async () => {
    const reasonCatalog = new FakeReasonCatalog(undefined, new BusinessRuleException('Unknown reason code: RC-BAD'));
    const { roles, setUseCase } = buildWorld(reasonCatalog);
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );

    await expect(
      setUseCase.Execute({ Id: role.Id, Permissions: [], Version: 0, ReasonCode: 'RC-BAD' }, ctx),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('validates reason with {Action: Update, ObjectType: Role} unconditionally (not wrapped in an if)', async () => {
    const reasonCatalog = new FakeReasonCatalog();
    const { roles, setUseCase } = buildWorld(reasonCatalog);
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );

    await setUseCase.Execute({ Id: role.Id, Permissions: [], Version: 0, ReasonCode: 'RC-X' }, ctx);

    expect(reasonCatalog.LastInput).toEqual({
      ReasonCode: 'RC-X',
      Action: ActionCode.Update,
      ObjectType: ObjectType.Role,
    });
  });

  it('rejects when the reason code requires evidence and none was provided', async () => {
    const reasonCatalog = new FakeReasonCatalog({
      ReasonCodeId: 'rc-ev',
      EvidenceRequired: true,
      ApprovalRequired: false,
    });
    const { roles, setUseCase } = buildWorld(reasonCatalog);
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );

    await expect(
      setUseCase.Execute({ Id: role.Id, Permissions: [], Version: 0, ReasonCode: 'RC-EV' }, ctx),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('accepts when evidence is required and provided', async () => {
    const reasonCatalog = new FakeReasonCatalog({
      ReasonCodeId: 'rc-ev',
      EvidenceRequired: true,
      ApprovalRequired: false,
    });
    const { roles, setUseCase } = buildWorld(reasonCatalog);
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );

    await expect(
      setUseCase.Execute(
        { Id: role.Id, Permissions: [], Version: 0, ReasonCode: 'RC-EV', EvidenceRefs: ['photo://1'] },
        ctx,
      ),
    ).resolves.toBeDefined();
  });

  it('writes exactly 1 audit entry with the validated ReasonCodeId (not the raw request value) + Before/AfterJson', async () => {
    const reasonCatalog = new FakeReasonCatalog({
      ReasonCodeId: 'rc-validated',
      EvidenceRequired: false,
      ApprovalRequired: false,
    });
    const { roles, permissions, stub, setUseCase } = buildWorld(reasonCatalog);
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );
    await seedPermissions(permissions, [
      [ActionCode.Update, ObjectType.Sku],
      [ActionCode.Read, ObjectType.Sku],
    ]);

    await setUseCase.Execute(
      {
        Id: role.Id,
        Permissions: [{ Action: ActionCode.Update, ObjectType: ObjectType.Sku }],
        Version: 0,
        ReasonCode: 'RC-RAW-CODE-NOT-AN-ID',
        ReasonNote: 'granting SKU update',
      },
      ctx,
    );

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Update,
        ObjectType: ObjectType.Role,
        ObjectId: role.Id,
        ObjectCode: 'CUSTOM_ROLE',
        ReasonCodeId: 'rc-validated',
        ReasonNote: 'granting SKU update',
        ActorUserId: 'admin-1',
      }),
    );
    expect(stub.Entries[0].BeforeJson).toEqual({ Permissions: [] });
    expect(stub.Entries[0].AfterJson).toEqual({
      Permissions: [
        PermissionEntity.BuildCode(ActionCode.Read, ObjectType.Sku),
        PermissionEntity.BuildCode(ActionCode.Update, ObjectType.Sku),
      ].sort(),
    });
  });

  it('a no-op PUT (added=[], removed=[]) still writes 1 audit entry', async () => {
    const { roles, permissions, rolePermissions, stub, setUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );
    const seeded = await seedPermissions(permissions, [[ActionCode.Read, ObjectType.Sku]]);
    await grant(rolePermissions, role.Id, seeded.get(PermissionEntity.BuildCode(ActionCode.Read, ObjectType.Sku))!);

    await setUseCase.Execute(
      {
        Id: role.Id,
        Permissions: [{ Action: ActionCode.Read, ObjectType: ObjectType.Sku }],
        Version: 0,
        ReasonCode: 'RC-X',
      },
      ctx,
    );

    expect(stub.Entries).toHaveLength(1);
  });

  it('bumps PermissionsVersion by 1 on every successful write', async () => {
    const { roles, permissions, setUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );
    await seedPermissions(permissions, [[ActionCode.Read, ObjectType.Sku]]);

    const first = await setUseCase.Execute(
      {
        Id: role.Id,
        Permissions: [{ Action: ActionCode.Read, ObjectType: ObjectType.Sku }],
        Version: 0,
        ReasonCode: 'RC-X',
      },
      ctx,
    );
    expect(first.Version).toBe(1);

    const second = await setUseCase.Execute({ Id: role.Id, Permissions: [], Version: 1, ReasonCode: 'RC-X' }, ctx);
    expect(second.Version).toBe(2);
  });

  it('advances the role metadata token with the shared strict successor helper', async () => {
    const { roles, permissions, setUseCase } = buildWorld();
    const before = new Date('2999-01-01T00:00:00.123Z');
    const role = await roles.Create(
      new RoleEntity({
        Id: 'role-token',
        RoleCode: 'TOKEN_ROLE',
        RoleName: 'Token',
        CreatedAt: now,
        UpdatedAt: before,
      }),
    );
    await seedPermissions(permissions, [[ActionCode.Read, ObjectType.Sku]]);

    await setUseCase.Execute(
      {
        Id: role.Id,
        Permissions: [{ Action: ActionCode.Read, ObjectType: ObjectType.Sku }],
        Version: 0,
        ReasonCode: 'RC-X',
      },
      ctx,
    );

    expect((await roles.FindById(role.Id))?.UpdatedAt.toISOString()).toBe('2999-01-01T00:00:00.124Z');
  });

  it('rejects with ConflictException when the submitted Version does not match the role current PermissionsVersion', async () => {
    const { roles, permissions, setUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );
    await seedPermissions(permissions, [[ActionCode.Read, ObjectType.Sku]]);

    await expect(
      setUseCase.Execute(
        {
          Id: role.Id,
          Permissions: [{ Action: ActionCode.Read, ObjectType: ObjectType.Sku }],
          Version: 5,
          ReasonCode: 'RC-X',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ResetRolePermissionsUseCase', () => {
  it('throws NotFound when the role does not exist', async () => {
    const { resetUseCase } = buildWorld();
    await expect(resetUseCase.Execute({ Id: 'missing', ReasonCode: 'RC-X' }, ctx)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects resetting a non-system (custom) role', async () => {
    const { roles, resetUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({ Id: 'role-1', RoleCode: 'CUSTOM_ROLE', RoleName: 'Custom', CreatedAt: now, UpdatedAt: now }),
    );
    await expect(resetUseCase.Execute({ Id: role.Id, ReasonCode: 'RC-X' }, ctx)).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('a system role with zero seed grants defined resets to empty, not an error (Decision #10)', async () => {
    const { roles, rolePermissions, stub, resetUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({
        Id: 'role-ghost',
        RoleCode: 'NOT_IN_SEED_SYSTEM_ROLE',
        RoleName: 'Ghost System Role',
        IsSystem: true,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    const seededPermission = permission(ActionCode.Read, ObjectType.Sku);
    await grant(rolePermissions, role.Id, seededPermission);

    const result = await resetUseCase.Execute({ Id: role.Id, ReasonCode: 'RC-X' }, ctx);

    expect(result.Permissions).toEqual([]);
    expect(await rolePermissions.FindByRoleId(role.Id)).toEqual([]);
    expect(stub.Entries).toHaveLength(1);
  });

  it('restores a system role to exactly its seed grants (diff-based: adds missing, removes extras)', async () => {
    const { roles, permissions, rolePermissions, resetUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({
        Id: 'role-qc',
        RoleCode: RoleCode.Qc,
        RoleName: 'QC',
        IsSystem: true,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    const qcSeedPairs = ROLE_PERMISSION_GRANTS.filter((g) => g.Role === RoleCode.Qc);
    const seeded = await seedPermissions(
      permissions,
      qcSeedPairs.map((g): [ActionCode, ObjectType] => [g.Action, g.ObjectType]),
    );
    // Grant an extra, non-seed permission (simulating admin drift) that reset must strip.
    const extra = permission(ActionCode.Adjust, ObjectType.InventoryStatus);
    await permissions.Create(extra);
    await grant(rolePermissions, role.Id, extra);
    // Deliberately leave out ONE real seed grant so reset must ALSO add it back.
    const [firstSeedPair, ...restSeedPairs] = qcSeedPairs;
    for (const g of restSeedPairs) {
      await grant(rolePermissions, role.Id, seeded.get(PermissionEntity.BuildCode(g.Action, g.ObjectType))!);
    }

    const result = await resetUseCase.Execute({ Id: role.Id, ReasonCode: 'RC-X' }, ctx);

    const finalGrants = await rolePermissions.FindByRoleId(role.Id);
    const finalPermissionIds = new Set(finalGrants.map((rp) => rp.PermissionId));
    expect(finalGrants).toHaveLength(qcSeedPairs.length);
    expect(finalPermissionIds.has(extra.Id)).toBe(false); // stripped
    expect(
      finalPermissionIds.has(
        seeded.get(PermissionEntity.BuildCode(firstSeedPair.Action, firstSeedPair.ObjectType))!.Id,
      ),
    ).toBe(true); // restored
    expect(result.Permissions.map((p) => PermissionEntity.BuildCode(p.Action, p.ObjectType)).sort()).toEqual(
      qcSeedPairs.map((g) => PermissionEntity.BuildCode(g.Action, g.ObjectType)).sort(),
    );
  });

  it('does NOT run the seed through Read auto-prerequisite: QC keeps Override:OverrideLog without Read:OverrideLog', async () => {
    // Confirms the real seed shape this decision is based on (AccessControlCatalog.ts) --
    // if this assertion ever fails, the seed changed and the story's Dev Notes need revisiting.
    const overrideOverrideLog = ROLE_PERMISSION_GRANTS.some(
      (g) => g.Role === RoleCode.Qc && g.Action === ActionCode.Override && g.ObjectType === ObjectType.OverrideLog,
    );
    const readOverrideLog = ROLE_PERMISSION_GRANTS.some(
      (g) => g.Role === RoleCode.Qc && g.Action === ActionCode.Read && g.ObjectType === ObjectType.OverrideLog,
    );
    expect(overrideOverrideLog).toBe(true);
    expect(readOverrideLog).toBe(false);

    const { roles, permissions, rolePermissions, resetUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({
        Id: 'role-qc',
        RoleCode: RoleCode.Qc,
        RoleName: 'QC',
        IsSystem: true,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    const qcSeedPairs = ROLE_PERMISSION_GRANTS.filter((g) => g.Role === RoleCode.Qc);
    await seedPermissions(
      permissions,
      qcSeedPairs.map((g): [ActionCode, ObjectType] => [g.Action, g.ObjectType]),
    );

    const result = await resetUseCase.Execute({ Id: role.Id, ReasonCode: 'RC-X' }, ctx);

    const codes = new Set(result.Permissions.map((p) => PermissionEntity.BuildCode(p.Action, p.ObjectType)));
    expect(codes.has(PermissionEntity.BuildCode(ActionCode.Override, ObjectType.OverrideLog))).toBe(true);
    expect(codes.has(PermissionEntity.BuildCode(ActionCode.Read, ObjectType.OverrideLog))).toBe(false);
    expect(await rolePermissions.FindByRoleId(role.Id)).toHaveLength(qcSeedPairs.length);
  });

  it('is NOT blocked by add-only even when removed is non-empty (reset skips rider + add-only)', async () => {
    const { roles, permissions, rolePermissions, resetUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({
        Id: 'role-qc',
        RoleCode: RoleCode.Qc,
        RoleName: 'QC',
        IsSystem: true,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    const qcSeedPairs = ROLE_PERMISSION_GRANTS.filter((g) => g.Role === RoleCode.Qc);
    await seedPermissions(
      permissions,
      qcSeedPairs.map((g): [ActionCode, ObjectType] => [g.Action, g.ObjectType]),
    );
    const rogue = permission(ActionCode.Update, ObjectType.Sku);
    await permissions.Create(rogue);
    await grant(rolePermissions, role.Id, rogue); // extra grant that reset must remove -> removed != []

    await expect(resetUseCase.Execute({ Id: role.Id, ReasonCode: 'RC-X' }, ctx)).resolves.toBeDefined();
    expect((await rolePermissions.FindByRoleId(role.Id)).some((rp) => rp.PermissionId === rogue.Id)).toBe(false);
  });

  it('reset response returns the effective (seed) set, same shape as PUT', async () => {
    const { roles, permissions, resetUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({
        Id: 'role-qc',
        RoleCode: RoleCode.Qc,
        RoleName: 'QC',
        IsSystem: true,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    const qcSeedPairs = ROLE_PERMISSION_GRANTS.filter((g) => g.Role === RoleCode.Qc);
    await seedPermissions(
      permissions,
      qcSeedPairs.map((g): [ActionCode, ObjectType] => [g.Action, g.ObjectType]),
    );

    const result = await resetUseCase.Execute({ Id: role.Id, ReasonCode: 'RC-X' }, ctx);

    expect(result.Permissions).toHaveLength(qcSeedPairs.length);
  });

  it('requires a reason and validates it with {Action: Update, ObjectType: Role} same as PUT', async () => {
    const reasonCatalog = new FakeReasonCatalog();
    const { roles, permissions, resetUseCase } = buildWorld(reasonCatalog);
    const role = await roles.Create(
      new RoleEntity({
        Id: 'role-qc',
        RoleCode: RoleCode.Qc,
        RoleName: 'QC',
        IsSystem: true,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    await seedPermissions(
      permissions,
      ROLE_PERMISSION_GRANTS.filter((g) => g.Role === RoleCode.Qc).map((g): [ActionCode, ObjectType] => [
        g.Action,
        g.ObjectType,
      ]),
    );

    await resetUseCase.Execute({ Id: role.Id, ReasonCode: 'RC-RESET' }, ctx);

    expect(reasonCatalog.LastInput).toEqual({
      ReasonCode: 'RC-RESET',
      Action: ActionCode.Update,
      ObjectType: ObjectType.Role,
    });
  });

  it('writes exactly 1 audit entry for reset', async () => {
    const { roles, permissions, stub, resetUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({
        Id: 'role-qc',
        RoleCode: RoleCode.Qc,
        RoleName: 'QC',
        IsSystem: true,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    await seedPermissions(
      permissions,
      ROLE_PERMISSION_GRANTS.filter((g) => g.Role === RoleCode.Qc).map((g): [ActionCode, ObjectType] => [
        g.Action,
        g.ObjectType,
      ]),
    );

    await resetUseCase.Execute({ Id: role.Id, ReasonCode: 'RC-X' }, ctx);

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({ Action: ActionCode.Update, ObjectType: ObjectType.Role }),
    );
  });

  it('bumps PermissionsVersion by 1, unconditionally (no version check on reset)', async () => {
    const { roles, permissions, resetUseCase } = buildWorld();
    const role = await roles.Create(
      new RoleEntity({
        Id: 'role-qc',
        RoleCode: RoleCode.Qc,
        RoleName: 'QC',
        IsSystem: true,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    await seedPermissions(
      permissions,
      ROLE_PERMISSION_GRANTS.filter((g) => g.Role === RoleCode.Qc).map((g): [ActionCode, ObjectType] => [
        g.Action,
        g.ObjectType,
      ]),
    );

    const result = await resetUseCase.Execute({ Id: role.Id, ReasonCode: 'RC-X' }, ctx);

    expect(result.Version).toBe(1);
  });

  it('reset also advances the role metadata token with the shared strict successor helper', async () => {
    const { roles, permissions, resetUseCase } = buildWorld();
    const before = new Date('2999-01-01T00:00:00.123Z');
    const role = await roles.Create(
      new RoleEntity({
        Id: 'role-qc-token',
        RoleCode: RoleCode.Qc,
        RoleName: 'QC',
        IsSystem: true,
        CreatedAt: now,
        UpdatedAt: before,
      }),
    );
    await seedPermissions(
      permissions,
      ROLE_PERMISSION_GRANTS.filter((g) => g.Role === RoleCode.Qc).map((g): [ActionCode, ObjectType] => [
        g.Action,
        g.ObjectType,
      ]),
    );

    await resetUseCase.Execute({ Id: role.Id, ReasonCode: 'RC-X' }, ctx);

    expect((await roles.FindById(role.Id))?.UpdatedAt.toISOString()).toBe('2999-01-01T00:00:00.124Z');
  });
});

describe('PERMISSION_CATALOG invariant (RA-01 handoff to RA-02)', () => {
  it('every objectType referenced by the catalog also has a Read permission', () => {
    const objectTypesWithAnyAction = new Set(ROLE_PERMISSION_GRANTS.map((g) => g.ObjectType));
    const objectTypesWithRead = new Set(
      ROLE_PERMISSION_GRANTS.filter((g) => g.Action === ActionCode.Read).map((g) => g.ObjectType),
    );
    for (const objectType of objectTypesWithAnyAction) {
      expect(objectTypesWithRead.has(objectType)).toBe(true);
    }
  });
});
