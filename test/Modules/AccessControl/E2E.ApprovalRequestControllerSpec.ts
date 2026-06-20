import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ApprovalDecision } from '@modules/AccessControl/Domain/Enums/ApprovalDecision';
import { CreateApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/CreateApprovalRequestUseCase';
import { GetApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/GetApprovalRequestUseCase';
import { ListApprovalRequestsUseCase } from '@modules/AccessControl/Application/UseCases/ListApprovalRequestsUseCase';
import { ApproveApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/ApproveApprovalRequestUseCase';
import { RejectApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/RejectApprovalRequestUseCase';
import { ApprovalRequestController } from '@modules/AccessControl/Presentation/Controllers/ApprovalRequestController';
import {
  REQUIRE_PERMISSION_KEY,
  RequirePermissionMetadata,
} from '@modules/AccessControl/Presentation/Decorators/RequirePermission';

describe('E2E ApprovalRequestController (no DB)', () => {
  let app: INestApplication;
  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const listExecute = jest.fn();
  const approveExecute = jest.fn();
  const rejectExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(
      Test.createTestingModule({
        controllers: [ApprovalRequestController],
        providers: [
          { provide: CreateApprovalRequestUseCase, useValue: { Execute: createExecute } },
          { provide: GetApprovalRequestUseCase, useValue: { Execute: getExecute } },
          { provide: ListApprovalRequestsUseCase, useValue: { Execute: listExecute } },
          { provide: ApproveApprovalRequestUseCase, useValue: { Execute: approveExecute } },
          { provide: RejectApprovalRequestUseCase, useValue: { Execute: rejectExecute } },
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
    listExecute.mockReset();
    approveExecute.mockReset();
    rejectExecute.mockReset();
  });

  it('rejects an invalid create body (missing Action / TargetObjectId) with 400', async () => {
    await request(app.getHttpServer())
      .post('/approval-requests')
      .send({ TargetObjectType: ObjectType.InventoryStatus })
      .expect(400);
    expect(createExecute).not.toHaveBeenCalled();
  });

  it('routes create, get, list, approve and reject through use cases and threads the audit context', async () => {
    createExecute.mockResolvedValue({ Id: 'ar-1', Decision: ApprovalDecision.Pending });
    getExecute.mockResolvedValue({ Id: 'ar-1' });
    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 20, TotalItems: 0, TotalPages: 1 } });
    approveExecute.mockResolvedValue({ Id: 'ar-1', Decision: ApprovalDecision.Approved });
    rejectExecute.mockResolvedValue({ Id: 'ar-1', Decision: ApprovalDecision.Rejected });

    const createBody = {
      Action: ActionCode.Adjust,
      TargetObjectType: ObjectType.InventoryStatus,
      TargetObjectId: 'inv-1',
      TargetObjectCode: 'INV-1',
    };

    await request(app.getHttpServer()).post('/approval-requests').send(createBody).expect(201);
    await request(app.getHttpServer()).get('/approval-requests/ar-1').expect(200);
    await request(app.getHttpServer()).get('/approval-requests?Decision=PENDING').expect(200);
    await request(app.getHttpServer())
      .post('/approval-requests/ar-1/approve')
      .send({ ReasonCode: 'RC-APPROVE' })
      .expect(201);
    await request(app.getHttpServer()).post('/approval-requests/ar-1/reject').send({ ReasonNote: 'no' }).expect(201);

    // @CurrentAuditContext() is threaded as the last argument with the injected test user.
    expect(createExecute).toHaveBeenCalledWith(createBody, expect.objectContaining({ ActorUserId: 'test-admin' }));
    expect(getExecute).toHaveBeenCalledWith('ar-1');
    expect(approveExecute).toHaveBeenCalledWith(
      { Id: 'ar-1', ReasonCode: 'RC-APPROVE' },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(rejectExecute).toHaveBeenCalledWith(
      { Id: 'ar-1', ReasonNote: 'no' },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
  });
});

describe('ApprovalRequestController C2 permission binding (no DB)', () => {
  const meta = (method: keyof ApprovalRequestController): RequirePermissionMetadata =>
    Reflect.getMetadata(
      REQUIRE_PERMISSION_KEY,
      ApprovalRequestController.prototype[method],
    ) as RequirePermissionMetadata;

  // AC4: approve/reject MUST require (Approve, ApprovalRequest) — guards against a regression that
  // downgrades the decision routes to Read (which would let any reader decide approvals).
  it('binds Approve/ApprovalRequest on approve and reject', () => {
    expect(meta('Approve')).toMatchObject({ Action: ActionCode.Approve, ObjectType: ObjectType.ApprovalRequest });
    expect(meta('Reject')).toMatchObject({ Action: ActionCode.Approve, ObjectType: ObjectType.ApprovalRequest });
  });

  it('binds Create/Read on the write + read routes', () => {
    expect(meta('Create')).toMatchObject({ Action: ActionCode.Create, ObjectType: ObjectType.ApprovalRequest });
    expect(meta('GetById')).toMatchObject({ Action: ActionCode.Read, ObjectType: ObjectType.ApprovalRequest });
    expect(meta('List')).toMatchObject({ Action: ActionCode.Read, ObjectType: ObjectType.ApprovalRequest });
  });
});
