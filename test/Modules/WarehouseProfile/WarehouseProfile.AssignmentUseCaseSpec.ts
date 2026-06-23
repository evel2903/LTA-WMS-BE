import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/AssignmentType';
import { CreateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileUseCase';
import { CreateWarehouseProfileAssignmentUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileAssignmentUseCase';
import { ListWarehouseProfileAssignmentsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfileAssignmentsUseCase';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import {
  InMemoryWarehouseProfileAssignmentRepository,
  InMemoryWarehouseProfileRepository,
  MasterDataReferenceStub,
} from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';

const Build = () => {
  const profiles = new InMemoryWarehouseProfileRepository();
  const assignments = new InMemoryWarehouseProfileAssignmentRepository();
  const refs = new MasterDataReferenceStub();
  const create = new CreateWarehouseProfileUseCase(
    profiles,
    refs.Warehouses,
    refs.Zones,
    refs.Owners,
    refs.Skus,
    new ScopeKeyService(),
    new WarehouseProfilePolicyValidator(),
  );
  const assign = new CreateWarehouseProfileAssignmentUseCase(
    assignments,
    profiles,
    refs.Warehouses,
    new ScopeKeyService(),
  );
  const list = new ListWarehouseProfileAssignmentsUseCase(assignments, profiles);
  return { profiles, assignments, refs, create, assign, list };
};

const SeedProfile = async (create: CreateWarehouseProfileUseCase) =>
  create.Execute({
    ProfileCode: 'WP-ASSIGN',
    ProfileName: 'Assignable',
    WarehouseTypeCode: 'TIER_1',
    EffectiveFrom: '2026-01-01',
  });

describe('CreateWarehouseProfileAssignmentUseCase', () => {
  it('creates a WAREHOUSE_TYPE assignment with the type code', async () => {
    const { create, assign } = Build();
    const profile = await SeedProfile(create);

    const created = await assign.Execute({
      WarehouseProfileId: profile.Id,
      AssignmentType: AssignmentType.WarehouseType,
      WarehouseTypeCode: 'TIER_1',
    });

    expect(created.AssignmentType).toBe(AssignmentType.WarehouseType);
    expect(created.WarehouseTypeCode).toBe('TIER_1');
    expect(created.WarehouseId).toBeNull();
    expect(created.ScopeKey).toEqual(expect.any(String));
  });

  it('creates a WAREHOUSE assignment when the warehouse exists and is active', async () => {
    const { create, assign, refs } = Build();
    const profile = await SeedProfile(create);
    refs.AddWarehouse('warehouse-1', MasterDataStatus.Active);

    const created = await assign.Execute({
      WarehouseProfileId: profile.Id,
      AssignmentType: AssignmentType.Warehouse,
      WarehouseId: 'warehouse-1',
    });

    expect(created.AssignmentType).toBe(AssignmentType.Warehouse);
    expect(created.WarehouseId).toBe('warehouse-1');
    expect(created.WarehouseTypeCode).toBeNull();
  });

  it('throws NotFoundException when the referenced profile does not exist', async () => {
    const { assign } = Build();
    await expect(
      assign.Execute({
        WarehouseProfileId: 'missing-profile',
        AssignmentType: AssignmentType.WarehouseType,
        WarehouseTypeCode: 'TIER_1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires WarehouseTypeCode for a WAREHOUSE_TYPE assignment', async () => {
    const { create, assign } = Build();
    const profile = await SeedProfile(create);
    await expect(
      assign.Execute({ WarehouseProfileId: profile.Id, AssignmentType: AssignmentType.WarehouseType }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('requires WarehouseId for a WAREHOUSE assignment', async () => {
    const { create, assign } = Build();
    const profile = await SeedProfile(create);
    await expect(
      assign.Execute({ WarehouseProfileId: profile.Id, AssignmentType: AssignmentType.Warehouse }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('throws NotFoundException for a WAREHOUSE assignment to a missing warehouse', async () => {
    const { create, assign } = Build();
    const profile = await SeedProfile(create);
    await expect(
      assign.Execute({
        WarehouseProfileId: profile.Id,
        AssignmentType: AssignmentType.Warehouse,
        WarehouseId: 'missing-warehouse',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BusinessRuleException for a WAREHOUSE assignment to an inactive warehouse', async () => {
    const { create, assign, refs } = Build();
    const profile = await SeedProfile(create);
    refs.AddWarehouse('warehouse-inactive', MasterDataStatus.Inactive);
    await expect(
      assign.Execute({
        WarehouseProfileId: profile.Id,
        AssignmentType: AssignmentType.Warehouse,
        WarehouseId: 'warehouse-inactive',
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('lists assignments for an existing profile', async () => {
    const { create, assign, list } = Build();
    const profile = await SeedProfile(create);
    await assign.Execute({
      WarehouseProfileId: profile.Id,
      AssignmentType: AssignmentType.WarehouseType,
      WarehouseTypeCode: 'TIER_1',
    });

    const result = await list.Execute(profile.Id, {});

    expect(result.Items).toHaveLength(1);
    expect(result.Items[0].WarehouseProfileId).toBe(profile.Id);
    expect(result.Meta.TotalItems).toBe(1);
  });

  it('throws NotFoundException when listing assignments of a missing profile', async () => {
    const { list } = Build();
    await expect(list.Execute('missing-profile', {})).rejects.toBeInstanceOf(NotFoundException);
  });
});
