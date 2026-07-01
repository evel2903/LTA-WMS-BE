import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { CreateReasonCodeUseCase } from '@modules/AccessControl/Application/UseCases/CreateReasonCodeUseCase';
import { GetReasonCodeUseCase } from '@modules/AccessControl/Application/UseCases/GetReasonCodeUseCase';
import { ListReasonCodesUseCase } from '@modules/AccessControl/Application/UseCases/ListReasonCodesUseCase';
import { UpdateReasonCodeUseCase } from '@modules/AccessControl/Application/UseCases/UpdateReasonCodeUseCase';
import { InMemoryReasonCodeRepository } from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

const validCreate = {
  ReasonCode: 'RC-TEST',
  ReasonGroup: ReasonGroup.ManualFix,
  AppliesToActions: [ActionCode.Update],
  AppliesToObjects: [ObjectType.InventoryStatus],
};

describe('Reason code use cases', () => {
  it('creates an active reason code and returns the DTO', async () => {
    const repo = new InMemoryReasonCodeRepository();
    const dto = await new CreateReasonCodeUseCase(repo).Execute(validCreate);
    expect(dto.Status).toBe(ReasonCodeStatus.Active);
    expect(dto.Version).toBe(1);
    expect(dto.ReasonCode).toBe('RC-TEST');
  });

  it('rejects a duplicate reason code with ConflictException', async () => {
    const repo = new InMemoryReasonCodeRepository();
    const useCase = new CreateReasonCodeUseCase(repo);
    await useCase.Execute(validCreate);
    await expect(useCase.Execute(validCreate)).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists reason codes by action and object type intersection', async () => {
    const repo = new InMemoryReasonCodeRepository();
    const create = new CreateReasonCodeUseCase(repo);
    await create.Execute({
      ...validCreate,
      ReasonCode: 'RC-WH-UPDATE',
      AppliesToActions: [ActionCode.Update],
      AppliesToObjects: [ObjectType.Warehouse],
    });
    await create.Execute({
      ...validCreate,
      ReasonCode: 'RC-SITE-UPDATE',
      AppliesToActions: [ActionCode.Update],
      AppliesToObjects: [ObjectType.Site],
    });
    await create.Execute({
      ...validCreate,
      ReasonCode: 'RC-WH-APPROVE',
      AppliesToActions: [ActionCode.Approve],
      AppliesToObjects: [ObjectType.Warehouse],
    });

    const result = await new ListReasonCodesUseCase(repo).Execute({
      Action: ActionCode.Update,
      ObjectType: ObjectType.Warehouse,
      PageSize: 100,
    });

    expect(result.Items.map((item) => item.ReasonCode)).toEqual(['RC-WH-UPDATE']);
    expect(result.Meta.TotalItems).toBe(1);
  });

  it('combines status, group, action and object type filters', async () => {
    const repo = new InMemoryReasonCodeRepository();
    const create = new CreateReasonCodeUseCase(repo);
    const update = new UpdateReasonCodeUseCase(repo);
    await create.Execute({
      ...validCreate,
      ReasonCode: 'RC-MATCH',
      ReasonGroup: ReasonGroup.ManualFix,
      AppliesToActions: [ActionCode.Update],
      AppliesToObjects: [ObjectType.Warehouse],
    });
    await create.Execute({
      ...validCreate,
      ReasonCode: 'RC-WRONG-GROUP',
      ReasonGroup: ReasonGroup.RuleOverride,
      AppliesToActions: [ActionCode.Update],
      AppliesToObjects: [ObjectType.Warehouse],
    });
    await create.Execute({
      ...validCreate,
      ReasonCode: 'RC-WRONG-ACTION',
      ReasonGroup: ReasonGroup.ManualFix,
      AppliesToActions: [ActionCode.Approve],
      AppliesToObjects: [ObjectType.Warehouse],
    });
    await create.Execute({
      ...validCreate,
      ReasonCode: 'RC-WRONG-OBJECT',
      ReasonGroup: ReasonGroup.ManualFix,
      AppliesToActions: [ActionCode.Update],
      AppliesToObjects: [ObjectType.Site],
    });
    const inactive = await create.Execute({
      ...validCreate,
      ReasonCode: 'RC-WRONG-STATUS',
      ReasonGroup: ReasonGroup.ManualFix,
      AppliesToActions: [ActionCode.Update],
      AppliesToObjects: [ObjectType.Warehouse],
    });
    await update.Execute({ Id: inactive.Id, Status: ReasonCodeStatus.Inactive });

    const result = await new ListReasonCodesUseCase(repo).Execute({
      ReasonGroup: ReasonGroup.ManualFix,
      Status: ReasonCodeStatus.Active,
      Action: ActionCode.Update,
      ObjectType: ObjectType.Warehouse,
      PageSize: 100,
    });

    expect(result.Items.map((item) => item.ReasonCode)).toEqual(['RC-MATCH']);
    expect(result.Meta.TotalItems).toBe(1);
  });

  it('lists reason codes by object type only', async () => {
    const repo = new InMemoryReasonCodeRepository();
    const create = new CreateReasonCodeUseCase(repo);
    await create.Execute({
      ...validCreate,
      ReasonCode: 'RC-WH-UPDATE',
      AppliesToActions: [ActionCode.Update],
      AppliesToObjects: [ObjectType.Warehouse],
    });
    await create.Execute({
      ...validCreate,
      ReasonCode: 'RC-WH-APPROVE',
      AppliesToActions: [ActionCode.Approve],
      AppliesToObjects: [ObjectType.Warehouse],
    });
    await create.Execute({
      ...validCreate,
      ReasonCode: 'RC-SITE-UPDATE',
      AppliesToActions: [ActionCode.Update],
      AppliesToObjects: [ObjectType.Site],
    });

    const result = await new ListReasonCodesUseCase(repo).Execute({
      ObjectType: ObjectType.Warehouse,
      PageSize: 100,
    });

    expect(result.Items.map((item) => item.ReasonCode)).toEqual(['RC-WH-APPROVE', 'RC-WH-UPDATE']);
    expect(result.Meta.TotalItems).toBe(2);
  });

  it('keeps list backward compatible when ObjectType is omitted', async () => {
    const repo = new InMemoryReasonCodeRepository();
    const create = new CreateReasonCodeUseCase(repo);
    await create.Execute({
      ...validCreate,
      ReasonCode: 'RC-WH-UPDATE',
      AppliesToActions: [ActionCode.Update],
      AppliesToObjects: [ObjectType.Warehouse],
    });
    await create.Execute({
      ...validCreate,
      ReasonCode: 'RC-SITE-UPDATE',
      AppliesToActions: [ActionCode.Update],
      AppliesToObjects: [ObjectType.Site],
    });
    await create.Execute({
      ...validCreate,
      ReasonCode: 'RC-WH-APPROVE',
      AppliesToActions: [ActionCode.Approve],
      AppliesToObjects: [ObjectType.Warehouse],
    });

    const result = await new ListReasonCodesUseCase(repo).Execute({
      Action: ActionCode.Update,
      PageSize: 100,
    });

    expect(result.Items.map((item) => item.ReasonCode)).toEqual(['RC-SITE-UPDATE', 'RC-WH-UPDATE']);
    expect(result.Meta.TotalItems).toBe(2);
  });

  it('rejects an unknown action enum in the payload', async () => {
    const repo = new InMemoryReasonCodeRepository();
    await expect(
      new CreateReasonCodeUseCase(repo).Execute({
        ...validCreate,
        AppliesToActions: ['BOGUS' as ActionCode],
      }),
    ).rejects.toThrow();
  });

  it('GetReasonCode throws NotFound for a missing id', async () => {
    const repo = new InMemoryReasonCodeRepository();
    await expect(new GetReasonCodeUseCase(repo).Execute('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('PATCH deactivates a reason code (Status INACTIVE) and leaves other fields unchanged', async () => {
    const repo = new InMemoryReasonCodeRepository();
    const created = await new CreateReasonCodeUseCase(repo).Execute(validCreate);

    const updated = await new UpdateReasonCodeUseCase(repo).Execute({
      Id: created.Id,
      Status: ReasonCodeStatus.Inactive,
    });
    expect(updated.Status).toBe(ReasonCodeStatus.Inactive);
    expect(updated.ReasonCode).toBe('RC-TEST');
    expect(updated.AppliesToActions).toEqual([ActionCode.Update]);
    expect(updated.Version).toBe(2); // PATCH bumps version
  });

  it('rejects creating a reason code with empty AppliesToActions', async () => {
    const repo = new InMemoryReasonCodeRepository();
    await expect(new CreateReasonCodeUseCase(repo).Execute({ ...validCreate, AppliesToActions: [] })).rejects.toThrow();
  });

  it('rejects EffectiveTo on or before EffectiveFrom', async () => {
    const repo = new InMemoryReasonCodeRepository();
    await expect(
      new CreateReasonCodeUseCase(repo).Execute({
        ...validCreate,
        EffectiveFrom: '2026-02-01T00:00:00.000Z',
        EffectiveTo: '2026-01-01T00:00:00.000Z',
      }),
    ).rejects.toThrow();
  });

  it('PATCH with null on the applies-to arrays is a no-change (never persists null)', async () => {
    const repo = new InMemoryReasonCodeRepository();
    const created = await new CreateReasonCodeUseCase(repo).Execute(validCreate);
    const updated = await new UpdateReasonCodeUseCase(repo).Execute({
      Id: created.Id,
      AppliesToActions: null as never,
      AppliesToObjects: null as never,
    });
    expect(updated.AppliesToActions).toEqual([ActionCode.Update]);
    expect(updated.AppliesToObjects).toEqual([ObjectType.InventoryStatus]);
  });
});
