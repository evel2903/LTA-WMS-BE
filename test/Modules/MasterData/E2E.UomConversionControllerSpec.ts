import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { CreateUomConversionUseCase } from '@modules/MasterData/Application/UseCases/CreateUomConversionUseCase';
import { GetUomConversionUseCase } from '@modules/MasterData/Application/UseCases/GetUomConversionUseCase';
import { ListUomConversionsUseCase } from '@modules/MasterData/Application/UseCases/ListUomConversionsUseCase';
import { UpdateUomConversionUseCase } from '@modules/MasterData/Application/UseCases/UpdateUomConversionUseCase';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { UomConversionController } from '@modules/MasterData/Presentation/Controllers/UomConversionController';

describe('E2E UomConversionController (no DB)', () => {
  let app: INestApplication;
  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const listExecute = jest.fn();
  const updateExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UomConversionController],
      providers: [
        { provide: CreateUomConversionUseCase, useValue: { Execute: createExecute } },
        { provide: GetUomConversionUseCase, useValue: { Execute: getExecute } },
        { provide: ListUomConversionsUseCase, useValue: { Execute: listExecute } },
        { provide: UpdateUomConversionUseCase, useValue: { Execute: updateExecute } },
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

  it('rejects zero factor, missing effective date and null business-required PATCH IDs', async () => {
    await request(app.getHttpServer())
      .post('/uom-conversions')
      .send({
        SkuId: 'sku-1',
        FromUomId: 'uom-case',
        ToUomId: 'uom-ea',
        Factor: 0,
        EffectiveFrom: '2026-01-01T00:00:00.000Z',
        Status: MasterDataStatus.Active,
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/uom-conversions')
      .send({ SkuId: 'sku-1', FromUomId: 'uom-case', ToUomId: 'uom-ea', Factor: 12, Status: MasterDataStatus.Active })
      .expect(400);
    await request(app.getHttpServer()).patch('/uom-conversions/conversion-1').send({ ToUomId: null }).expect(400);
    await request(app.getHttpServer()).patch('/uom-conversions/conversion-1').send({ Status: null }).expect(400);

    expect(createExecute).not.toHaveBeenCalled();
    expect(updateExecute).not.toHaveBeenCalled();
  });

  it('routes create, list, get and update through use cases', async () => {
    createExecute.mockResolvedValue({ Id: 'conversion-1', Factor: 12 });
    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 20, TotalItems: 0, TotalPages: 1 } });
    getExecute.mockResolvedValue({ Id: 'conversion-1' });
    updateExecute.mockResolvedValue({ Id: 'conversion-1', Factor: 24 });

    const body = {
      SkuId: 'sku-1',
      FromUomId: 'uom-case',
      ToUomId: 'uom-ea',
      Factor: 12,
      EffectiveFrom: '2026-01-01T00:00:00.000Z',
      Status: MasterDataStatus.Active,
    };

    await request(app.getHttpServer()).post('/uom-conversions').send(body).expect(201);
    await request(app.getHttpServer()).get('/uom-conversions?Page=1&PageSize=20&SkuId=sku-1').expect(200);
    await request(app.getHttpServer()).get('/uom-conversions/conversion-1').expect(200);
    await request(app.getHttpServer()).patch('/uom-conversions/conversion-1').send({ Factor: 24 }).expect(200);

    expect(createExecute).toHaveBeenCalledWith({ ...body, EffectiveFrom: new Date('2026-01-01T00:00:00.000Z') });
    expect(updateExecute).toHaveBeenCalledWith({ Id: 'conversion-1', Factor: 24 });
  });
});
