import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import { CoreFlowController } from '@modules/CoreFlow/Presentation/Controllers/CoreFlowController';
import { CreateCoreFlowInstanceUseCase } from '@modules/CoreFlow/Application/UseCases/CreateCoreFlowInstanceUseCase';
import { CreateWorkflowHandoffUseCase } from '@modules/CoreFlow/Application/UseCases/CreateWorkflowHandoffUseCase';
import { GetCoreFlowInstanceUseCase } from '@modules/CoreFlow/Application/UseCases/GetCoreFlowInstanceUseCase';
import { RecordWorkflowMilestoneUseCase } from '@modules/CoreFlow/Application/UseCases/RecordWorkflowMilestoneUseCase';
import { ResolveCoreFlowInstanceUseCase } from '@modules/CoreFlow/Application/UseCases/ResolveCoreFlowInstanceUseCase';
import { SkipCoreFlowStepUseCase } from '@modules/CoreFlow/Application/UseCases/SkipCoreFlowStepUseCase';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';

describe('E2E CoreFlowController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const resolveExecute = jest.fn();
  const milestoneExecute = jest.fn();
  const skipExecute = jest.fn();
  const handoffExecute = jest.fn();

  const buildModule = () =>
    Test.createTestingModule({
      controllers: [CoreFlowController],
      providers: [
        Reflector,
        { provide: CreateCoreFlowInstanceUseCase, useValue: { Execute: createExecute } },
        { provide: GetCoreFlowInstanceUseCase, useValue: { Execute: getExecute } },
        { provide: ResolveCoreFlowInstanceUseCase, useValue: { Execute: resolveExecute } },
        { provide: RecordWorkflowMilestoneUseCase, useValue: { Execute: milestoneExecute } },
        { provide: SkipCoreFlowStepUseCase, useValue: { Execute: skipExecute } },
        { provide: CreateWorkflowHandoffUseCase, useValue: { Execute: handoffExecute } },
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
    resolveExecute.mockReset();
    milestoneExecute.mockReset();
    skipExecute.mockReset();
    handoffExecute.mockReset();
  });

  it('declares CoreFlow permissions on read and mutation endpoints', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, CoreFlowController.prototype.Create)).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.CoreFlow,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, CoreFlowController.prototype.GetById)).toMatchObject({
      Action: ActionCode.Read,
      ObjectType: ObjectType.CoreFlow,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, CoreFlowController.prototype.RecordMilestone)).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.CoreFlow,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, CoreFlowController.prototype.ForceHandoff)).toMatchObject({
      Action: ActionCode.Override,
      ObjectType: ObjectType.CoreFlow,
    });
  });

  it('POST /core-flows creates an instance and preserves envelope', async () => {
    createExecute.mockResolvedValue({ Id: 'core-1', BusinessReference: 'IB-2026-0001' });

    const response = await request(app.getHttpServer())
      .post('/core-flows')
      .send({
        BusinessReference: 'IB-2026-0001',
        SourceSystem: 'ERP',
        WarehouseCode: 'WT-01-A',
        OwnerCode: 'OWNER-A',
        CorrelationId: 'corr-core-1',
      })
      .expect(201);

    expect(createExecute).toHaveBeenCalledWith(
      {
        BusinessReference: 'IB-2026-0001',
        SourceSystem: 'ERP',
        WarehouseCode: 'WT-01-A',
        OwnerCode: 'OWNER-A',
        CorrelationId: 'corr-core-1',
      },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(response.body.Success).toBe(true);
    expect(response.body.Data.BusinessReference).toBe('IB-2026-0001');
  });

  it('validates milestone status taxonomy and rejects forbidden InventoryStatus milestone terms', async () => {
    await request(app.getHttpServer())
      .post('/core-flows/core-1/milestones')
      .send({
        StageCode: CoreFlowStageCode.Shipping,
        StepCode: CoreFlowStepCode.GateOutRecorded,
        MilestoneStatus: WorkflowMilestoneStatus.Completed,
        InventoryStatusCode: 'GATE_OUT',
      })
      .expect(400);

    expect(milestoneExecute).not.toHaveBeenCalled();
  });

  it('calls resolve, skip step and handoff use cases with path id merged', async () => {
    resolveExecute.mockResolvedValue({ Id: 'core-1' });
    skipExecute.mockResolvedValue({ Id: 'milestone-1' });
    handoffExecute.mockResolvedValue({ Id: 'handoff-1' });

    await request(app.getHttpServer())
      .get('/core-flows/resolve?BusinessReference=IB-2026-0001&WarehouseCode=WT-01-A')
      .expect(200);
    await request(app.getHttpServer())
      .post('/core-flows/core-1/steps/QcCompleted/skip')
      .send({
        StageCode: CoreFlowStageCode.Inbound,
        ReasonCode: 'RC-V1-HANDOFF',
        ReasonNote: 'Profile skip',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/core-flows/core-1/handoffs')
      .send({
        FromStage: CoreFlowStageCode.Inbound,
        ToStage: CoreFlowStageCode.Storage,
        ReasonCode: 'RC-V1-HANDOFF',
      })
      .expect(201);

    expect(resolveExecute).toHaveBeenCalledWith({
      BusinessReference: 'IB-2026-0001',
      WarehouseCode: 'WT-01-A',
    });
    expect(skipExecute).toHaveBeenCalledWith(
      {
        CoreFlowInstanceId: 'core-1',
        StepCode: CoreFlowStepCode.QcCompleted,
        StageCode: CoreFlowStageCode.Inbound,
        ReasonCode: 'RC-V1-HANDOFF',
        ReasonNote: 'Profile skip',
      },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(handoffExecute).toHaveBeenCalledWith(
      {
        CoreFlowInstanceId: 'core-1',
        FromStage: CoreFlowStageCode.Inbound,
        ToStage: CoreFlowStageCode.Storage,
        ReasonCode: 'RC-V1-HANDOFF',
        Force: false,
      },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
  });
});
