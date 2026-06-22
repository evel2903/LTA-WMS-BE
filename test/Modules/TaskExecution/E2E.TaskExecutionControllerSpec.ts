import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { TaskExecutionController } from '@modules/TaskExecution/Presentation/Controllers/TaskExecutionController';
import { ClaimMobileTaskUseCase } from '@modules/TaskExecution/Application/UseCases/ClaimMobileTaskUseCase';
import { GetMobileTaskUseCase } from '@modules/TaskExecution/Application/UseCases/GetMobileTaskUseCase';
import { ListMobileTasksUseCase } from '@modules/TaskExecution/Application/UseCases/ListMobileTasksUseCase';
import { RecordMobileScanUseCase } from '@modules/TaskExecution/Application/UseCases/RecordMobileScanUseCase';
import { ReleaseMobileTaskUseCase } from '@modules/TaskExecution/Application/UseCases/ReleaseMobileTaskUseCase';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';

describe('E2E TaskExecutionController (no DB)', () => {
  let app: INestApplication;

  const listExecute = jest.fn();
  const getExecute = jest.fn();
  const claimExecute = jest.fn();
  const releaseExecute = jest.fn();
  const recordScanExecute = jest.fn();

  const buildModule = () =>
    Test.createTestingModule({
      controllers: [TaskExecutionController],
      providers: [
        Reflector,
        { provide: ListMobileTasksUseCase, useValue: { Execute: listExecute } },
        { provide: GetMobileTaskUseCase, useValue: { Execute: getExecute } },
        { provide: ClaimMobileTaskUseCase, useValue: { Execute: claimExecute } },
        { provide: ReleaseMobileTaskUseCase, useValue: { Execute: releaseExecute } },
        { provide: RecordMobileScanUseCase, useValue: { Execute: recordScanExecute } },
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
    listExecute.mockReset();
    getExecute.mockReset();
    claimExecute.mockReset();
    releaseExecute.mockReset();
    recordScanExecute.mockReset();
  });

  it('declares MobileTask permissions and warehouse scope metadata on task endpoints', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, TaskExecutionController.prototype.List)).toMatchObject({
      Action: ActionCode.Read,
      ObjectType: ObjectType.MobileTask,
      Scope: { WarehouseId: { In: 'query', Key: 'WarehouseId' } },
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, TaskExecutionController.prototype.GetById)).toMatchObject({
      Action: ActionCode.Read,
      ObjectType: ObjectType.MobileTask,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, TaskExecutionController.prototype.Claim)).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.MobileTask,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, TaskExecutionController.prototype.Release)).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.MobileTask,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, TaskExecutionController.prototype.RecordScan)).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.MobileTask,
    });
  });

  it('GET /mobile/tasks forwards filter query and audit actor for use-case scope filtering', async () => {
    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 100, TotalItems: 0, TotalPages: 1 } });

    await request(app.getHttpServer())
      .get('/mobile/tasks?Page=1&PageSize=500&WarehouseId=warehouse-a&TaskType=Putaway&TaskStatus=Released')
      .expect(200);

    expect(listExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        Page: 1,
        PageSize: 500,
        WarehouseId: 'warehouse-a',
        TaskType: 'Putaway',
        TaskStatus: 'Released',
        ActorUserId: 'test-admin',
      }),
    );
  });

  it('POST claim/release passes audit context and response envelope', async () => {
    claimExecute.mockResolvedValue({ Id: 'task-a', TaskStatus: 'Claimed' });
    releaseExecute.mockResolvedValue({ Id: 'task-a', TaskStatus: 'Released' });

    const claimResponse = await request(app.getHttpServer())
      .post('/mobile/tasks/task-a/claim')
      .send({ DeviceCode: 'RF-01', SessionId: 'session-1' })
      .expect(201);
    const releaseResponse = await request(app.getHttpServer())
      .post('/mobile/tasks/task-a/release')
      .send({})
      .expect(201);

    expect(claimExecute).toHaveBeenCalledWith(
      expect.objectContaining({ Id: 'task-a', DeviceCode: 'RF-01', SessionId: 'session-1' }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(releaseExecute).toHaveBeenCalledWith(
      expect.objectContaining({ Id: 'task-a' }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(claimResponse.body.Success).toBe(true);
    expect(releaseResponse.body.Success).toBe(true);
  });

  it('POST /mobile/tasks/:id/scans passes scan payload and audit context through response envelope', async () => {
    recordScanExecute.mockResolvedValue({
      Id: 'scan-1',
      TaskId: 'task-a',
      Result: 'Accepted',
      RawValue: '09506000134352',
    });

    const response = await request(app.getHttpServer())
      .post('/mobile/tasks/task-a/scans')
      .send({
        ScanType: 'Item',
        RawValue: '(01)09506000134352(10)LOT123',
        DeviceCode: 'RF-01',
        SessionId: 'session-1',
      })
      .expect(201);

    expect(recordScanExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        TaskId: 'task-a',
        ScanType: 'Item',
        RawValue: '(01)09506000134352(10)LOT123',
        DeviceCode: 'RF-01',
        SessionId: 'session-1',
      }),
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(response.body).toMatchObject({ Success: true, Data: { Id: 'scan-1', Result: 'Accepted' } });
  });

  it('POST /mobile/tasks/:id/scans returns stable rejected scan details in the response envelope', async () => {
    recordScanExecute.mockResolvedValue({
      Id: 'scan-2',
      TaskId: 'task-a',
      Result: 'Rejected',
      RawValue: 'missing-barcode',
      NormalizedValue: 'missing-barcode',
      RejectionCode: 'UNRESOLVED_BARCODE',
      RejectionMessage: 'Barcode could not be resolved',
    });

    const response = await request(app.getHttpServer())
      .post('/mobile/tasks/task-a/scans')
      .send({
        ScanType: 'Item',
        RawValue: 'missing-barcode',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      Success: true,
      Data: {
        Id: 'scan-2',
        Result: 'Rejected',
        RejectionCode: 'UNRESOLVED_BARCODE',
        RejectionMessage: 'Barcode could not be resolved',
      },
    });
  });

  it('validates scan request payload before calling the use case', async () => {
    await request(app.getHttpServer()).post('/mobile/tasks/task-a/scans').send({ ScanType: 'Item' }).expect(400);
    expect(recordScanExecute).not.toHaveBeenCalled();
  });
});
