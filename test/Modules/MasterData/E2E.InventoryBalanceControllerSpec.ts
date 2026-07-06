import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { ListInventorySerialLookupUseCase } from '@modules/MasterData/Application/UseCases/ListInventorySerialLookupUseCase';
import { InventoryBalanceController } from '@modules/MasterData/Presentation/Controllers/InventoryBalanceController';

describe('E2E InventoryBalanceController (no DB)', () => {
  let app: INestApplication;

  const listExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(
      Test.createTestingModule({
        controllers: [InventoryBalanceController],
        providers: [{ provide: ListInventorySerialLookupUseCase, useValue: { Execute: listExecute } }],
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
    listExecute.mockReset();
  });

  it('declares Read:InventoryMovement permission', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, InventoryBalanceController.prototype.List)).toEqual({
      Action: ActionCode.Read,
      ObjectType: ObjectType.InventoryMovement,
    });
  });

  it('GET /inventory-balances rejects invalid query params', async () => {
    await request(app.getHttpServer()).get('/inventory-balances?Page=0').expect(400);
    await request(app.getHttpServer()).get('/inventory-balances?PageSize=101').expect(400);

    expect(listExecute).not.toHaveBeenCalled();
  });

  it('GET /inventory-balances forwards filters and preserves envelope', async () => {
    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 20, TotalItems: 0, TotalPages: 0 } });

    const response = await request(app.getHttpServer())
      .get('/inventory-balances?Page=1&PageSize=20&SkuId=sku-1&WarehouseId=wh-1&SerialNumber=SN-1&LotNumber=LOT-1')
      .expect(200);

    expect(listExecute).toHaveBeenCalledWith({
      Page: 1,
      PageSize: 20,
      SkuId: 'sku-1',
      WarehouseId: 'wh-1',
      SerialNumber: 'SN-1',
      LotNumber: 'LOT-1',
    });
    expect(response.body.Success).toBe(true);
    expect(response.body.Data).toEqual({ Items: [], Meta: { Page: 1, PageSize: 20, TotalItems: 0, TotalPages: 0 } });
  });
});
