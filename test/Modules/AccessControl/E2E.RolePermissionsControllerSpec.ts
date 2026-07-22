import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { GlobalExceptionFilter } from '@common/Filters/GlobalExceptionFilter';
import { LoggingService } from '@common/Logging/LoggingService';
import { NotFoundException, BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { PERMISSION_CHECKER } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { PermissionChecker } from '@modules/AccessControl/Application/Services/PermissionChecker';
import { ScopeExtractor } from '@modules/AccessControl/Presentation/Services/ScopeExtractor';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AUTHORIZATION_SNAPSHOT_RESOLVER } from '@modules/AccessControl/Application/Interfaces/IAuthorizationSnapshotResolver';
import { AuthorizationSnapshotContext } from '@modules/AccessControl/Application/Services/AuthorizationSnapshotContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActorSnapshotStatus } from '@modules/AccessControl/Domain/Enums/ActorSnapshotStatus';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import {
  REQUIRE_PERMISSION_KEY,
  RequirePermissionMetadata,
} from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { RoleController } from '@modules/AccessControl/Presentation/Controllers/RoleController';
import { ListRolesUseCase } from '@modules/AccessControl/Application/UseCases/ListRolesUseCase';
import { GetRoleUseCase } from '@modules/AccessControl/Application/UseCases/GetRoleUseCase';
import { CreateRoleUseCase } from '@modules/AccessControl/Application/UseCases/CreateRoleUseCase';
import { UpdateRoleUseCase } from '@modules/AccessControl/Application/UseCases/UpdateRoleUseCase';
import { SetRolePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/SetRolePermissionsUseCase';
import { ResetRolePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/ResetRolePermissionsUseCase';
import {
  InMemoryRoleRepository,
  InMemoryRoleCatalogRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryUserRoleRepository,
  InMemoryDataScopeRepository,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

/**
 * Review Findings #5: real Nest pipeline coverage for PUT/reset permissions -- lower-camel
 * binding, whitelist/enum/reason validation, error-status mapping and response
 * serialization all run through the actual ValidationPipe/ResponseInterceptor/
 * GlobalExceptionFilter, not a direct controller-method call.
 */
describe('E2E RoleController permissions endpoints (no DB)', () => {
  let app: INestApplication;
  const setExecute = jest.fn();
  const resetExecute = jest.fn();
  const updateExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(
      Test.createTestingModule({
        controllers: [RoleController],
        providers: [
          { provide: ListRolesUseCase, useValue: { Execute: jest.fn() } },
          { provide: GetRoleUseCase, useValue: { Execute: jest.fn() } },
          { provide: CreateRoleUseCase, useValue: { Execute: jest.fn() } },
          { provide: UpdateRoleUseCase, useValue: { Execute: updateExecute } },
          { provide: SetRolePermissionsUseCase, useValue: { Execute: setExecute } },
          { provide: ResetRolePermissionsUseCase, useValue: { Execute: resetExecute } },
          { provide: LoggingService, useValue: { LogError: jest.fn() } },
        ],
      }),
    ).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter(moduleRef.get(LoggingService)));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    setExecute.mockReset();
    resetExecute.mockReset();
    updateExecute.mockReset();
  });

  const validPutBody = () => ({
    permissions: [{ action: ActionCode.Read, objectType: ObjectType.Role }],
    version: 0,
    reasonCode: 'RC-X',
  });

  const metadataToken = '2026-07-22T06:00:00.123Z';
  const roleResponse = (updatedAt = metadataToken) => ({
    Id: 'role-1',
    RoleCode: 'CUSTOM_ROLE',
    RoleName: 'Custom Role',
    Description: null,
    IsSystem: false,
    Status: RoleStatus.Active,
    PermissionsVersion: 2,
    UpdatedAt: updatedAt,
  });

  it.each([
    ['literal empty body', {}],
    ['missing token', { RoleName: 'Name' }],
    ['malformed token', { ExpectedUpdatedAt: 'not-a-date', RoleName: 'Name' }],
    ['whitespace-only name', { ExpectedUpdatedAt: metadataToken, RoleName: '   ' }],
    ['unknown field', { ExpectedUpdatedAt: metadataToken, Unknown: true }],
  ])('PATCH rejects %s with 400 before the use case', async (_label, body) => {
    await request(app.getHttpServer()).patch('/access-control/roles/role-1').send(body).expect(400);
    expect(updateExecute).not.toHaveBeenCalled();
  });

  it('PATCH forwards the server token and returns UpdatedAt in the global success envelope', async () => {
    const successor = '2026-07-22T06:00:00.124Z';
    updateExecute.mockResolvedValue(roleResponse(successor));

    const res = await request(app.getHttpServer())
      .patch('/access-control/roles/role-1')
      .send({ ExpectedUpdatedAt: metadataToken, RoleName: '  Custom Role  ' })
      .expect(200);

    expect(updateExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        Id: 'role-1',
        ExpectedUpdatedAt: metadataToken,
        RoleName: 'Custom Role',
      }),
      expect.objectContaining({
        ActorRoleCodes: ['WMS_ADMIN'],
        ActorSnapshotStatus: ActorSnapshotStatus.Resolved,
      }),
    );
    expect(res.body).toEqual({ Success: true, Data: roleResponse(successor) });
  });

  it('PATCH stale token returns exact CONFLICT details in the global error envelope', async () => {
    const current = '2026-07-22T06:00:00.124Z';
    updateExecute.mockRejectedValue(
      new ConflictException('Role metadata changed since this page was loaded.', {
        Reason: 'ROLE_METADATA_STALE',
        CurrentUpdatedAt: current,
      }),
    );

    const res = await request(app.getHttpServer())
      .patch('/access-control/roles/role-1')
      .send({ ExpectedUpdatedAt: metadataToken, RoleName: 'Changed' })
      .expect(409);

    expect(res.body).toEqual({
      Success: false,
      Errors: [
        {
          Code: 'CONFLICT',
          Message: 'Role metadata changed since this page was loaded.',
          Details: { Reason: 'ROLE_METADATA_STALE', CurrentUpdatedAt: current },
        },
      ],
    });
  });

  it('PATCH maps locked-row 404 and system-status 400 through the global filter', async () => {
    updateExecute.mockRejectedValueOnce(new NotFoundException('Role not found'));
    await request(app.getHttpServer())
      .patch('/access-control/roles/missing')
      .send({ ExpectedUpdatedAt: metadataToken, RoleName: 'Changed' })
      .expect(404);

    updateExecute.mockRejectedValueOnce(new BusinessRuleException('A system role status cannot be changed'));
    await request(app.getHttpServer())
      .patch('/access-control/roles/system')
      .send({ ExpectedUpdatedAt: metadataToken, Status: RoleStatus.Active })
      .expect(400);
  });

  it('binds a lower-camel PUT body, maps it to the PascalCase use-case DTO, and returns a lower-camel response', async () => {
    setExecute.mockResolvedValue({
      Permissions: [{ Action: ActionCode.Read, ObjectType: ObjectType.Role }],
      Version: 1,
      UpdatedAt: '2026-07-22T06:00:00.124Z',
    });

    const res = await request(app.getHttpServer())
      .put('/access-control/roles/role-1/permissions')
      .send(validPutBody())
      .expect(200);

    expect(setExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        Id: 'role-1',
        Permissions: [{ Action: ActionCode.Read, ObjectType: ObjectType.Role }],
        Version: 0,
        ReasonCode: 'RC-X',
      }),
      expect.anything(),
    );
    expect(res.body).toEqual({
      Success: true,
      Data: {
        permissions: [{ action: ActionCode.Read, objectType: ObjectType.Role }],
        version: 1,
      },
    });
  });

  it('rejects an invalid action enum with 400 and never calls the use case', async () => {
    await request(app.getHttpServer())
      .put('/access-control/roles/role-1/permissions')
      .send({ permissions: [{ action: 'NOT_A_REAL_ACTION', objectType: ObjectType.Role }], reasonCode: 'RC-X' })
      .expect(400);
    expect(setExecute).not.toHaveBeenCalled();
  });

  it('rejects a missing reasonCode with 400', async () => {
    await request(app.getHttpServer())
      .put('/access-control/roles/role-1/permissions')
      .send({ permissions: [] })
      .expect(400);
    expect(setExecute).not.toHaveBeenCalled();
  });

  it('still enforces whitelist/forbidNonWhitelisted: an unexpected extra field is rejected with 400', async () => {
    await request(app.getHttpServer())
      .put('/access-control/roles/role-1/permissions')
      .send({ ...validPutBody(), notAContractField: true })
      .expect(400);
    expect(setExecute).not.toHaveBeenCalled();
  });

  it('PUT on a missing role -> 404', async () => {
    setExecute.mockRejectedValue(new NotFoundException('Role not found'));
    await request(app.getHttpServer())
      .put('/access-control/roles/missing/permissions')
      .send(validPutBody())
      .expect(404);
  });

  it('reset binds a lower-camel body and returns a lower-camel response', async () => {
    resetExecute.mockResolvedValue({
      Permissions: [{ Action: ActionCode.Read, ObjectType: ObjectType.Role }],
      Version: 2,
      UpdatedAt: '2026-07-22T06:00:00.125Z',
    });

    const res = await request(app.getHttpServer())
      .post('/access-control/roles/role-1/permissions/reset')
      .send({ reasonCode: 'RC-RESET' })
      .expect(201);

    expect(resetExecute).toHaveBeenCalledWith(
      expect.objectContaining({ Id: 'role-1', ReasonCode: 'RC-RESET' }),
      expect.anything(),
    );
    expect(res.body.Data).toEqual({
      permissions: [{ action: ActionCode.Read, objectType: ObjectType.Role }],
      version: 2,
    });
  });

  it('reset on a missing role -> 404', async () => {
    resetExecute.mockRejectedValue(new NotFoundException('Role not found'));
    await request(app.getHttpServer())
      .post('/access-control/roles/missing/permissions/reset')
      .send({ reasonCode: 'RC-RESET' })
      .expect(404);
  });

  it('reset on a custom (non-system) role -> 400, not 403', async () => {
    resetExecute.mockRejectedValue(
      new BusinessRuleException('Only a system role can be reset to its default seed permissions'),
    );
    await request(app.getHttpServer())
      .post('/access-control/roles/role-custom/permissions/reset')
      .send({ reasonCode: 'RC-RESET' })
      .expect(400);
  });

  it('both routes require Update:Role (decorator metadata)', () => {
    const meta = (method: keyof RoleController): RequirePermissionMetadata =>
      Reflect.getMetadata(REQUIRE_PERMISSION_KEY, RoleController.prototype[method]) as RequirePermissionMetadata;
    expect(meta('SetPermissions')).toEqual({ Action: ActionCode.Update, ObjectType: ObjectType.Role });
    expect(meta('ResetPermissions')).toEqual({ Action: ActionCode.Update, ObjectType: ObjectType.Role });
    expect(meta('Update')).toEqual({ Action: ActionCode.Update, ObjectType: ObjectType.Role });
  });
});

/**
 * AC5 (mirrors AccessControl.EnforcementE2ESpec.ts): the REAL PermissionGuard +
 * PermissionChecker enforce on RoleController's 2 new routes, not just decorator metadata.
 */
describe('Permission enforcement E2E (RoleController.SetPermissions/ResetPermissions, real guard)', () => {
  let app: INestApplication;
  const setExecute = jest.fn();
  const resetExecute = jest.fn();

  beforeAll(async () => {
    const roles = new InMemoryRoleRepository();
    const permissions = new InMemoryPermissionRepository();
    const rolePermissions = new InMemoryRolePermissionRepository();
    const userRoles = new InMemoryUserRoleRepository();
    const dataScopes = new InMemoryDataScopeRepository();
    await SeedAccessControlRbac(roles, permissions, rolePermissions, new InMemoryRoleCatalogRepository(roles));

    const adminRole = await roles.FindByCode(RoleCode.WmsAdmin);
    const operatorRole = await roles.FindByCode(RoleCode.Operator);
    await userRoles.Create(
      new UserRoleEntity({ Id: randomUUID(), UserId: 'admin', RoleId: adminRole!.Id, AssignedAt: new Date() }),
    );
    await userRoles.Create(
      new UserRoleEntity({ Id: randomUUID(), UserId: 'operator', RoleId: operatorRole!.Id, AssignedAt: new Date() }),
    );

    const checker = new PermissionChecker(userRoles, rolePermissions, permissions, dataScopes, roles);
    const resolver = {
      Resolve: jest.fn(async (userId: string) => ({
        UserId: userId,
        ActiveRoles:
          userId === 'admin'
            ? [{ Id: adminRole!.Id, RoleCode: RoleCode.WmsAdmin }]
            : [{ Id: operatorRole!.Id, RoleCode: RoleCode.Operator }],
        Permissions: userId === 'admin' ? [{ Action: ActionCode.Update, ObjectType: ObjectType.Role }] : [],
        DataScopes: [],
      })),
    };
    const audited = {
      Run: jest.fn(async (work: (manager: unknown) => Promise<{ result: unknown }>) => (await work({})).result),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        { provide: ListRolesUseCase, useValue: { Execute: jest.fn() } },
        { provide: GetRoleUseCase, useValue: { Execute: jest.fn() } },
        { provide: CreateRoleUseCase, useValue: { Execute: jest.fn() } },
        { provide: UpdateRoleUseCase, useValue: { Execute: jest.fn() } },
        { provide: SetRolePermissionsUseCase, useValue: { Execute: setExecute } },
        { provide: ResetRolePermissionsUseCase, useValue: { Execute: resetExecute } },
        ScopeExtractor,
        PermissionGuard,
        { provide: PERMISSION_CHECKER, useValue: checker },
        { provide: AUTHORIZATION_SNAPSHOT_RESOLVER, useValue: resolver },
        AuthorizationSnapshotContext,
        { provide: AuditedTransaction, useValue: audited },
        { provide: LoggingService, useValue: { LogError: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => { headers: Record<string, string>; user?: unknown } };
        }) => {
          const req = context.switchToHttp().getRequest();
          const userId = req.headers['x-test-user'];
          if (userId) req.user = { UserId: userId };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter(moduleRef.get(LoggingService)));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    setExecute.mockReset();
    resetExecute.mockReset();
    setExecute.mockResolvedValue({ Permissions: [] });
    resetExecute.mockResolvedValue({ Permissions: [] });
  });

  it('operator lacks Update:Role: PUT permissions -> 403, use case never called', async () => {
    await request(app.getHttpServer())
      .put('/access-control/roles/role-1/permissions')
      .set('x-test-user', 'operator')
      .send({ permissions: [], reasonCode: 'RC-X' })
      .expect(403);
    expect(setExecute).not.toHaveBeenCalled();
  });

  it('operator lacks Update:Role: POST reset -> 403, use case never called', async () => {
    await request(app.getHttpServer())
      .post('/access-control/roles/role-1/permissions/reset')
      .set('x-test-user', 'operator')
      .send({ reasonCode: 'RC-X' })
      .expect(403);
    expect(resetExecute).not.toHaveBeenCalled();
  });

  it('admin (seeded Update:Role) passes the guard on both routes', async () => {
    await request(app.getHttpServer())
      .put('/access-control/roles/role-1/permissions')
      .set('x-test-user', 'admin')
      .send({ permissions: [], version: 0, reasonCode: 'RC-X' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/access-control/roles/role-1/permissions/reset')
      .set('x-test-user', 'admin')
      .send({ reasonCode: 'RC-X' })
      .expect(201);
    expect(setExecute).toHaveBeenCalled();
    expect(resetExecute).toHaveBeenCalled();
  });
});
