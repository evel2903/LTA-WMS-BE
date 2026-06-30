import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import { CreateWarehouseTypeUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseTypeUseCase';
import { GetWarehouseTypeUseCase } from '@modules/MasterData/Application/UseCases/GetWarehouseTypeUseCase';
import { ListWarehouseTypesUseCase } from '@modules/MasterData/Application/UseCases/ListWarehouseTypesUseCase';
import { UpdateWarehouseTypeUseCase } from '@modules/MasterData/Application/UseCases/UpdateWarehouseTypeUseCase';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { WarehouseTypeController } from '@modules/MasterData/Presentation/Controllers/WarehouseTypeController';

describe('E2E WarehouseTypeController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getByIdExecute = jest.fn();
  const listExecute = jest.fn();
  const updateExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(
      Test.createTestingModule({
        controllers: [WarehouseTypeController],
        providers: [
          { provide: CreateWarehouseTypeUseCase, useValue: { Execute: createExecute } },
          { provide: GetWarehouseTypeUseCase, useValue: { Execute: getByIdExecute } },
          { provide: ListWarehouseTypesUseCase, useValue: { Execute: listExecute } },
          { provide: UpdateWarehouseTypeUseCase, useValue: { Execute: updateExecute } },
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

  it('POST /warehouse-types rejects invalid body and calls use case on valid body', async () => {
    await request(app.getHttpServer())
      .post('/warehouse-types')
      .send({ WarehouseTypeCode: 'WT-09', Extra: true })
      .expect(400);

    createExecute.mockResolvedValue({ Id: 'wt-9', WarehouseTypeCode: 'WT-09' });
    await request(app.getHttpServer())
      .post('/warehouse-types')
      .send({
        WarehouseTypeCode: 'WT-09',
        WarehouseTypeName: 'Kho thử nghiệm',
        Description: 'Kho thử nghiệm',
        Status: MasterDataStatus.Active,
      })
      .expect(201);

    expect(createExecute).toHaveBeenCalledWith(
      {
        WarehouseTypeCode: 'WT-09',
        WarehouseTypeName: 'Kho thử nghiệm',
        Description: 'Kho thử nghiệm',
        Status: MasterDataStatus.Active,
      },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
  });

  it('GET /warehouse-types validates PageSize max 100 and calls list use case', async () => {
    await request(app.getHttpServer()).get('/warehouse-types?PageSize=101').expect(400);

    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 50, TotalItems: 0, TotalPages: 1 } });
    await request(app.getHttpServer())
      .get('/warehouse-types?Page=1&PageSize=50&WarehouseTypeCode=WT-01&Status=Active')
      .expect(200);

    expect(listExecute).toHaveBeenCalledWith({
      Page: 1,
      PageSize: 50,
      WarehouseTypeCode: 'WT-01',
      Status: MasterDataStatus.Active,
    });
  });

  it('GET /warehouse-types/:id and PATCH /warehouse-types/:id call use cases', async () => {
    getByIdExecute.mockResolvedValue({ Id: 'wt-1' });
    updateExecute.mockResolvedValue({ Id: 'wt-1', WarehouseTypeName: 'Kho thường cập nhật' });

    await request(app.getHttpServer()).get('/warehouse-types/wt-1').expect(200);
    await request(app.getHttpServer()).patch('/warehouse-types/wt-1').send({ WarehouseTypeCode: 'WT-02' }).expect(400);
    await request(app.getHttpServer())
      .patch('/warehouse-types/wt-1')
      .send({ WarehouseTypeName: 'Kho thường cập nhật' })
      .expect(200);

    expect(getByIdExecute).toHaveBeenCalledWith('wt-1');
    expect(updateExecute).toHaveBeenCalledWith(
      { Id: 'wt-1', WarehouseTypeName: 'Kho thường cập nhật' },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
  });
});
