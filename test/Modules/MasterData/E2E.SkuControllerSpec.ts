import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CreateSkuUseCase } from '@modules/MasterData/Application/UseCases/CreateSkuUseCase';
import { GetSkuUseCase } from '@modules/MasterData/Application/UseCases/GetSkuUseCase';
import { GetSkuRuleFactsUseCase } from '@modules/MasterData/Application/UseCases/GetSkuRuleFactsUseCase';
import { ListSkusUseCase } from '@modules/MasterData/Application/UseCases/ListSkusUseCase';
import { UpdateSkuUseCase } from '@modules/MasterData/Application/UseCases/UpdateSkuUseCase';
import { SkuController } from '@modules/MasterData/Presentation/Controllers/SkuController';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

describe('E2E SkuController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const getRuleFactsExecute = jest.fn();
  const listExecute = jest.fn();
  const updateExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(
      Test.createTestingModule({
        controllers: [SkuController],
        providers: [
          { provide: CreateSkuUseCase, useValue: { Execute: createExecute } },
          { provide: GetSkuUseCase, useValue: { Execute: getExecute } },
          { provide: GetSkuRuleFactsUseCase, useValue: { Execute: getRuleFactsExecute } },
          { provide: ListSkusUseCase, useValue: { Execute: listExecute } },
          { provide: UpdateSkuUseCase, useValue: { Execute: updateExecute } },
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
    getRuleFactsExecute.mockReset();
    listExecute.mockReset();
    updateExecute.mockReset();
  });

  it('declares create permission with owner scope from DefaultOwnerId', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, SkuController.prototype.Create)).toEqual({
      Action: ActionCode.Create,
      ObjectType: ObjectType.Sku,
      Scope: { OwnerId: { In: 'body', Key: 'DefaultOwnerId' } },
    });
  });

  it('POST /skus rejects missing required fields and empty optional IDs', async () => {
    await request(app.getHttpServer()).post('/skus').send({ SkuCode: 'SKU-001', DefaultOwnerId: '' }).expect(400);

    expect(createExecute).not.toHaveBeenCalled();
  });

  it('POST /skus calls use case and preserves envelope', async () => {
    createExecute.mockResolvedValue({ Id: 'sku-1', SkuCode: 'SKU-001' });

    const body = {
      SkuCode: 'SKU-001',
      SkuName: 'SKU 001',
      DefaultOwnerId: 'owner-1',
      ItemClass: 'DRY',
      ItemStatus: SkuStatus.Active,
      BaseUomId: 'uom-ea',
      InventoryUomId: 'uom-ea',
      LotControlled: true,
      ExpiryControlled: true,
      ShelfLifeDays: 365,
    };

    const response = await request(app.getHttpServer()).post('/skus').send(body).expect(201);

    expect(createExecute).toHaveBeenCalledWith(body, expect.objectContaining({ ActorUserId: 'test-admin' }));
    expect(response.body.Success).toBe(true);
    expect(response.body.Data.SkuCode).toBe('SKU-001');
  });

  it('GET /skus validates query and forwards filters', async () => {
    await request(app.getHttpServer()).get('/skus?Page=0').expect(400);

    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 20, TotalItems: 0, TotalPages: 1 } });
    await request(app.getHttpServer())
      .get('/skus?Page=1&PageSize=20&ItemStatus=Active&SkuCode=SKU&SkuName=Item&DefaultOwnerId=owner-1&ItemClass=DRY')
      .expect(200);

    expect(listExecute).toHaveBeenCalledWith({
      Page: 1,
      PageSize: 20,
      ItemStatus: SkuStatus.Active,
      SkuCode: 'SKU',
      SkuName: 'Item',
      DefaultOwnerId: 'owner-1',
      ItemClass: 'DRY',
    });
  });

  it('GET /skus/:id, GET /skus/:id/rule-facts and PATCH /skus/:id call use cases', async () => {
    getExecute.mockResolvedValue({ Id: 'sku-1' });
    getRuleFactsExecute.mockResolvedValue({ SkuId: 'sku-1', SkuCode: 'SKU-001' });
    updateExecute.mockResolvedValue({ Id: 'sku-1', SkuName: 'Updated' });

    await request(app.getHttpServer()).get('/skus/sku-1').expect(200);
    await request(app.getHttpServer()).get('/skus/sku-1/rule-facts').expect(200);
    await request(app.getHttpServer()).patch('/skus/sku-1').send({ SkuName: 'Updated' }).expect(200);

    expect(getExecute).toHaveBeenCalledWith('sku-1', expect.objectContaining({ ActorUserId: 'test-admin' }));
    expect(getRuleFactsExecute).toHaveBeenCalledWith('sku-1');
    expect(updateExecute).toHaveBeenCalledWith(
      { Id: 'sku-1', SkuName: 'Updated' },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
  });

  it('PATCH /skus/:id rejects empty required business fields', async () => {
    await request(app.getHttpServer()).patch('/skus/sku-1').send({ SkuCode: '' }).expect(400);
    await request(app.getHttpServer()).patch('/skus/sku-1').send({ SkuName: '' }).expect(400);
    await request(app.getHttpServer()).patch('/skus/sku-1').send({ ItemClass: '' }).expect(400);
    await request(app.getHttpServer()).patch('/skus/sku-1').send({ SkuCode: null }).expect(400);
    await request(app.getHttpServer()).patch('/skus/sku-1').send({ SkuName: null }).expect(400);
    await request(app.getHttpServer()).patch('/skus/sku-1').send({ ItemClass: null }).expect(400);

    expect(updateExecute).not.toHaveBeenCalled();
  });
});
