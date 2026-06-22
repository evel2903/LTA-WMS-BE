import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CreateInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/CreateInboundPlanUseCase';
import { GetInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/GetInboundPlanUseCase';
import { ListInboundPlansUseCase } from '@modules/Inbound/Application/UseCases/ListInboundPlansUseCase';
import { RecordGateInUseCase } from '@modules/Inbound/Application/UseCases/RecordGateInUseCase';
import { ValidateReceivingReadinessUseCase } from '@modules/Inbound/Application/UseCases/ValidateReceivingReadinessUseCase';
import { InboundPlanController } from '@modules/Inbound/Presentation/Controllers/InboundPlanController';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';

describe('E2E InboundPlanController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const listExecute = jest.fn();
  const gateInExecute = jest.fn();
  const readinessExecute = jest.fn();

  const buildModule = () =>
    Test.createTestingModule({
      controllers: [InboundPlanController],
      providers: [
        Reflector,
        { provide: CreateInboundPlanUseCase, useValue: { Execute: createExecute } },
        { provide: GetInboundPlanUseCase, useValue: { Execute: getExecute } },
        { provide: ListInboundPlansUseCase, useValue: { Execute: listExecute } },
        { provide: RecordGateInUseCase, useValue: { Execute: gateInExecute } },
        { provide: ValidateReceivingReadinessUseCase, useValue: { Execute: readinessExecute } },
      ],
    });

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(buildModule()).compile();
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
    gateInExecute.mockReset();
    readinessExecute.mockReset();
  });

  it('declares InboundPlan permissions on read, create, update and readiness endpoints', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, InboundPlanController.prototype.Create)).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.InboundPlan,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, InboundPlanController.prototype.List)).toMatchObject({
      Action: ActionCode.Read,
      ObjectType: ObjectType.InboundPlan,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, InboundPlanController.prototype.GetById)).toMatchObject({
      Action: ActionCode.Read,
      ObjectType: ObjectType.InboundPlan,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, InboundPlanController.prototype.RecordGateIn)).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.InboundPlan,
    });
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSION_KEY, InboundPlanController.prototype.ValidateReadiness),
    ).toMatchObject({
      Action: ActionCode.Read,
      ObjectType: ObjectType.InboundPlan,
    });
  });

  it('POST /inbound-plans validates source document required fields and non-whitelisted fields', async () => {
    await request(app.getHttpServer()).post('/inbound-plans').send({ SourceSystem: 'ERP', Unknown: true }).expect(400);

    expect(createExecute).not.toHaveBeenCalled();
  });

  it('POST /inbound-plans calls create use case with audit context', async () => {
    createExecute.mockResolvedValue({ Id: 'inbound-plan-1', SourceDocumentNumber: 'ASN-10001' });

    const response = await request(app.getHttpServer())
      .post('/inbound-plans')
      .send({
        SourceSystem: 'ERP',
        SourceDocumentType: 'ASN',
        SourceDocumentNumber: 'ASN-10001',
        SupplierId: 'supplier-1',
        OwnerId: 'owner-1',
        WarehouseId: 'warehouse-1',
        WarehouseProfileId: 'profile-1',
        ExpectedArrivalAt: '2026-06-22T08:00:00.000Z',
        Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 12 }],
      })
      .expect(201);

    expect(createExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        SourceDocumentNumber: 'ASN-10001',
        Lines: [expect.objectContaining({ LineNumber: 1, ExpectedQuantity: 12 })],
      }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(response.body.Success).toBe(true);
  });

  it('GET /inbound-plans forwards PageSize above 100 for use-case clamp', async () => {
    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 100, TotalItems: 0, TotalPages: 1 } });

    await request(app.getHttpServer())
      .get('/inbound-plans?Page=1&PageSize=500&SourceSystem=ERP&SourceDocumentNumber=ASN-10001')
      .expect(200);

    expect(listExecute).toHaveBeenCalledWith({
      Page: 1,
      PageSize: 500,
      SourceSystem: 'ERP',
      SourceDocumentNumber: 'ASN-10001',
      ActorUserId: 'test-admin',
    });
  });

  it('GET detail, gate-in and readiness endpoints call use cases', async () => {
    getExecute.mockResolvedValue({ Id: 'inbound-plan-1' });
    gateInExecute.mockResolvedValue({ Id: 'inbound-plan-1', GateInStatus: 'Recorded' });
    readinessExecute.mockResolvedValue({ Allowed: true, Blocked: false });

    await request(app.getHttpServer()).get('/inbound-plans/inbound-plan-1').expect(200);
    await request(app.getHttpServer())
      .post('/inbound-plans/inbound-plan-1/gate-in')
      .send({ GateInAt: '2026-06-22T09:00:00.000Z', GateReference: 'GATE-A-001' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/inbound-plans/inbound-plan-1/receiving-readiness')
      .send({ AttemptOverride: false })
      .expect(201);

    expect(getExecute).toHaveBeenCalledWith('inbound-plan-1', 'test-admin');
    expect(gateInExecute).toHaveBeenCalledWith(
      expect.objectContaining({ Id: 'inbound-plan-1', GateReference: 'GATE-A-001' }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(readinessExecute).toHaveBeenCalledWith(
      expect.objectContaining({ Id: 'inbound-plan-1', AttemptOverride: false }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
  });
});
