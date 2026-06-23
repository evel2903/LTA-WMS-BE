import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { CreateReasonCodeUseCase } from '@modules/AccessControl/Application/UseCases/CreateReasonCodeUseCase';
import { GetReasonCodeUseCase } from '@modules/AccessControl/Application/UseCases/GetReasonCodeUseCase';
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
