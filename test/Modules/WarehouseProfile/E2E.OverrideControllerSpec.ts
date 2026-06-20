import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  REQUIRE_PERMISSION_KEY,
  RequirePermissionMetadata,
} from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { RequestOverrideUseCase } from '@modules/WarehouseProfile/Application/UseCases/RequestOverrideUseCase';
import { GetOverrideLogUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetOverrideLogUseCase';
import { ListOverrideLogsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListOverrideLogsUseCase';
import { OverrideController } from '@modules/WarehouseProfile/Presentation/Controllers/OverrideController';

describe('E2E OverrideController (no DB)', () => {
  let app: INestApplication;
  const requestExecute = jest.fn();
  const getExecute = jest.fn();
  const listExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(
      Test.createTestingModule({
        controllers: [OverrideController],
        providers: [
          { provide: RequestOverrideUseCase, useValue: { Execute: requestExecute } },
          { provide: GetOverrideLogUseCase, useValue: { Execute: getExecute } },
          { provide: ListOverrideLogsUseCase, useValue: { Execute: listExecute } },
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
    requestExecute.mockReset();
    getExecute.mockReset();
    listExecute.mockReset();
  });

  it('rejects an invalid create body (missing RuleId / TargetObjectId) with 400', async () => {
    await request(app.getHttpServer()).post('/overrides').send({ TargetObjectType: ObjectType.Location }).expect(400);
    expect(requestExecute).not.toHaveBeenCalled();
  });

  it('routes request, get and list through use cases and threads the audit context', async () => {
    requestExecute.mockResolvedValue({ Id: 'ol-1' });
    getExecute.mockResolvedValue({ Id: 'ol-1' });
    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 20, TotalItems: 0, TotalPages: 1 } });

    const body = {
      RuleId: 'rule-1',
      TargetObjectType: ObjectType.Location,
      TargetObjectId: 'loc-1',
      TargetObjectCode: 'LOC-1',
    };

    await request(app.getHttpServer()).post('/overrides').send(body).expect(201);
    await request(app.getHttpServer()).get('/overrides/ol-1').expect(200);
    await request(app.getHttpServer()).get('/overrides?RuleId=rule-1').expect(200);

    // @CurrentAuditContext() is threaded as the last argument with the injected test user.
    expect(requestExecute).toHaveBeenCalledWith(body, expect.objectContaining({ ActorUserId: 'test-admin' }));
    expect(getExecute).toHaveBeenCalledWith('ol-1');
    expect(listExecute).toHaveBeenCalledWith(expect.objectContaining({ RuleId: 'rule-1' }));
  });
});

describe('OverrideController C2 permission binding (no DB)', () => {
  const meta = (method: keyof OverrideController): RequirePermissionMetadata =>
    Reflect.getMetadata(REQUIRE_PERMISSION_KEY, OverrideController.prototype[method]) as RequirePermissionMetadata;

  // AC2/AC4: POST /overrides MUST require (Override, OverrideLog) — guards against a regression
  // that downgrades the override route to Read (which would let any reader override rules).
  it('binds Override/OverrideLog on the request route', () => {
    expect(meta('Request')).toMatchObject({ Action: ActionCode.Override, ObjectType: ObjectType.OverrideLog });
  });

  it('binds Read/OverrideLog on the read routes', () => {
    expect(meta('GetById')).toMatchObject({ Action: ActionCode.Read, ObjectType: ObjectType.OverrideLog });
    expect(meta('List')).toMatchObject({ Action: ActionCode.Read, ObjectType: ObjectType.OverrideLog });
  });
});
