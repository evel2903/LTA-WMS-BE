import { ConflictException } from '@common/Exceptions/AppException';
import { Repository } from 'typeorm';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/AssignmentType';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileAssignmentEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileAssignmentEntity';
import { WarehouseProfileOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileOrmEntity';
import { WarehouseProfileAssignmentOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileAssignmentOrmEntity';
import { WarehouseProfileRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/WarehouseProfileRepository';
import { WarehouseProfileAssignmentRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/WarehouseProfileAssignmentRepository';

const DuplicateKeyError = () => Object.assign(new Error('duplicate key'), { code: '23505' });
const Now = new Date('2026-01-01T00:00:00.000Z');

const Profile = () =>
  new WarehouseProfileEntity({
    Id: 'profile-1',
    ProfileCode: 'WP-1',
    ProfileName: 'Profile 1',
    WarehouseTypeCode: 'TIER_1',
    Version: 1,
    Status: WarehouseProfileStatus.Draft,
    WarehouseId: null,
    ZoneId: null,
    LocationType: null,
    OwnerId: null,
    SkuId: null,
    ItemClass: null,
    OrderType: null,
    CustomerId: null,
    SupplierId: null,
    ScopeKey: 'scope-key-1',
    EffectiveFrom: Now,
    EffectiveTo: null,
    CapabilityFlags: {},
    StrategyPolicy: {},
    ThresholdPolicy: {},
    ApprovalPolicy: {},
    LabelDevicePolicy: {},
    IntegrationPolicy: {},
    AuditPolicy: {},
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: Now,
    UpdatedAt: Now,
    CreatedBy: null,
    UpdatedBy: null,
  });

const Assignment = () =>
  new WarehouseProfileAssignmentEntity({
    Id: 'assignment-1',
    WarehouseProfileId: 'profile-1',
    AssignmentType: AssignmentType.WarehouseType,
    WarehouseTypeCode: 'TIER_1',
    WarehouseId: null,
    ScopeKey: 'scope-key-1',
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: Now,
    UpdatedAt: Now,
    CreatedBy: null,
    UpdatedBy: null,
  });

describe('WarehouseProfile repositories', () => {
  it('maps profile DB unique violation 23505 to ConflictException on create', async () => {
    const repository = new WarehouseProfileRepository({
      save: jest.fn().mockRejectedValue(DuplicateKeyError()),
    } as unknown as Repository<WarehouseProfileOrmEntity>);

    await expect(repository.Create(Profile())).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps profile DB unique violation 23505 to ConflictException on update', async () => {
    const repository = new WarehouseProfileRepository({
      save: jest.fn().mockRejectedValue(DuplicateKeyError()),
    } as unknown as Repository<WarehouseProfileOrmEntity>);

    await expect(repository.Update(Profile())).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps assignment DB unique violation 23505 to ConflictException on create', async () => {
    const repository = new WarehouseProfileAssignmentRepository({
      save: jest.fn().mockRejectedValue(DuplicateKeyError()),
    } as unknown as Repository<WarehouseProfileAssignmentOrmEntity>);

    await expect(repository.Create(Assignment())).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows non-unique-violation errors unchanged from the profile repository', async () => {
    const original = new Error('connection lost');
    const repository = new WarehouseProfileRepository({
      save: jest.fn().mockRejectedValue(original),
    } as unknown as Repository<WarehouseProfileOrmEntity>);

    await expect(repository.Create(Profile())).rejects.toBe(original);
  });
});
