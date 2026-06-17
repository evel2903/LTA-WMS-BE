import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { ZoneController } from '@modules/MasterData/Presentation/Controllers/ZoneController';
import { CreateZoneUseCase } from '@modules/MasterData/Application/UseCases/CreateZoneUseCase';
import { GetZoneByIdUseCase } from '@modules/MasterData/Application/UseCases/GetZoneByIdUseCase';
import { ListZonesUseCase } from '@modules/MasterData/Application/UseCases/ListZonesUseCase';
import { UpdateZoneUseCase } from '@modules/MasterData/Application/UseCases/UpdateZoneUseCase';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

describe('E2E ZoneController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getByIdExecute = jest.fn();
  const listExecute = jest.fn();
  const updateExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ZoneController],
      providers: [
        { provide: CreateZoneUseCase, useValue: { Execute: createExecute } },
        { provide: GetZoneByIdUseCase, useValue: { Execute: getByIdExecute } },
        { provide: ListZonesUseCase, useValue: { Execute: listExecute } },
        { provide: UpdateZoneUseCase, useValue: { Execute: updateExecute } },
      ],
    }).compile();

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

  it('POST /zones rejects invalid body and non-whitelisted fields', async () => {
    await request(app.getHttpServer())
      .post('/zones')
      .send({ WarehouseId: 'warehouse-1', ZoneCode: 'PICK', Unknown: true })
      .expect(400);

    expect(createExecute).not.toHaveBeenCalled();
  });

  it('POST /zones calls use case on valid body', async () => {
    createExecute.mockResolvedValue({ Id: 'zone-1', ZoneCode: 'PICK' });

    await request(app.getHttpServer())
      .post('/zones')
      .send({
        WarehouseId: 'warehouse-1',
        ZoneCode: 'PICK',
        ZoneName: 'Picking Zone',
        ZoneType: 'PICKING',
        Status: MasterDataStatus.Active,
        Sequence: 10,
        ComplianceFlags: { Hazmat: false },
      })
      .expect(201);

    expect(createExecute).toHaveBeenCalledWith({
      WarehouseId: 'warehouse-1',
      ZoneCode: 'PICK',
      ZoneName: 'Picking Zone',
      ZoneType: 'PICKING',
      Status: MasterDataStatus.Active,
      Sequence: 10,
      ComplianceFlags: { Hazmat: false },
    });
  });

  it('GET /zones rejects invalid query and calls list use case for valid query', async () => {
    await request(app.getHttpServer()).get('/zones?Page=-1').expect(400);

    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 10, TotalItems: 0, TotalPages: 1 } });
    await request(app.getHttpServer())
      .get('/zones?Page=1&PageSize=10&WarehouseId=warehouse-1&Status=Active&ZoneCode=PICK')
      .expect(200);

    expect(listExecute).toHaveBeenCalledWith({
      Page: 1,
      PageSize: 10,
      WarehouseId: 'warehouse-1',
      Status: MasterDataStatus.Active,
      ZoneCode: 'PICK',
    });
  });

  it('GET /zones/:id and PATCH /zones/:id call use cases', async () => {
    getByIdExecute.mockResolvedValue({ Id: 'zone-1' });
    updateExecute.mockResolvedValue({ Id: 'zone-1', ZoneName: 'Updated' });

    await request(app.getHttpServer()).get('/zones/zone-1').expect(200);
    await request(app.getHttpServer()).patch('/zones/zone-1').send({ ZoneName: 'Updated' }).expect(200);

    expect(getByIdExecute).toHaveBeenCalledWith('zone-1');
    expect(updateExecute).toHaveBeenCalledWith({ Id: 'zone-1', ZoneName: 'Updated' });
  });
});
