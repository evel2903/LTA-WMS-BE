import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { CreateLocationUseCase } from '@modules/MasterData/Application/UseCases/CreateLocationUseCase';
import { GetLocationUseCase } from '@modules/MasterData/Application/UseCases/GetLocationUseCase';
import { GetLocationTreeUseCase } from '@modules/MasterData/Application/UseCases/GetLocationTreeUseCase';
import { ListLocationsUseCase } from '@modules/MasterData/Application/UseCases/ListLocationsUseCase';
import { UpdateLocationUseCase } from '@modules/MasterData/Application/UseCases/UpdateLocationUseCase';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { LocationController } from '@modules/MasterData/Presentation/Controllers/LocationController';

describe('E2E LocationController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const listExecute = jest.fn();
  const treeExecute = jest.fn();
  const updateExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(
      Test.createTestingModule({
        controllers: [LocationController],
        providers: [
          { provide: CreateLocationUseCase, useValue: { Execute: createExecute } },
          { provide: GetLocationUseCase, useValue: { Execute: getExecute } },
          { provide: ListLocationsUseCase, useValue: { Execute: listExecute } },
          { provide: GetLocationTreeUseCase, useValue: { Execute: treeExecute } },
          { provide: UpdateLocationUseCase, useValue: { Execute: updateExecute } },
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
    getExecute.mockReset();
    listExecute.mockReset();
    treeExecute.mockReset();
    updateExecute.mockReset();
  });

  it('POST /locations rejects missing required fields and non-whitelisted fields', async () => {
    await request(app.getHttpServer())
      .post('/locations')
      .send({ WarehouseId: 'warehouse-1', LocationCode: 'BIN-001', Unknown: true })
      .expect(400);

    expect(createExecute).not.toHaveBeenCalled();
  });

  it('POST /locations calls use case on valid body', async () => {
    createExecute.mockResolvedValue({ Id: 'location-1', LocationCode: 'BIN-001' });

    await request(app.getHttpServer())
      .post('/locations')
      .send({
        WarehouseId: 'warehouse-1',
        ZoneId: 'zone-1',
        LocationProfileId: 'profile-1',
        LocationCode: 'BIN-001',
        LocationName: 'Bin 001',
        LocationType: 'BIN',
        LocationStatus: LocationStatus.Active,
        CapacityQty: 100,
        BondedFlag: false,
      })
      .expect(201);

    expect(createExecute).toHaveBeenCalledWith({
      WarehouseId: 'warehouse-1',
      ZoneId: 'zone-1',
      LocationProfileId: 'profile-1',
      LocationCode: 'BIN-001',
      LocationName: 'Bin 001',
      LocationType: 'BIN',
      LocationStatus: LocationStatus.Active,
      CapacityQty: 100,
      BondedFlag: false,
    });
  });

  it('POST /locations rejects empty ParentLocationId', async () => {
    await request(app.getHttpServer())
      .post('/locations')
      .send({
        WarehouseId: 'warehouse-1',
        ZoneId: 'zone-1',
        LocationProfileId: 'profile-1',
        ParentLocationId: '',
        LocationCode: 'BIN-001',
        LocationName: 'Bin 001',
        LocationType: 'BIN',
        LocationStatus: LocationStatus.Active,
      })
      .expect(400);

    expect(createExecute).not.toHaveBeenCalled();
  });

  it('GET /locations/tree calls tree use case instead of :id route', async () => {
    treeExecute.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/locations/tree?WarehouseId=warehouse-1&ZoneId=zone-1').expect(200);

    expect(treeExecute).toHaveBeenCalledWith({ WarehouseId: 'warehouse-1', ZoneId: 'zone-1' });
    expect(getExecute).not.toHaveBeenCalled();
  });

  it('PATCH /locations/:id rejects empty required business fields', async () => {
    await request(app.getHttpServer()).patch('/locations/location-1').send({ LocationCode: '' }).expect(400);
    await request(app.getHttpServer()).patch('/locations/location-1').send({ LocationName: '' }).expect(400);
    await request(app.getHttpServer()).patch('/locations/location-1').send({ ParentLocationId: '' }).expect(400);

    expect(updateExecute).not.toHaveBeenCalled();
  });
});
