import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { CreateSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/CreateSkuBarcodeUseCase';
import { GetSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/GetSkuBarcodeUseCase';
import { ListSkuBarcodesUseCase } from '@modules/MasterData/Application/UseCases/ListSkuBarcodesUseCase';
import { ResolveSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/ResolveSkuBarcodeUseCase';
import { UpdateSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/UpdateSkuBarcodeUseCase';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuBarcodeController } from '@modules/MasterData/Presentation/Controllers/SkuBarcodeController';

describe('E2E SkuBarcodeController (no DB)', () => {
  let app: INestApplication;
  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const listExecute = jest.fn();
  const resolveExecute = jest.fn();
  const updateExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SkuBarcodeController],
      providers: [
        { provide: CreateSkuBarcodeUseCase, useValue: { Execute: createExecute } },
        { provide: GetSkuBarcodeUseCase, useValue: { Execute: getExecute } },
        { provide: ListSkuBarcodesUseCase, useValue: { Execute: listExecute } },
        { provide: ResolveSkuBarcodeUseCase, useValue: { Execute: resolveExecute } },
        { provide: UpdateSkuBarcodeUseCase, useValue: { Execute: updateExecute } },
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
    resolveExecute.mockReset();
    updateExecute.mockReset();
  });

  it('POST/PATCH /sku-barcodes rejects empty or null barcode scope fields', async () => {
    await request(app.getHttpServer())
      .post('/sku-barcodes')
      .send({
        SkuId: 'sku-1',
        UomId: 'uom-ea',
        BarcodeValue: '',
        BarcodeType: 'EAN13',
        Status: MasterDataStatus.Active,
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/sku-barcodes')
      .send({
        SkuId: 'sku-1',
        OwnerId: '',
        UomId: 'uom-ea',
        BarcodeValue: '0123456789012',
        BarcodeType: 'EAN13',
        Status: MasterDataStatus.Active,
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/sku-barcodes')
      .send({
        SkuId: 'sku-1',
        OwnerId: null,
        UomId: 'uom-ea',
        BarcodeValue: '0123456789012',
        BarcodeType: 'EAN13',
        Status: MasterDataStatus.Active,
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/sku-barcodes')
      .send({
        SkuId: 'sku-1',
        UomId: 'uom-ea',
        PackCode: null,
        BarcodeValue: '0123456789012',
        BarcodeType: 'EAN13',
        Status: MasterDataStatus.Active,
      })
      .expect(400);
    await request(app.getHttpServer()).patch('/sku-barcodes/barcode-1').send({ OwnerId: null }).expect(400);
    await request(app.getHttpServer()).patch('/sku-barcodes/barcode-1').send({ PackCode: null }).expect(400);
    await request(app.getHttpServer()).patch('/sku-barcodes/barcode-1').send({ Status: null }).expect(400);

    expect(createExecute).not.toHaveBeenCalled();
    expect(updateExecute).not.toHaveBeenCalled();
  });

  it('routes create, list, resolve, get and update through use cases', async () => {
    createExecute.mockResolvedValue({ Id: 'barcode-1', BarcodeValue: '0123456789012' });
    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 20, TotalItems: 0, TotalPages: 1 } });
    resolveExecute.mockResolvedValue({ Id: 'barcode-1', SkuId: 'sku-1' });
    getExecute.mockResolvedValue({ Id: 'barcode-1' });
    updateExecute.mockResolvedValue({ Id: 'barcode-1', BarcodeType: 'QR' });

    const body = {
      SkuId: 'sku-1',
      OwnerId: 'owner-1',
      UomId: 'uom-ea',
      PackCode: 'CASE',
      BarcodeValue: '0123456789012',
      BarcodeType: 'EAN13',
      IsPrimary: true,
      Status: MasterDataStatus.Active,
    };

    await request(app.getHttpServer()).post('/sku-barcodes').send(body).expect(201);
    await request(app.getHttpServer()).get('/sku-barcodes?Page=1&PageSize=20&SkuId=sku-1').expect(200);
    await request(app.getHttpServer())
      .get('/sku-barcodes/resolve?BarcodeValue=0123456789012&OwnerId=owner-1')
      .expect(200);
    await request(app.getHttpServer()).get('/sku-barcodes/barcode-1').expect(200);
    await request(app.getHttpServer()).patch('/sku-barcodes/barcode-1').send({ BarcodeType: 'QR' }).expect(200);

    expect(createExecute).toHaveBeenCalledWith(body);
    expect(resolveExecute).toHaveBeenCalledWith({ BarcodeValue: '0123456789012', OwnerId: 'owner-1' });
    expect(updateExecute).toHaveBeenCalledWith({ Id: 'barcode-1', BarcodeType: 'QR' });
  });
});
