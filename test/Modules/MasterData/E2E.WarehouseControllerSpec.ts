import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { WarehouseController } from '@modules/MasterData/Presentation/Controllers/WarehouseController';
import { CreateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseUseCase';
import { GetWarehouseByIdUseCase } from '@modules/MasterData/Application/UseCases/GetWarehouseByIdUseCase';
import { ListWarehousesUseCase } from '@modules/MasterData/Application/UseCases/ListWarehousesUseCase';
import { UpdateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/UpdateWarehouseUseCase';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

describe('E2E WarehouseController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getByIdExecute = jest.fn();
  const listExecute = jest.fn();
  const updateExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(
      Test.createTestingModule({
        controllers: [WarehouseController],
        providers: [
          { provide: CreateWarehouseUseCase, useValue: { Execute: createExecute } },
          { provide: GetWarehouseByIdUseCase, useValue: { Execute: getByIdExecute } },
          { provide: ListWarehousesUseCase, useValue: { Execute: listExecute } },
          { provide: UpdateWarehouseUseCase, useValue: { Execute: updateExecute } },
        ],
      }),
    ).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    createExecute.mockReset();
    getByIdExecute.mockReset();
    listExecute.mockReset();
    updateExecute.mockReset();
  });

  it('POST /warehouses rejects invalid body and non-whitelisted fields', async () => {
    await request(app.getHttpServer())
      .post('/warehouses')
      .send({ SiteId: 'site-1', WarehouseCode: 'WH-HCM', Extra: true })
      .expect(400);

    expect(createExecute).not.toHaveBeenCalled();
  });

  it('POST /warehouses calls use case on valid body', async () => {
    createExecute.mockResolvedValue({ Id: 'warehouse-1', WarehouseCode: 'WH-HCM' });

    await request(app.getHttpServer())
      .post('/warehouses')
      .send({
        SiteId: 'site-1',
        WarehouseCode: 'WH-HCM',
        WarehouseName: 'Ho Chi Minh DC',
        WarehouseTypeCode: 'DC',
        Status: MasterDataStatus.Active,
        Timezone: 'Asia/Ho_Chi_Minh',
      })
      .expect(201);

    expect(createExecute).toHaveBeenCalledWith({
      SiteId: 'site-1',
      WarehouseCode: 'WH-HCM',
      WarehouseName: 'Ho Chi Minh DC',
      WarehouseTypeCode: 'DC',
      Status: MasterDataStatus.Active,
      Timezone: 'Asia/Ho_Chi_Minh',
    });
  });

  it('GET /warehouses rejects invalid query and calls list use case for valid query', async () => {
    await request(app.getHttpServer()).get('/warehouses?PageSize=0').expect(400);

    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 10, TotalItems: 0, TotalPages: 1 } });
    await request(app.getHttpServer())
      .get('/warehouses?Page=1&PageSize=10&SiteId=site-1&Status=Active&WarehouseCode=WH')
      .expect(200);

    expect(listExecute).toHaveBeenCalledWith({
      Page: 1,
      PageSize: 10,
      SiteId: 'site-1',
      Status: MasterDataStatus.Active,
      WarehouseCode: 'WH',
    });
  });

  it('GET /warehouses/:id and PATCH /warehouses/:id call use cases', async () => {
    getByIdExecute.mockResolvedValue({ Id: 'warehouse-1' });
    updateExecute.mockResolvedValue({ Id: 'warehouse-1', WarehouseName: 'Updated' });

    await request(app.getHttpServer()).get('/warehouses/warehouse-1').expect(200);
    await request(app.getHttpServer()).patch('/warehouses/warehouse-1').send({ WarehouseName: 'Updated' }).expect(200);

    expect(getByIdExecute).toHaveBeenCalledWith('warehouse-1');
    expect(updateExecute).toHaveBeenCalledWith({ Id: 'warehouse-1', WarehouseName: 'Updated' });
  });

  it('PATCH /warehouses/:id rejects empty required fields when provided', async () => {
    await request(app.getHttpServer()).patch('/warehouses/warehouse-1').send({ WarehouseName: '' }).expect(400);

    expect(updateExecute).not.toHaveBeenCalled();
  });
});
