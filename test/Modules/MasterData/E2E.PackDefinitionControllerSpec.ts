import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { CreatePackDefinitionUseCase } from '@modules/MasterData/Application/UseCases/CreatePackDefinitionUseCase';
import { GetPackDefinitionUseCase } from '@modules/MasterData/Application/UseCases/GetPackDefinitionUseCase';
import { ListPackDefinitionsUseCase } from '@modules/MasterData/Application/UseCases/ListPackDefinitionsUseCase';
import { UpdatePackDefinitionUseCase } from '@modules/MasterData/Application/UseCases/UpdatePackDefinitionUseCase';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { PackDefinitionController } from '@modules/MasterData/Presentation/Controllers/PackDefinitionController';

describe('E2E PackDefinitionController (no DB)', () => {
  let app: INestApplication;
  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const listExecute = jest.fn();
  const updateExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PackDefinitionController],
      providers: [
        { provide: CreatePackDefinitionUseCase, useValue: { Execute: createExecute } },
        { provide: GetPackDefinitionUseCase, useValue: { Execute: getExecute } },
        { provide: ListPackDefinitionsUseCase, useValue: { Execute: listExecute } },
        { provide: UpdatePackDefinitionUseCase, useValue: { Execute: updateExecute } },
      ],
    }).compile();

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

  it('rejects non-positive quantity and null business-required PATCH fields', async () => {
    await request(app.getHttpServer())
      .post('/pack-definitions')
      .send({
        SkuId: 'sku-1',
        PackCode: 'CASE',
        PackName: 'Case',
        UomId: 'uom-ea',
        QuantityPerPack: 0,
        Status: MasterDataStatus.Active,
      })
      .expect(400);
    await request(app.getHttpServer()).patch('/pack-definitions/pack-1').send({ PackName: null }).expect(400);
    await request(app.getHttpServer()).patch('/pack-definitions/pack-1').send({ Status: null }).expect(400);

    expect(createExecute).not.toHaveBeenCalled();
    expect(updateExecute).not.toHaveBeenCalled();
  });

  it('routes create, list, get and update through use cases', async () => {
    createExecute.mockResolvedValue({ Id: 'pack-1', PackCode: 'CASE' });
    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 20, TotalItems: 0, TotalPages: 1 } });
    getExecute.mockResolvedValue({ Id: 'pack-1' });
    updateExecute.mockResolvedValue({ Id: 'pack-1', PackName: 'Updated' });

    const body = {
      SkuId: 'sku-1',
      PackCode: 'CASE',
      PackName: 'Case',
      UomId: 'uom-ea',
      QuantityPerPack: 12,
      IsDefault: true,
      Status: MasterDataStatus.Active,
    };

    await request(app.getHttpServer()).post('/pack-definitions').send(body).expect(201);
    await request(app.getHttpServer()).get('/pack-definitions?Page=1&PageSize=20&SkuId=sku-1').expect(200);
    await request(app.getHttpServer()).get('/pack-definitions/pack-1').expect(200);
    await request(app.getHttpServer()).patch('/pack-definitions/pack-1').send({ PackName: 'Updated' }).expect(200);

    expect(createExecute).toHaveBeenCalledWith(body);
    expect(updateExecute).toHaveBeenCalledWith({ Id: 'pack-1', PackName: 'Updated' });
  });
});
