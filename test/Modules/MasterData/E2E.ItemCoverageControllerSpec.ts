import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { CreateItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/CreateItemCoverageUseCase';
import { GetItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/GetItemCoverageUseCase';
import { ListItemCoveragesUseCase } from '@modules/MasterData/Application/UseCases/ListItemCoveragesUseCase';
import { UpdateItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/UpdateItemCoverageUseCase';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { ItemCoverageController } from '@modules/MasterData/Presentation/Controllers/ItemCoverageController';

describe('E2E ItemCoverageController (no DB)', () => {
  let app: INestApplication;
  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const listExecute = jest.fn();
  const updateExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(
      Test.createTestingModule({
        controllers: [ItemCoverageController],
        providers: [
          { provide: CreateItemCoverageUseCase, useValue: { Execute: createExecute } },
          { provide: GetItemCoverageUseCase, useValue: { Execute: getExecute } },
          { provide: ListItemCoveragesUseCase, useValue: { Execute: listExecute } },
          { provide: UpdateItemCoverageUseCase, useValue: { Execute: updateExecute } },
        ],
      }),
    ).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    createExecute.mockReset();
    getExecute.mockReset();
    listExecute.mockReset();
    updateExecute.mockReset();
  });

  it('rejects invalid quantities and null business-required PATCH IDs', async () => {
    await request(app.getHttpServer())
      .post('/item-coverages')
      .send({ SkuId: 'sku-1', WarehouseId: 'warehouse-tier-1', MinQty: -1, Status: MasterDataStatus.Active })
      .expect(400);
    await request(app.getHttpServer())
      .post('/item-coverages')
      .send({ SkuId: 'sku-1', WarehouseId: 'warehouse-tier-1', MultipleQty: 0, Status: MasterDataStatus.Active })
      .expect(400);
    await request(app.getHttpServer()).patch('/item-coverages/coverage-1').send({ SkuId: null }).expect(400);
    await request(app.getHttpServer()).patch('/item-coverages/coverage-1').send({ Status: null }).expect(400);

    expect(createExecute).not.toHaveBeenCalled();
    expect(updateExecute).not.toHaveBeenCalled();
  });

  it('routes create, list, get and update through use cases', async () => {
    createExecute.mockResolvedValue({ Id: 'coverage-1', SkuId: 'sku-1' });
    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 20, TotalItems: 0, TotalPages: 1 } });
    getExecute.mockResolvedValue({ Id: 'coverage-1' });
    updateExecute.mockResolvedValue({ Id: 'coverage-1', StopShipping: true });

    const body = {
      SkuId: 'sku-1',
      WarehouseId: 'warehouse-tier-1',
      OwnerId: 'owner-1',
      MinQty: 10,
      MaxQty: 100,
      StandardQty: 24,
      MultipleQty: 6,
      LeadTimeDays: 2,
      DefaultReceiveWarehouseId: 'warehouse-tier-1',
      DefaultShipWarehouseId: 'warehouse-tier-1',
      ReorderPolicy: { Method: 'MinMax' },
      Status: MasterDataStatus.Active,
    };

    await request(app.getHttpServer()).post('/item-coverages').send(body).expect(201);
    await request(app.getHttpServer()).get('/item-coverages?Page=1&PageSize=20&SkuId=sku-1').expect(200);
    await request(app.getHttpServer()).get('/item-coverages/coverage-1').expect(200);
    await request(app.getHttpServer()).patch('/item-coverages/coverage-1').send({ StopShipping: true }).expect(200);

    expect(createExecute).toHaveBeenCalledWith(body, expect.objectContaining({ ActorUserId: 'test-admin' }));
    expect(updateExecute).toHaveBeenCalledWith(
      { Id: 'coverage-1', StopShipping: true },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
  });
});
