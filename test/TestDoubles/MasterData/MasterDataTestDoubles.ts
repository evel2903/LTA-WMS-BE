import { ConflictException } from '@common/Exceptions/AppException';
import {
  IWarehouseRepository,
  WarehouseListFilter,
} from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';

/** In-memory IWarehouseRepository double for gate/adapter specs that need a real WarehouseTypeCode lookup. */
export class InMemoryWarehouseRepository implements IWarehouseRepository {
  private readonly warehouses = new Map<string, WarehouseEntity>();

  public Seed(warehouse: WarehouseEntity): void {
    this.warehouses.set(warehouse.Id, warehouse);
  }

  public async FindById(id: string): Promise<WarehouseEntity | null> {
    return this.warehouses.get(id) ?? null;
  }

  public async FindByCode(warehouseCode: string): Promise<WarehouseEntity | null> {
    return [...this.warehouses.values()].find((warehouse) => warehouse.WarehouseCode === warehouseCode) ?? null;
  }

  public async Create(warehouse: WarehouseEntity): Promise<WarehouseEntity> {
    if ([...this.warehouses.values()].some((existing) => existing.WarehouseCode === warehouse.WarehouseCode)) {
      throw new ConflictException('Warehouse code already exists');
    }
    this.warehouses.set(warehouse.Id, warehouse);
    return warehouse;
  }

  public async Update(warehouse: WarehouseEntity): Promise<WarehouseEntity> {
    this.warehouses.set(warehouse.Id, warehouse);
    return warehouse;
  }

  public async List(
    skip: number,
    take: number,
    filter: WarehouseListFilter = {},
  ): Promise<{ Items: WarehouseEntity[]; TotalItems: number }> {
    let items = [...this.warehouses.values()];
    if (filter.SiteId) items = items.filter((warehouse) => warehouse.SiteId === filter.SiteId);
    if (filter.Status) items = items.filter((warehouse) => warehouse.Status === filter.Status);
    if (filter.WarehouseCode) items = items.filter((warehouse) => warehouse.WarehouseCode === filter.WarehouseCode);
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}
