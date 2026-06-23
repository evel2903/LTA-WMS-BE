import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CaptureInboundDiscrepancyUseCase } from '@modules/Inbound/Application/UseCases/CaptureInboundDiscrepancyUseCase';
import { ConfirmInboundLpnUseCase } from '@modules/Inbound/Application/UseCases/ConfirmInboundLpnUseCase';
import { ConfirmReceiptLineUseCase } from '@modules/Inbound/Application/UseCases/ConfirmReceiptLineUseCase';
import { CreateInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/CreateInboundPlanUseCase';
import { EvaluateQcTaskUseCase } from '@modules/Inbound/Application/UseCases/EvaluateQcTaskUseCase';
import { GetInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/GetInboundPlanUseCase';
import { ListInboundPlansUseCase } from '@modules/Inbound/Application/UseCases/ListInboundPlansUseCase';
import { RecordGateInUseCase } from '@modules/Inbound/Application/UseCases/RecordGateInUseCase';
import { RecordQcResultUseCase } from '@modules/Inbound/Application/UseCases/RecordQcResultUseCase';
import { StartReceivingSessionUseCase } from '@modules/Inbound/Application/UseCases/StartReceivingSessionUseCase';
import { ValidateReceivingReadinessUseCase } from '@modules/Inbound/Application/UseCases/ValidateReceivingReadinessUseCase';
import { ReleaseInboundToPutawayUseCase } from '@modules/Inbound/Application/UseCases/ReleaseInboundToPutawayUseCase';
import { InboundPlanController } from '@modules/Inbound/Presentation/Controllers/InboundPlanController';
import { QcTaskController } from '@modules/Inbound/Presentation/Controllers/QcTaskController';
import { ReceiptController } from '@modules/Inbound/Presentation/Controllers/ReceiptController';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';

describe('E2E InboundPlanController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const listExecute = jest.fn();
  const gateInExecute = jest.fn();
  const readinessExecute = jest.fn();
  const startReceivingExecute = jest.fn();
  const confirmReceiptLineExecute = jest.fn();
  const confirmInboundLpnExecute = jest.fn();
  const releaseInboundToPutawayExecute = jest.fn();
  const captureDiscrepancyExecute = jest.fn();
  const evaluateQcTaskExecute = jest.fn();
  const recordQcResultExecute = jest.fn();

  const buildModule = () =>
    Test.createTestingModule({
      controllers: [InboundPlanController, ReceiptController, QcTaskController],
      providers: [
        Reflector,
        { provide: CreateInboundPlanUseCase, useValue: { Execute: createExecute } },
        { provide: GetInboundPlanUseCase, useValue: { Execute: getExecute } },
        { provide: ListInboundPlansUseCase, useValue: { Execute: listExecute } },
        { provide: RecordGateInUseCase, useValue: { Execute: gateInExecute } },
        { provide: ValidateReceivingReadinessUseCase, useValue: { Execute: readinessExecute } },
        { provide: StartReceivingSessionUseCase, useValue: { Execute: startReceivingExecute } },
        { provide: ConfirmReceiptLineUseCase, useValue: { Execute: confirmReceiptLineExecute } },
        { provide: ConfirmInboundLpnUseCase, useValue: { Execute: confirmInboundLpnExecute } },
        { provide: ReleaseInboundToPutawayUseCase, useValue: { Execute: releaseInboundToPutawayExecute } },
        { provide: CaptureInboundDiscrepancyUseCase, useValue: { Execute: captureDiscrepancyExecute } },
        { provide: EvaluateQcTaskUseCase, useValue: { Execute: evaluateQcTaskExecute } },
        { provide: RecordQcResultUseCase, useValue: { Execute: recordQcResultExecute } },
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
    startReceivingExecute.mockReset();
    confirmReceiptLineExecute.mockReset();
    confirmInboundLpnExecute.mockReset();
    releaseInboundToPutawayExecute.mockReset();
    captureDiscrepancyExecute.mockReset();
    evaluateQcTaskExecute.mockReset();
    recordQcResultExecute.mockReset();
  });

  it('declares InboundPlan and Receipt permissions on inbound and receiving endpoints', () => {
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
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSION_KEY, InboundPlanController.prototype.StartReceivingSession),
    ).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.Receipt,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, ReceiptController.prototype.ConfirmReceiptLine)).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.Receipt,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, ReceiptController.prototype.ConfirmInboundLpn)).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.Receipt,
    });
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSION_KEY, ReceiptController.prototype.ReleaseInboundToPutaway),
    ).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.Receipt,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, ReceiptController.prototype.CaptureDiscrepancy)).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.Receipt,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, ReceiptController.prototype.EvaluateQcTask)).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.QcTask,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, QcTaskController.prototype.RecordResult)).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.QcTask,
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

  it('POST /receipts/:id/discrepancies rejects non-string evidence refs before use case', async () => {
    await request(app.getHttpServer())
      .post('/receipts/receipt-1/discrepancies')
      .send({
        ReceiptLineId: 'receipt-line-1',
        DiscrepancyType: 'QuantityVariance',
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: [123],
        IdempotencyKey: 'disc-invalid-evidence',
      })
      .expect(400);

    expect(captureDiscrepancyExecute).not.toHaveBeenCalled();
  });

  it('POST /receipts/:id/discrepancies rejects over-length reason and idempotency fields', async () => {
    await request(app.getHttpServer())
      .post('/receipts/receipt-1/discrepancies')
      .send({
        ReceiptLineId: 'receipt-line-1',
        DiscrepancyType: 'QuantityVariance',
        ReasonCode: 'R'.repeat(81),
        EvidenceRefs: ['photo://dock/over-qty-1'],
        IdempotencyKey: 'I'.repeat(161),
      })
      .expect(400);

    expect(captureDiscrepancyExecute).not.toHaveBeenCalled();
  });

  it('POST /receipts/:id/qc-tasks and /qc-tasks/:id/results validate request fields', async () => {
    await request(app.getHttpServer())
      .post('/receipts/receipt-1/qc-tasks')
      .send({ ReceiptLineId: 'receipt-line-1', IdempotencyKey: 'I'.repeat(161) })
      .expect(400);
    await request(app.getHttpServer())
      .post('/qc-tasks/qc-task-1/results')
      .send({
        IdempotencyKey: 'qc-result-1',
        ResultStatus: 'QC_PASSED',
        DispositionCode: 'Release',
        InspectedQuantity: 12,
        AcceptedQuantity: 12,
        RejectedQuantity: 0,
      })
      .expect(400);

    expect(evaluateQcTaskExecute).not.toHaveBeenCalled();
    expect(recordQcResultExecute).not.toHaveBeenCalled();
  });

  it('POST /receipts/:id/lines/:lineId/lpn validates LPN and idempotency fields', async () => {
    await request(app.getHttpServer())
      .post('/receipts/receipt-1/lines/receipt-line-1/lpn')
      .send({
        LpnCode: 'L'.repeat(81),
        IdempotencyKey: 'I'.repeat(161),
      })
      .expect(400);

    expect(confirmInboundLpnExecute).not.toHaveBeenCalled();
  });

  it('GET detail, gate-in, readiness and receiving endpoints call use cases', async () => {
    getExecute.mockResolvedValue({ Id: 'inbound-plan-1' });
    gateInExecute.mockResolvedValue({ Id: 'inbound-plan-1', GateInStatus: 'Recorded' });
    readinessExecute.mockResolvedValue({ Allowed: true, Blocked: false });
    startReceivingExecute.mockResolvedValue({ Id: 'session-1', ReceiptId: 'receipt-1' });
    confirmReceiptLineExecute.mockResolvedValue({ Id: 'receipt-line-1', ReceiptId: 'receipt-1' });
    captureDiscrepancyExecute.mockResolvedValue({
      Id: 'discrepancy-1',
      ReceiptId: 'receipt-1',
      ExceptionCaseId: 'exception-1',
    });
    confirmInboundLpnExecute.mockResolvedValue({
      Id: 'lpn-1',
      ReceiptId: 'receipt-1',
      ReceiptLineId: 'receipt-line-1',
      LpnCode: 'LPN-0001',
    });
    releaseInboundToPutawayExecute.mockResolvedValue({
      Id: 'release-1',
      ReceiptId: 'receipt-1',
      ReceiptLineId: 'receipt-line-1',
      InventoryStatusCode: 'READY_FOR_PUTAWAY',
    });
    evaluateQcTaskExecute.mockResolvedValue({
      Id: 'qc-task-1',
      ReceiptId: 'receipt-1',
      ReceiptLineId: 'receipt-line-1',
      TaskStatus: 'PendingQc',
    });
    recordQcResultExecute.mockResolvedValue({
      Id: 'qc-result-1',
      QcTaskId: 'qc-task-1',
      ResultStatus: 'Passed',
    });

    await request(app.getHttpServer()).get('/inbound-plans/inbound-plan-1').expect(200);
    await request(app.getHttpServer())
      .post('/inbound-plans/inbound-plan-1/gate-in')
      .send({ GateInAt: '2026-06-22T09:00:00.000Z', GateReference: 'GATE-A-001' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/inbound-plans/inbound-plan-1/receiving-readiness')
      .send({ AttemptOverride: false })
      .expect(201);
    await request(app.getHttpServer())
      .post('/inbound-plans/inbound-plan-1/receiving-sessions')
      .send({ SessionKey: 'dock-1:user-1', DeviceCode: 'rf-01' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/receipts/receipt-1/lines')
      .send({
        InboundPlanLineId: 'plan-line-1',
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-1',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/receipts/receipt-1/discrepancies')
      .send({
        ReceiptLineId: 'receipt-line-1',
        DiscrepancyType: 'QuantityVariance',
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['photo://dock/over-qty-1'],
        EvidenceJson: { ExpectedQuantity: 10, ActualQuantity: 12 },
        IdempotencyKey: 'disc-1',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/receipts/receipt-1/qc-tasks')
      .send({
        ReceiptLineId: 'receipt-line-1',
        IdempotencyKey: 'qc-task-1',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/receipts/receipt-1/lines/receipt-line-1/lpn')
      .send({
        LpnCode: 'LPN-0001',
        SsccCode: '003456789012345678',
        IdempotencyKey: 'lpn-1',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/receipts/receipt-1/lines/receipt-line-1/release-to-putaway')
      .send({
        CurrentLocationCode: 'RCV-01',
        IdempotencyKey: 'release-1',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/qc-tasks/qc-task-1/results')
      .send({
        IdempotencyKey: 'qc-result-1',
        ResultStatus: 'Passed',
        DispositionCode: 'Release',
        InspectedQuantity: 12,
        AcceptedQuantity: 12,
        RejectedQuantity: 0,
      })
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
    expect(startReceivingExecute).toHaveBeenCalledWith(
      expect.objectContaining({ InboundPlanId: 'inbound-plan-1', SessionKey: 'dock-1:user-1' }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(confirmReceiptLineExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        ReceiptId: 'receipt-1',
        InboundPlanLineId: 'plan-line-1',
        ActualQuantity: 12,
      }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(captureDiscrepancyExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        ReceiptId: 'receipt-1',
        ReceiptLineId: 'receipt-line-1',
        DiscrepancyType: 'QuantityVariance',
      }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(evaluateQcTaskExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        ReceiptId: 'receipt-1',
        ReceiptLineId: 'receipt-line-1',
        IdempotencyKey: 'qc-task-1',
      }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(confirmInboundLpnExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        ReceiptId: 'receipt-1',
        ReceiptLineId: 'receipt-line-1',
        LpnCode: 'LPN-0001',
      }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(releaseInboundToPutawayExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        ReceiptId: 'receipt-1',
        ReceiptLineId: 'receipt-line-1',
        CurrentLocationCode: 'RCV-01',
      }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(recordQcResultExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        QcTaskId: 'qc-task-1',
        ResultStatus: 'Passed',
        DispositionCode: 'Release',
      }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
  });
});
