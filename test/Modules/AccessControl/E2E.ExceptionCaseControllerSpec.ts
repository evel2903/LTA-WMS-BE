import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { CreateExceptionUseCase } from '@modules/AccessControl/Application/UseCases/CreateExceptionUseCase';
import { GetExceptionUseCase } from '@modules/AccessControl/Application/UseCases/GetExceptionUseCase';
import { ListExceptionsUseCase } from '@modules/AccessControl/Application/UseCases/ListExceptionsUseCase';
import { LogExceptionUseCase } from '@modules/AccessControl/Application/UseCases/LogExceptionUseCase';
import { AssignExceptionUseCase } from '@modules/AccessControl/Application/UseCases/AssignExceptionUseCase';
import { SubmitExceptionForApprovalUseCase } from '@modules/AccessControl/Application/UseCases/SubmitExceptionForApprovalUseCase';
import { ResolveExceptionUseCase } from '@modules/AccessControl/Application/UseCases/ResolveExceptionUseCase';
import { CloseExceptionUseCase } from '@modules/AccessControl/Application/UseCases/CloseExceptionUseCase';
import { ExceptionCaseController } from '@modules/AccessControl/Presentation/Controllers/ExceptionCaseController';
import {
  REQUIRE_PERMISSION_KEY,
  RequirePermissionMetadata,
} from '@modules/AccessControl/Presentation/Decorators/RequirePermission';

describe('E2E ExceptionCaseController (no DB)', () => {
  let app: INestApplication;
  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const listExecute = jest.fn();
  const logExecute = jest.fn();
  const assignExecute = jest.fn();
  const submitExecute = jest.fn();
  const resolveExecute = jest.fn();
  const closeExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(
      Test.createTestingModule({
        controllers: [ExceptionCaseController],
        providers: [
          { provide: CreateExceptionUseCase, useValue: { Execute: createExecute } },
          { provide: GetExceptionUseCase, useValue: { Execute: getExecute } },
          { provide: ListExceptionsUseCase, useValue: { Execute: listExecute } },
          { provide: LogExceptionUseCase, useValue: { Execute: logExecute } },
          { provide: AssignExceptionUseCase, useValue: { Execute: assignExecute } },
          { provide: SubmitExceptionForApprovalUseCase, useValue: { Execute: submitExecute } },
          { provide: ResolveExceptionUseCase, useValue: { Execute: resolveExecute } },
          { provide: CloseExceptionUseCase, useValue: { Execute: closeExecute } },
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
    logExecute.mockReset();
    assignExecute.mockReset();
    submitExecute.mockReset();
    resolveExecute.mockReset();
    closeExecute.mockReset();
  });

  it('rejects an invalid create body (missing ExceptionType / reference) with 400', async () => {
    await request(app.getHttpServer()).post('/exceptions').send({ ReferenceType: 'InventoryStatus' }).expect(400);
    expect(createExecute).not.toHaveBeenCalled();
  });

  it('routes create/get/list and all transitions through use cases and threads the audit context', async () => {
    createExecute.mockResolvedValue({ Id: 'ec-1', State: ExceptionState.Detected });
    getExecute.mockResolvedValue({ Id: 'ec-1' });
    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 20, TotalItems: 0, TotalPages: 1 } });
    logExecute.mockResolvedValue({ Id: 'ec-1', State: ExceptionState.Logged });
    assignExecute.mockResolvedValue({ Id: 'ec-1', State: ExceptionState.Assigned });
    submitExecute.mockResolvedValue({ Id: 'ec-1', State: ExceptionState.InReviewPendingApproval });
    resolveExecute.mockResolvedValue({ Id: 'ec-1', State: ExceptionState.Resolved });
    closeExecute.mockResolvedValue({ Id: 'ec-1', State: ExceptionState.Closed });

    const createBody = { ExceptionType: 'CTRL-EX-01', ReferenceType: 'InventoryStatus', ReferenceId: 'inv-1' };

    await request(app.getHttpServer()).post('/exceptions').send(createBody).expect(201);
    await request(app.getHttpServer()).get('/exceptions/ec-1').expect(200);
    await request(app.getHttpServer()).get('/exceptions?State=DETECTED').expect(200);
    await request(app.getHttpServer()).post('/exceptions/ec-1/log').send({}).expect(201);
    await request(app.getHttpServer()).post('/exceptions/ec-1/assign').send({ AssignedToUserId: 'u-1' }).expect(201);
    await request(app.getHttpServer()).post('/exceptions/ec-1/submit').send({ RequireApproval: true }).expect(201);
    await request(app.getHttpServer())
      .post('/exceptions/ec-1/resolve')
      .send({ ReasonCode: 'RC-EXC-RESOLVE' })
      .expect(201);
    await request(app.getHttpServer()).post('/exceptions/ec-1/close').send({}).expect(201);

    expect(createExecute).toHaveBeenCalledWith(createBody, expect.objectContaining({ ActorUserId: 'test-admin' }));
    expect(getExecute).toHaveBeenCalledWith('ec-1');
    expect(logExecute).toHaveBeenCalledWith({ Id: 'ec-1' }, expect.objectContaining({ ActorUserId: 'test-admin' }));
    expect(assignExecute).toHaveBeenCalledWith(
      { Id: 'ec-1', AssignedToUserId: 'u-1' },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(submitExecute).toHaveBeenCalledWith(
      { Id: 'ec-1', RequireApproval: true },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(resolveExecute).toHaveBeenCalledWith(
      { Id: 'ec-1', ReasonCode: 'RC-EXC-RESOLVE' },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(closeExecute).toHaveBeenCalledWith({ Id: 'ec-1' }, expect.objectContaining({ ActorUserId: 'test-admin' }));
  });
});

describe('ExceptionCaseController C2 permission binding (no DB)', () => {
  const meta = (method: keyof ExceptionCaseController): RequirePermissionMetadata =>
    Reflect.getMetadata(REQUIRE_PERMISSION_KEY, ExceptionCaseController.prototype[method]) as RequirePermissionMetadata;

  it('binds Create on POST / and Read on the read routes', () => {
    expect(meta('Create')).toMatchObject({ Action: ActionCode.Create, ObjectType: ObjectType.ExceptionCase });
    expect(meta('GetById')).toMatchObject({ Action: ActionCode.Read, ObjectType: ObjectType.ExceptionCase });
    expect(meta('List')).toMatchObject({ Action: ActionCode.Read, ObjectType: ObjectType.ExceptionCase });
  });

  // AC2/AC4: every transition MUST require (Update, ExceptionCase) — guards against a regression
  // that downgrades a transition route to Read (which would let any reader drive the lifecycle).
  it('binds Update/ExceptionCase on every transition route', () => {
    for (const method of ['Log', 'Assign', 'Submit', 'Resolve', 'Close'] as const) {
      expect(meta(method)).toMatchObject({ Action: ActionCode.Update, ObjectType: ObjectType.ExceptionCase });
    }
  });
});
