import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';
import { UserRoleSource } from '@modules/AccessControl/Domain/Enums/UserRoleSource';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import { ReasonCodeEntity } from '@modules/AccessControl/Domain/Entities/ReasonCodeEntity';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  InMemoryRoleRepository,
  InMemoryUserRoleRepository,
  InMemoryReasonCodeRepository,
  StubAuditedTransaction,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';
import { AssignRoleToUserUseCase } from '@modules/AccessControl/Application/UseCases/AssignRoleToUserUseCase';
import { RemoveRoleFromUserUseCase } from '@modules/AccessControl/Application/UseCases/RemoveRoleFromUserUseCase';
import { CreateReasonCodeUseCase } from '@modules/AccessControl/Application/UseCases/CreateReasonCodeUseCase';
import { UpdateReasonCodeUseCase } from '@modules/AccessControl/Application/UseCases/UpdateReasonCodeUseCase';

const ctx: AuditContext = {
  ActorUserId: 'u-ac',
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-ac',
  RequestId: 'req-ac',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

const now = new Date();

const seededRole = (): RoleEntity =>
  new RoleEntity({
    Id: 'role-ws',
    RoleCode: RoleCode.WarehouseSupervisor,
    RoleName: 'Warehouse Supervisor',
    CreatedAt: now,
    UpdatedAt: now,
  });

const seededReasonCode = (): ReasonCodeEntity =>
  new ReasonCodeEntity({
    Id: 'rc-1',
    ReasonCode: 'RC-ADJ-01',
    ReasonGroup: ReasonGroup.InventoryAdjustment,
    Description: 'Original',
    AppliesToActions: [ActionCode.Adjust],
    AppliesToObjects: [ObjectType.InventoryStatus],
    EvidenceRequired: false,
    ApprovalRequired: false,
    AllowedRoleCodes: null,
    Status: ReasonCodeStatus.Active,
    Version: 1,
    EffectiveFrom: null,
    EffectiveTo: null,
    CreatedAt: now,
    UpdatedAt: now,
    CreatedBy: null,
    UpdatedBy: null,
  });

describe('AccessControl mutations write audit (C5 wired path)', () => {
  it('AssignRoleToUser writes a Create UserAssignment entry reflecting the user + actor context', async () => {
    const stub = new StubAuditedTransaction();
    const roleRepo = new InMemoryRoleRepository();
    await roleRepo.Create(seededRole());
    const userRoleRepo = new InMemoryUserRoleRepository();

    const useCase = new AssignRoleToUserUseCase(roleRepo, userRoleRepo, stub as unknown as AuditedTransaction);

    await useCase.Execute({ UserId: 'user-42', RoleCode: RoleCode.WarehouseSupervisor }, ctx);

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Create,
        ObjectType: ObjectType.UserAssignment,
        ActorUserId: 'u-ac',
        CorrelationId: 'corr-ac',
      }),
    );
    // The assigned user id is reflected in the after-image.
    expect(stub.Entries[0].AfterJson).toEqual(expect.objectContaining({ UserId: 'user-42' }));
  });

  it('RemoveRoleFromUser writes a DeleteCancel UserAssignment entry with the before-image of the removed assignment', async () => {
    const stub = new StubAuditedTransaction();
    const roleRepo = new InMemoryRoleRepository();
    await roleRepo.Create(seededRole());
    const userRoleRepo = new InMemoryUserRoleRepository();
    await userRoleRepo.Create(
      new UserRoleEntity({
        Id: 'ur-1',
        UserId: 'user-42',
        RoleId: 'role-ws',
        Source: UserRoleSource.Manual,
        AssignedAt: now,
        AssignedBy: 'admin-1',
      }),
    );

    const useCase = new RemoveRoleFromUserUseCase(roleRepo, userRoleRepo, stub as unknown as AuditedTransaction);

    await useCase.Execute({ UserId: 'user-42', RoleCode: RoleCode.WarehouseSupervisor }, ctx);

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.DeleteCancel,
        ObjectType: ObjectType.UserAssignment,
        ActorUserId: 'u-ac',
      }),
    );
    expect(stub.Entries[0].BeforeJson).toEqual(
      expect.objectContaining({ Id: 'ur-1', UserId: 'user-42', RoleId: 'role-ws' }),
    );
  });

  it('CreateReasonCode writes a Create ReasonCode entry with ObjectCode = the reason code', async () => {
    const stub = new StubAuditedTransaction();
    const reasonRepo = new InMemoryReasonCodeRepository();

    const useCase = new CreateReasonCodeUseCase(reasonRepo, stub as unknown as AuditedTransaction);

    await useCase.Execute(
      {
        ReasonCode: 'RC-ADJ-99',
        ReasonGroup: ReasonGroup.InventoryAdjustment,
        AppliesToActions: [ActionCode.Adjust],
        AppliesToObjects: [ObjectType.InventoryStatus],
      },
      ctx,
    );

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Create,
        ObjectType: ObjectType.ReasonCode,
        ObjectCode: 'RC-ADJ-99',
        ActorUserId: 'u-ac',
      }),
    );
    expect(stub.Entries[0].AfterJson).toEqual(expect.objectContaining({ ReasonCode: 'RC-ADJ-99' }));
  });

  it('UpdateReasonCode writes an Update ReasonCode entry with before + after image', async () => {
    const stub = new StubAuditedTransaction();
    const reasonRepo = new InMemoryReasonCodeRepository();
    const existing = seededReasonCode();
    await reasonRepo.Create(existing);

    const useCase = new UpdateReasonCodeUseCase(reasonRepo, stub as unknown as AuditedTransaction);

    await useCase.Execute({ Id: 'rc-1', Description: 'Updated' }, ctx);

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Update,
        ObjectType: ObjectType.ReasonCode,
        ObjectCode: 'RC-ADJ-01',
        ActorUserId: 'u-ac',
      }),
    );
    expect(stub.Entries[0].BeforeJson).toEqual(expect.objectContaining({ Description: 'Original' }));
    expect(stub.Entries[0].AfterJson).toEqual(expect.objectContaining({ Description: 'Updated' }));
  });
});
