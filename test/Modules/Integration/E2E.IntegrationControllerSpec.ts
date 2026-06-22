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
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';

describe('E2E IntegrationController (no DB)', () => {
  let app: INestApplication;

  const importExecute = jest.fn();
  const listImportsExecute = jest.fn();
  const listEventsExecute = jest.fn();
  const recordEventExecute = jest.fn();

  const buildModule = () =>
    Test.createTestingModule({
      controllers: [IntegrationController],
      providers: [
        Reflector,
        { provide: ImportIntegrationBatchUseCase, useValue: { Execute: importExecute } },
        { provide: ListImportBatchesUseCase, useValue: { Execute: listImportsExecute } },
        { provide: ListOutboxMessagesUseCase, useValue: { Execute: listEventsExecute } },
        { provide: RecordOutboxEventUseCase, useValue: { Execute: recordEventExecute } },
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
});
