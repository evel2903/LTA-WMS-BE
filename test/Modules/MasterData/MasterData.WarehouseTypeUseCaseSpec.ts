import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import {
  IWarehouseTypeRepository,
  WarehouseTypeListFilter,
} from '@modules/MasterData/Application/Interfaces/IWarehouseTypeRepository';
import { CreateWarehouseTypeUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseTypeUseCase';
import { GetWarehouseTypeUseCase } from '@modules/MasterData/Application/UseCases/GetWarehouseTypeUseCase';
import { ListWarehouseTypesUseCase } from '@modules/MasterData/Application/UseCases/ListWarehouseTypesUseCase';
import { UpdateWarehouseTypeUseCase } from '@modules/MasterData/Application/UseCases/UpdateWarehouseTypeUseCase';
import { WarehouseTypeEntity } from '@modules/MasterData/Domain/Entities/WarehouseTypeEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

const now = new Date('2026-01-01T00:00:00.000Z');

const WarehouseType = (overrides: Partial<WarehouseTypeEntity> = {}): WarehouseTypeEntity =>
  new WarehouseTypeEntity({
    Id: 'wt-1',
    WarehouseTypeCode: 'WT-01',
    WarehouseTypeName: 'Kho thường',
    Description: 'Kho thường',
    Status: MasterDataStatus.Active,
    SourceSystem: null,
    ReferenceId: null,
    CreatedAt: now,
    UpdatedAt: now,
    CreatedBy: null,
    UpdatedBy: null,
    ...overrides,
  });

class InMemoryWarehouseTypeRepository implements IWarehouseTypeRepository {
  public readonly ListCalls: Array<{ Skip: number; Take: number; Filter: WarehouseTypeListFilter }> = [];
  private readonly items = new Map<string, WarehouseTypeEntity>();

  public seed(entity: WarehouseTypeEntity): void {
    this.items.set(entity.Id, entity);
  }

  public async FindById(id: string): Promise<WarehouseTypeEntity | null> {
    return this.items.get(id) ?? null;
  }

  public async FindByCode(code: string): Promise<WarehouseTypeEntity | null> {
    const normalizedCode = code.trim().toUpperCase();
    return [...this.items.values()].find((item) => item.WarehouseTypeCode === normalizedCode) ?? null;
  }

  public async Create(entity: WarehouseTypeEntity): Promise<WarehouseTypeEntity> {
    this.items.set(entity.Id, entity);
    return entity;
  }

  public async Update(entity: WarehouseTypeEntity): Promise<WarehouseTypeEntity> {
    this.items.set(entity.Id, entity);
    return entity;
  }

  public async List(
    skip: number,
    take: number,
    filter: WarehouseTypeListFilter = {},
  ): Promise<{ Items: WarehouseTypeEntity[]; TotalItems: number }> {
    this.ListCalls.push({ Skip: skip, Take: take, Filter: filter });
    const all = [...this.items.values()].filter((item) => {
      if (filter.WarehouseTypeCode && item.WarehouseTypeCode !== filter.WarehouseTypeCode) return false;
      if (filter.Status && item.Status !== filter.Status) return false;
      return true;
    });
    return { Items: all.slice(skip, skip + take), TotalItems: all.length };
  }
}

describe('Warehouse type catalog use cases', () => {
  it('creates a warehouse type when code is unique', async () => {
    const repo = new InMemoryWarehouseTypeRepository();
    const result = await new CreateWarehouseTypeUseCase(repo).Execute({
      WarehouseTypeCode: 'WT-09',
      WarehouseTypeName: 'Kho thử nghiệm',
      Description: 'Kho thử nghiệm',
      Status: MasterDataStatus.Active,
    });

    expect(result.WarehouseTypeCode).toBe('WT-09');
    expect(result.WarehouseTypeName).toBe('Kho thử nghiệm');
    expect(await repo.FindByCode('WT-09')).not.toBeNull();
  });

  it('normalizes and rejects creating a duplicate code', async () => {
    const repo = new InMemoryWarehouseTypeRepository();
    repo.seed(WarehouseType({ WarehouseTypeCode: 'WT-01' }));

    const result = await new CreateWarehouseTypeUseCase(repo).Execute({
      WarehouseTypeCode: ' wt-09 ',
      WarehouseTypeName: 'Kho thử nghiệm',
      Status: MasterDataStatus.Active,
    });
    expect(result.WarehouseTypeCode).toBe('WT-09');

    await expect(
      new CreateWarehouseTypeUseCase(repo).Execute({
        WarehouseTypeCode: ' wt-01 ',
        WarehouseTypeName: 'Kho trùng',
        Status: MasterDataStatus.Active,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('gets and updates a warehouse type by id', async () => {
    const repo = new InMemoryWarehouseTypeRepository();
    repo.seed(WarehouseType({ Id: 'wt-1' }));

    const getResult = await new GetWarehouseTypeUseCase(repo).Execute('wt-1');
    expect(getResult.WarehouseTypeCode).toBe('WT-01');

    const updated = await new UpdateWarehouseTypeUseCase(repo).Execute({
      Id: 'wt-1',
      WarehouseTypeName: 'Kho thường cập nhật',
      Description: null,
      Status: MasterDataStatus.Inactive,
    });

    expect(updated.WarehouseTypeName).toBe('Kho thường cập nhật');
    expect(updated.Description).toBeNull();
    expect(updated.Status).toBe(MasterDataStatus.Inactive);
  });

  it('rejects updating an unknown id and empty patches', async () => {
    const repo = new InMemoryWarehouseTypeRepository();
    repo.seed(WarehouseType({ Id: 'wt-1', WarehouseTypeCode: 'WT-01' }));
    repo.seed(WarehouseType({ Id: 'wt-2', WarehouseTypeCode: 'WT-02' }));
    const useCase = new UpdateWarehouseTypeUseCase(repo);

    await expect(useCase.Execute({ Id: 'missing', WarehouseTypeName: 'Missing' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(useCase.Execute({ Id: 'wt-2' })).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('lists with PageSize default 50, max 100 and filters by code/status', async () => {
    const repo = new InMemoryWarehouseTypeRepository();
    repo.seed(WarehouseType({ Id: 'wt-1', WarehouseTypeCode: 'WT-01', Status: MasterDataStatus.Active }));
    repo.seed(WarehouseType({ Id: 'wt-2', WarehouseTypeCode: 'WT-02', Status: MasterDataStatus.Inactive }));
    const useCase = new ListWarehouseTypesUseCase(repo);

    const defaultResult = await useCase.Execute({});
    expect(defaultResult.Meta.PageSize).toBe(50);
    expect(repo.ListCalls[repo.ListCalls.length - 1]).toEqual({ Skip: 0, Take: 50, Filter: {} });

    const cappedResult = await useCase.Execute({ Page: 1, PageSize: 999 });
    expect(cappedResult.Meta.PageSize).toBe(100);
    expect(repo.ListCalls[repo.ListCalls.length - 1]).toEqual({ Skip: 0, Take: 100, Filter: {} });

    const filtered = await useCase.Execute({ WarehouseTypeCode: 'WT-01', Status: MasterDataStatus.Active });
    expect(filtered.Items).toHaveLength(1);
    expect(filtered.Items[0].WarehouseTypeCode).toBe('WT-01');
    expect(repo.ListCalls[repo.ListCalls.length - 1].Filter).toEqual({
      WarehouseTypeCode: 'WT-01',
      Status: MasterDataStatus.Active,
    });
  });
});
