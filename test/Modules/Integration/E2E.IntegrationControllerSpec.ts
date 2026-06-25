import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { IntegrationController } from '@modules/Integration/Presentation/Controllers/IntegrationController';
import { ImportIntegrationBatchUseCase } from '@modules/Integration/Application/UseCases/ImportIntegrationBatchUseCase';
import { ListImportBatchesUseCase } from '@modules/Integration/Application/UseCases/ListImportBatchesUseCase';
import { ListOutboxMessagesUseCase } from '@modules/Integration/Application/UseCases/ListOutboxMessagesUseCase';
import { RecordOutboxEventUseCase } from '@modules/Integration/Application/UseCases/RecordOutboxEventUseCase';
import { GetOutboxMessageUseCase } from '@modules/Integration/Application/UseCases/GetOutboxMessageUseCase';
import { RecordOutboxFailureUseCase } from '@modules/Integration/Application/UseCases/RecordOutboxFailureUseCase';
import { ResolveDeadLetterUseCase } from '@modules/Integration/Application/UseCases/ResolveDeadLetterUseCase';
import {
  CreateReconciliationRunUseCase,
  GetReconciliationRunUseCase,
  ListReconciliationItemsUseCase,
  ListReconciliationRunsUseCase,
  ResolveReconciliationItemUseCase,
} from '@modules/Integration/Application/UseCases/ReconciliationUseCases';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';

describe('E2E IntegrationController (no DB)', () => {
  let app: INestApplication;

  const importExecute = jest.fn();
  const listImportsExecute = jest.fn();
  const listEventsExecute = jest.fn();
  const recordEventExecute = jest.fn();
  const getEventExecute = jest.fn();
  const recordFailureExecute = jest.fn();
  const resolveDeadLetterExecute = jest.fn();
  const createReconciliationRunExecute = jest.fn();
  const listReconciliationRunsExecute = jest.fn();
  const getReconciliationRunExecute = jest.fn();
  const listReconciliationItemsExecute = jest.fn();
  const resolveReconciliationItemExecute = jest.fn();

  const buildModule = () =>
    Test.createTestingModule({
      controllers: [IntegrationController],
      providers: [
        Reflector,
        { provide: ImportIntegrationBatchUseCase, useValue: { Execute: importExecute } },
        { provide: ListImportBatchesUseCase, useValue: { Execute: listImportsExecute } },
        { provide: ListOutboxMessagesUseCase, useValue: { Execute: listEventsExecute } },
        { provide: RecordOutboxEventUseCase, useValue: { Execute: recordEventExecute } },
        { provide: GetOutboxMessageUseCase, useValue: { Execute: getEventExecute } },
        { provide: RecordOutboxFailureUseCase, useValue: { Execute: recordFailureExecute } },
        { provide: ResolveDeadLetterUseCase, useValue: { Execute: resolveDeadLetterExecute } },
        { provide: CreateReconciliationRunUseCase, useValue: { Execute: createReconciliationRunExecute } },
        { provide: ListReconciliationRunsUseCase, useValue: { Execute: listReconciliationRunsExecute } },
        { provide: GetReconciliationRunUseCase, useValue: { Execute: getReconciliationRunExecute } },
        { provide: ListReconciliationItemsUseCase, useValue: { Execute: listReconciliationItemsExecute } },
        { provide: ResolveReconciliationItemUseCase, useValue: { Execute: resolveReconciliationItemExecute } },
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
    importExecute.mockReset();
    listImportsExecute.mockReset();
    listEventsExecute.mockReset();
    recordEventExecute.mockReset();
    getEventExecute.mockReset();
    recordFailureExecute.mockReset();
    resolveDeadLetterExecute.mockReset();
    createReconciliationRunExecute.mockReset();
    listReconciliationRunsExecute.mockReset();
    getReconciliationRunExecute.mockReset();
    listReconciliationItemsExecute.mockReset();
    resolveReconciliationItemExecute.mockReset();
  });

  it('declares IntegrationMessage permissions on read and mutation endpoints', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, IntegrationController.prototype.Import)).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.IntegrationMessage,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, IntegrationController.prototype.RecordEvent)).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.IntegrationMessage,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, IntegrationController.prototype.ListImports)).toMatchObject({
      Action: ActionCode.Read,
      ObjectType: ObjectType.IntegrationMessage,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, IntegrationController.prototype.ListEvents)).toMatchObject({
      Action: ActionCode.Read,
      ObjectType: ObjectType.IntegrationMessage,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, IntegrationController.prototype.GetEvent)).toMatchObject({
      Action: ActionCode.Read,
      ObjectType: ObjectType.IntegrationMessage,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, IntegrationController.prototype.RecordFailure)).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.IntegrationMessage,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, IntegrationController.prototype.ListDeadLetters)).toMatchObject({
      Action: ActionCode.Read,
      ObjectType: ObjectType.DeadLetterMessage,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, IntegrationController.prototype.RetryDeadLetter)).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.DeadLetterMessage,
    });
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSION_KEY, IntegrationController.prototype.CreateReconciliationRun),
    ).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.ReconciliationRun,
    });
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSION_KEY, IntegrationController.prototype.ListReconciliationRuns),
    ).toMatchObject({
      Action: ActionCode.Read,
      ObjectType: ObjectType.ReconciliationRun,
    });
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSION_KEY, IntegrationController.prototype.ResolveReconciliationItem),
    ).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.ReconciliationRun,
    });
  });

  it('rejects import messages missing messageId before use case execution', async () => {
    await request(app.getHttpServer())
      .post('/integration/imports')
      .send({
        BatchReference: 'BATCH-1',
        Messages: [
          {
            MessageType: 'InboundPlanReceived',
            Version: '1.0',
            BusinessReference: 'IB-2026-0001',
            SourceSystem: 'ERP',
            TargetSystem: 'LTA-WMS',
            WarehouseContext: 'WT-01-A',
            EventTime: '2026-06-22T08:00:00.000Z',
            Payload: { inboundPlanNo: 'IB-2026-0001' },
          },
        ],
      })
      .expect(400);

    expect(importExecute).not.toHaveBeenCalled();
  });

  it('POST /integration/imports passes valid envelope batch and audit context', async () => {
    importExecute.mockResolvedValue({ ImportBatch: { Id: 'batch-1' }, Messages: [], OutboxMessages: [] });

    const response = await request(app.getHttpServer())
      .post('/integration/imports')
      .send({
        BatchReference: 'BATCH-1',
        Messages: [
          {
            MessageId: 'msg-1',
            MessageType: 'InboundPlanReceived',
            Version: '1.0',
            BusinessReference: 'IB-2026-0001',
            SourceSystem: 'ERP',
            TargetSystem: 'LTA-WMS',
            WarehouseContext: 'WT-01-A',
            OwnerContext: 'OWNER-A',
            EventTime: '2026-06-22T08:00:00.000Z',
            CorrelationId: 'corr-import-1',
            CausationId: 'cause-import-1',
            Payload: { inboundPlanNo: 'IB-2026-0001' },
          },
        ],
      })
      .expect(201);

    expect(importExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        BatchReference: 'BATCH-1',
        Messages: [
          expect.objectContaining({
            MessageId: 'msg-1',
            WarehouseContext: 'WT-01-A',
            OwnerContext: 'OWNER-A',
          }),
        ],
      }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(response.body.Success).toBe(true);
  });

  it('GET /integration/imports and /integration/events call read use cases with query', async () => {
    listImportsExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 100, TotalItems: 0, TotalPages: 1 } });
    listEventsExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 100, TotalItems: 0, TotalPages: 1 } });

    await request(app.getHttpServer()).get('/integration/imports?Page=1&PageSize=500').expect(200);
    await request(app.getHttpServer()).get('/integration/events?Page=1&PageSize=500').expect(200);

    expect(listImportsExecute).toHaveBeenCalledWith(expect.objectContaining({ Page: 1, PageSize: 500 }));
    expect(listEventsExecute).toHaveBeenCalledWith(expect.objectContaining({ Page: 1, PageSize: 500 }));
  });

  it('POST /integration/events/:id/failures validates failure category and passes audit context', async () => {
    recordFailureExecute.mockResolvedValue({ Id: 'outbox-1', Status: 'DeadLetter' });

    await request(app.getHttpServer())
      .post('/integration/events/outbox-1/failures')
      .send({ FailureCategory: 'Validation', ErrorMessage: 'Missing owner master' })
      .expect(201);

    expect(recordFailureExecute).toHaveBeenCalledWith(
      'outbox-1',
      expect.objectContaining({ FailureCategory: 'Validation', ErrorMessage: 'Missing owner master' }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );

    await request(app.getHttpServer())
      .post('/integration/events/outbox-1/failures')
      .send({ FailureCategory: 'BadStatus', ErrorMessage: 'x' })
      .expect(400);

    recordFailureExecute.mockClear();
    await request(app.getHttpServer())
      .post('/integration/events/outbox-1/failures')
      .send({ FailureCategory: 'Transient', ErrorMessage: 'ERP timeout', MaxAttempts: 20 })
      .expect(400);
    expect(recordFailureExecute).not.toHaveBeenCalled();
  });

  it('dead-letter endpoints use list/detail action use cases with reason payload', async () => {
    listEventsExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 50, TotalItems: 0, TotalPages: 0 } });
    getEventExecute.mockResolvedValue({ Id: 'outbox-1' });
    resolveDeadLetterExecute.mockResolvedValue({ Id: 'outbox-1', Status: 'Pending' });

    await request(app.getHttpServer()).get('/integration/dead-letters?PageSize=500').expect(200);
    await request(app.getHttpServer()).get('/integration/dead-letters/outbox-1').expect(200);
    await request(app.getHttpServer())
      .post('/integration/dead-letters/outbox-1/retry')
      .send({
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:INT-1'],
        IdempotencyKey: 'retry-1',
      })
      .expect(201);

    expect(listEventsExecute).toHaveBeenCalledWith(expect.objectContaining({ PageSize: 500, Status: 'DeadLetter' }));
    expect(getEventExecute).toHaveBeenCalledWith('outbox-1', expect.any(Set));
    expect(resolveDeadLetterExecute).toHaveBeenCalledWith(
      'outbox-1',
      'Retry',
      expect.objectContaining({ ReasonCode: 'RC-V1-DEAD-LETTER-FIX', EvidenceRefs: ['ticket:INT-1'] }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
  });

  it('reconciliation endpoints pass scoped filters and reason payload with ReconciliationRun permissions', async () => {
    createReconciliationRunExecute.mockResolvedValue({ Run: { Id: 'run-1' }, Items: [] });
    listReconciliationRunsExecute.mockResolvedValue({
      Items: [],
      Meta: { Page: 1, PageSize: 100, TotalItems: 0, TotalPages: 1 },
    });
    getReconciliationRunExecute.mockResolvedValue({ Id: 'run-1' });
    listReconciliationItemsExecute.mockResolvedValue({
      Items: [],
      Meta: { Page: 1, PageSize: 50, TotalItems: 0, TotalPages: 1 },
    });
    resolveReconciliationItemExecute.mockResolvedValue({ Id: 'item-1', ItemStatus: 'Resolved' });

    await request(app.getHttpServer())
      .post('/integration/reconciliation/runs')
      .send({
        BusinessReference: 'IB-2026-0001',
        WarehouseId: 'WT-05-A',
        OwnerId: 'OWNER-A',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-1'],
        IdempotencyKey: 'recon-1',
      })
      .expect(201);
    await request(app.getHttpServer())
      .get(
        '/integration/reconciliation/runs?BusinessReference=IB-2026-0001&WarehouseId=WT-05-A&OwnerId=OWNER-A&PageSize=500',
      )
      .expect(200);
    await request(app.getHttpServer()).get('/integration/reconciliation/runs/run-1').expect(200);
    await request(app.getHttpServer()).get('/integration/reconciliation/runs/run-1/items?PageSize=500').expect(200);
    await request(app.getHttpServer())
      .post('/integration/reconciliation/items/item-1/resolve')
      .send({
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-1'],
        IdempotencyKey: 'resolve-1',
        ResolutionNote: 'External correction confirmed',
      })
      .expect(201);

    expect(createReconciliationRunExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        BusinessReference: 'IB-2026-0001',
        WarehouseId: 'WT-05-A',
        OwnerId: 'OWNER-A',
      }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(listReconciliationRunsExecute).toHaveBeenCalledWith(
      expect.objectContaining({ BusinessReference: 'IB-2026-0001', WarehouseId: 'WT-05-A', PageSize: 500 }),
    );
    expect(getReconciliationRunExecute).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(listReconciliationItemsExecute).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ PageSize: 500 }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(resolveReconciliationItemExecute).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({ IdempotencyKey: 'resolve-1' }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );

    createReconciliationRunExecute.mockClear();
    await request(app.getHttpServer())
      .post('/integration/reconciliation/runs')
      .send({
        BusinessReference: 'IB-2026-0001',
        WarehouseId: 'WT-05-A',
        OwnerId: 'OWNER-A',
        ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
        EvidenceRefs: ['ticket:RECON-1'],
        IdempotencyKey: 'recon-1',
        UnknownField: true,
      })
      .expect(400);
    expect(createReconciliationRunExecute).not.toHaveBeenCalled();
  });
});
