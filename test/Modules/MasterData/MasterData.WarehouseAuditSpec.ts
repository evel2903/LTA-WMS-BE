import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { StubAuditedTransaction } from '@modules/AccessControl/Test/AccessControlTestDoubles';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { IMasterDataOwnershipPolicyRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataOwnershipPolicyRepository';
import { CreateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseUseCase';
import { UpdateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/UpdateWarehouseUseCase';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

const ctx: AuditContext = {
  ActorUserId: 'u1',
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-1',
  RequestId: 'req-1',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

const now = new Date();
const warehouse = (code = 'WH-1') =>
  new WarehouseEntity({
    Id: 'wh1',
    SiteId: 'site1',
    WarehouseCode: code,
    WarehouseName: 'WH',
    WarehouseTypeCode: 'DC',
    Status: MasterDataStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
  });

const ownershipNoBlock = (): MasterDataOwnershipPolicyService =>
  new MasterDataOwnershipPolicyService({
    List: jest.fn(),
    FindByObjectGroup: jest.fn(async () => null),
  } as IMasterDataOwnershipPolicyRepository);

const siteRepo = (): ISiteRepository =>
  ({
    FindById: jest.fn(
      async () =>
        new SiteEntity({
          Id: 'site1',
          SiteCode: 'S1',
          SiteName: 'S',
          Status: MasterDataStatus.Active,
          CreatedAt: now,
          UpdatedAt: now,
        }),
    ),
  }) as unknown as ISiteRepository;

describe('Warehouse mutations write audit (C5 wired path)', () => {
  it('Create writes a Create audit entry with after-image and actor context', async () => {
    const stub = new StubAuditedTransaction();
    const whRepo = {
      FindByCode: jest.fn(async () => null),
      Create: jest.fn(async (w: WarehouseEntity) => w),
    } as unknown as IWarehouseRepository;
    const useCase = new CreateWarehouseUseCase(
      whRepo,
      siteRepo(),
      ownershipNoBlock(),
      stub as unknown as AuditedTransaction,
    );

    await useCase.Execute(
      {
        SiteId: 'site1',
        WarehouseCode: 'WH-1',
        WarehouseName: 'WH',
        WarehouseTypeCode: 'DC',
        Status: MasterDataStatus.Active,
      },
      ctx,
    );

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.Warehouse,
      ActorUserId: 'u1',
      CorrelationId: 'corr-1',
    });
    expect(stub.Entries[0].AfterJson).toMatchObject({ WarehouseCode: 'WH-1' });
  });

  it('Update writes an Update audit entry with before + after image', async () => {
    const stub = new StubAuditedTransaction();
    const existing = warehouse('WH-OLD');
    const whRepo = {
      FindById: jest.fn(async () => existing),
      FindByCode: jest.fn(async () => null),
      Update: jest.fn(async (w: WarehouseEntity) => w),
    } as unknown as IWarehouseRepository;
    const useCase = new UpdateWarehouseUseCase(
      whRepo,
      siteRepo(),
      ownershipNoBlock(),
      stub as unknown as AuditedTransaction,
    );

    await useCase.Execute({ Id: 'wh1', WarehouseName: 'WH New' }, ctx);

    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toMatchObject({ Action: ActionCode.Update, ObjectType: ObjectType.Warehouse });
    expect(stub.Entries[0].BeforeJson).toMatchObject({ WarehouseName: 'WH' });
    expect(stub.Entries[0].AfterJson).toMatchObject({ WarehouseName: 'WH New' });
  });
});
