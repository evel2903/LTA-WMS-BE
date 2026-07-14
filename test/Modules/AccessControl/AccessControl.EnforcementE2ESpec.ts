import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { GlobalExceptionFilter } from '@common/Filters/GlobalExceptionFilter';
import { LoggingService } from '@common/Logging/LoggingService';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import { DataScopeEntity } from '@modules/AccessControl/Domain/Entities/DataScopeEntity';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { PermissionChecker } from '@modules/AccessControl/Application/Services/PermissionChecker';
import { PERMISSION_CHECKER } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ScopeExtractor } from '@modules/AccessControl/Presentation/Services/ScopeExtractor';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { ZoneController } from '@modules/MasterData/Presentation/Controllers/ZoneController';
import { CreateZoneUseCase } from '@modules/MasterData/Application/UseCases/CreateZoneUseCase';
import { GetZoneByIdUseCase } from '@modules/MasterData/Application/UseCases/GetZoneByIdUseCase';
import { ListZonesUseCase } from '@modules/MasterData/Application/UseCases/ListZonesUseCase';
import { UpdateZoneUseCase } from '@modules/MasterData/Application/UseCases/UpdateZoneUseCase';
import {
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryUserRoleRepository,
  InMemoryDataScopeRepository,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

const zoneBody = (warehouseId: string) => ({
  WarehouseId: warehouseId,
  ZoneCode: 'PICK',
  ZoneName: 'Picking Zone',
  ZoneType: 'PICKING',
  Status: 'Active',
  Sequence: 10,
  ComplianceFlags: { Hazmat: false },
});

/**
 * AC3 + AC5: the real PermissionGuard + PermissionChecker enforce on the real
 * ZoneController. Only JwtAuthGuard is overridden (to inject the caller from a header).
 * Same POST /zones action flips 201/403 by role (permission) and by data scope.
 */
describe('Permission enforcement E2E (ZoneController, real guard)', () => {
  let app: INestApplication;
  const createExecute = jest.fn();

  beforeAll(async () => {
    const roles = new InMemoryRoleRepository();
    const permissions = new InMemoryPermissionRepository();
    const rolePermissions = new InMemoryRolePermissionRepository();
    const userRoles = new InMemoryUserRoleRepository();
    const dataScopes = new InMemoryDataScopeRepository();
    await SeedAccessControlRbac(roles, permissions, rolePermissions);

    const adminRole = await roles.FindByCode(RoleCode.WmsAdmin);
    const operatorRole = await roles.FindByCode(RoleCode.Operator);
    // 'admin' has Create:Zone; scope limited to warehouse W1 (NOT IncludeAll) to drive scope pass/fail.
    await userRoles.Create(
      new UserRoleEntity({ Id: randomUUID(), UserId: 'admin', RoleId: adminRole!.Id, AssignedAt: new Date() }),
    );
    await dataScopes.Create(
      new DataScopeEntity({
        Id: randomUUID(),
        PrincipalType: PrincipalType.Role,
        PrincipalId: adminRole!.Id,
        ScopeType: DataScopeType.Warehouse,
        ScopeValueId: 'W1',
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      }),
    );
    // 'operator' lacks Create:Zone entirely.
    await userRoles.Create(
      new UserRoleEntity({ Id: randomUUID(), UserId: 'operator', RoleId: operatorRole!.Id, AssignedAt: new Date() }),
    );

    const checker = new PermissionChecker(userRoles, rolePermissions, permissions, dataScopes, roles);

    const moduleRef = await Test.createTestingModule({
      controllers: [ZoneController],
      providers: [
        { provide: CreateZoneUseCase, useValue: { Execute: createExecute } },
        { provide: GetZoneByIdUseCase, useValue: { Execute: jest.fn() } },
        { provide: ListZonesUseCase, useValue: { Execute: jest.fn() } },
        { provide: UpdateZoneUseCase, useValue: { Execute: jest.fn() } },
        ScopeExtractor,
        PermissionGuard,
        { provide: PERMISSION_CHECKER, useValue: checker },
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
    createExecute.mockReset();
    createExecute.mockResolvedValue({ Id: 'zone-1', ZoneCode: 'PICK' });
  });

  it('AC3 allow: admin in-scope (W1) creates the zone (201)', async () => {
    await request(app.getHttpServer()).post('/zones').set('x-test-user', 'admin').send(zoneBody('W1')).expect(201);
    expect(createExecute).toHaveBeenCalled();
  });

  it('AC3 deny PERMISSION_DENIED: operator lacks Create:Zone (403, stable code + reason)', async () => {
    const res = await request(app.getHttpServer())
      .post('/zones')
      .set('x-test-user', 'operator')
      .send(zoneBody('W1'))
      .expect(403);
    expect(res.body).toMatchObject({
      Success: false,
      Errors: [{ Code: 'FORBIDDEN', Details: { Reason: 'PERMISSION_DENIED' } }],
    });
    expect(createExecute).not.toHaveBeenCalled();
  });

  it('AC3 deny OUT_OF_SCOPE: admin scoped to W1 cannot create in W2 (403, reason)', async () => {
    const res = await request(app.getHttpServer())
      .post('/zones')
      .set('x-test-user', 'admin')
      .send(zoneBody('W2'))
      .expect(403);
    expect(res.body.Errors[0].Details.Reason).toBe('OUT_OF_SCOPE');
    expect(createExecute).not.toHaveBeenCalled();
  });

  it('AC5 role axis: same action flips pass/fail when the role changes (admin 201 vs operator 403)', async () => {
    await request(app.getHttpServer()).post('/zones').set('x-test-user', 'admin').send(zoneBody('W1')).expect(201);
    await request(app.getHttpServer()).post('/zones').set('x-test-user', 'operator').send(zoneBody('W1')).expect(403);
  });

  it('AC5 scope axis: same action+role flips pass/fail when the target scope changes (W1 201 vs W2 403)', async () => {
    await request(app.getHttpServer()).post('/zones').set('x-test-user', 'admin').send(zoneBody('W1')).expect(201);
    await request(app.getHttpServer()).post('/zones').set('x-test-user', 'admin').send(zoneBody('W2')).expect(403);
  });

  it('rejects an unauthenticated request (no x-test-user) with 403', async () => {
    await request(app.getHttpServer()).post('/zones').send(zoneBody('W1')).expect(403);
  });
});
