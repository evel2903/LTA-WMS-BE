import { randomUUID } from 'crypto';
import { CreateSiteUseCase } from '@modules/MasterData/Application/UseCases/CreateSiteUseCase';
import { CreateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseUseCase';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/AssignmentType';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { CreateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileUseCase';
import { GetWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetWarehouseProfileUseCase';
import { CreateWarehouseProfileAssignmentUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileAssignmentUseCase';
import { ListWarehouseProfileAssignmentsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfileAssignmentsUseCase';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import {
  InMemoryWarehouseProfileAssignmentRepository,
  InMemoryWarehouseProfileRepository,
} from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';

class MemorySiteRepository implements ISiteRepository {
  private readonly sites = new Map<string, SiteEntity>();
  public async FindById(id: string): Promise<SiteEntity | null> {
    return this.sites.get(id) ?? null;
  }
  public async FindByCode(code: string): Promise<SiteEntity | null> {
    return [...this.sites.values()].find((site) => site.SiteCode === code) ?? null;
  }
  public async Create(site: SiteEntity): Promise<SiteEntity> {
    this.sites.set(site.Id, site);
    return site;
  }
  public async Update(site: SiteEntity): Promise<SiteEntity> {
    this.sites.set(site.Id, site);
    return site;
  }
  public async List(): Promise<{ Items: SiteEntity[]; TotalItems: number }> {
    const items = [...this.sites.values()];
    return { Items: items, TotalItems: items.length };
  }
}

class MemoryWarehouseRepository implements IWarehouseRepository {
  private readonly warehouses = new Map<string, WarehouseEntity>();
  public async FindById(id: string): Promise<WarehouseEntity | null> {
    return this.warehouses.get(id) ?? null;
  }
  public async FindByCode(code: string): Promise<WarehouseEntity | null> {
    return [...this.warehouses.values()].find((w) => w.WarehouseCode === code) ?? null;
  }
  public async Create(warehouse: WarehouseEntity): Promise<WarehouseEntity> {
    this.warehouses.set(warehouse.Id, warehouse);
    return warehouse;
  }
  public async Update(warehouse: WarehouseEntity): Promise<WarehouseEntity> {
    this.warehouses.set(warehouse.Id, warehouse);
    return warehouse;
  }
  public async List(): Promise<{ Items: WarehouseEntity[]; TotalItems: number }> {
    const items = [...this.warehouses.values()];
    return { Items: items, TotalItems: items.length };
  }
}

describe('Warehouse profile Tier 1 integration fixture', () => {
  it('creates Site -> Tier 1 Warehouse -> draft Warehouse Profile and reads it back', async () => {
    const sites = new MemorySiteRepository();
    const warehouses = new MemoryWarehouseRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    const assignments = new InMemoryWarehouseProfileAssignmentRepository();

    const site = await new CreateSiteUseCase(sites).Execute({
      SiteCode: `SITE-${randomUUID().slice(0, 8)}`,
      SiteName: 'Tier 1 Site',
      Status: MasterDataStatus.Active,
    });

    const warehouse = await new CreateWarehouseUseCase(warehouses, sites).Execute({
      SiteId: site.Id,
      WarehouseCode: `WH-${randomUUID().slice(0, 8)}`,
      WarehouseName: 'Tier 1 Warehouse',
      WarehouseTypeCode: 'TIER_1',
      Status: MasterDataStatus.Active,
    });

    const createProfile = new CreateWarehouseProfileUseCase(
      profiles,
      warehouses,
      // zone/owner/sku not exercised here -> reuse warehouse stub is irrelevant; pass dedicated nulls via separate repos
      new MemoryWarehouseRepository() as never,
      new MemoryWarehouseRepository() as never,
      new MemoryWarehouseRepository() as never,
      new ScopeKeyService(),
      new WarehouseProfilePolicyValidator(),
    );

    const profile = await createProfile.Execute({
      ProfileCode: `WP-${randomUUID().slice(0, 8)}`,
      ProfileName: 'Tier 1 Default Profile',
      WarehouseTypeCode: 'TIER_1',
      EffectiveFrom: '2026-01-01',
      CapabilityFlags: { Putaway: true, Picking: true },
      StrategyPolicy: { PutawayStrategy: 'DIRECTED' },
    });

    expect(profile.Status).toBe(WarehouseProfileStatus.Draft);
    expect(profile.WarehouseTypeCode).toBe('TIER_1');

    const readBack = await new GetWarehouseProfileUseCase(profiles).Execute(profile.Id);
    expect(readBack.ProfileName).toBe('Tier 1 Default Profile');
    expect(readBack.CapabilityFlags).toEqual({ Putaway: true, Picking: true });
    expect(readBack.StrategyPolicy).toEqual({ PutawayStrategy: 'DIRECTED' });
    expect(readBack.EffectiveFrom).toBe('2026-01-01');
    expect(readBack.Status).toBe(WarehouseProfileStatus.Draft);

    const assign = new CreateWarehouseProfileAssignmentUseCase(
      assignments,
      profiles,
      warehouses,
      new ScopeKeyService(),
    );

    const typeAssignment = await assign.Execute({
      WarehouseProfileId: profile.Id,
      AssignmentType: AssignmentType.WarehouseType,
      WarehouseTypeCode: 'TIER_1',
    });
    const warehouseAssignment = await assign.Execute({
      WarehouseProfileId: profile.Id,
      AssignmentType: AssignmentType.Warehouse,
      WarehouseId: warehouse.Id,
    });

    expect(typeAssignment.WarehouseTypeCode).toBe('TIER_1');
    expect(warehouseAssignment.WarehouseId).toBe(warehouse.Id);

    const listed = await new ListWarehouseProfileAssignmentsUseCase(assignments, profiles).Execute(profile.Id, {});
    expect(listed.Items).toHaveLength(2);
    expect(listed.Items.map((a) => a.AssignmentType)).toEqual(
      expect.arrayContaining([AssignmentType.WarehouseType, AssignmentType.Warehouse]),
    );
  });
});
