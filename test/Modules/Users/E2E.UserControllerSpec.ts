import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { GlobalExceptionFilter } from '@common/Filters/GlobalExceptionFilter';
import { LoggingService } from '@common/Logging/LoggingService';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { UserController } from '@modules/Users/Presentation/Controllers/UserController';
import { CreateUserUseCase } from '@modules/Users/Application/UseCases/CreateUserUseCase';
import { DeleteUserUseCase } from '@modules/Users/Application/UseCases/DeleteUserUseCase';
import { GetUserByIdUseCase } from '@modules/Users/Application/UseCases/GetUserByIdUseCase';
import { ListUsersUseCase } from '@modules/Users/Application/UseCases/ListUsersUseCase';
import { UpdateUserUseCase } from '@modules/Users/Application/UseCases/UpdateUserUseCase';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { PermissionChecker } from '@modules/AccessControl/Application/Services/PermissionChecker';
import { PERMISSION_CHECKER } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ScopeExtractor } from '@modules/AccessControl/Presentation/Services/ScopeExtractor';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import {
  InMemoryDataScopeRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryRoleRepository,
  InMemoryUserRoleRepository,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  REQUIRE_PERMISSION_KEY,
  RequirePermissionMetadata,
} from '@modules/AccessControl/Presentation/Decorators/RequirePermission';

describe('E2E UserController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getByIdExecute = jest.fn();
  const listExecute = jest.fn();
  const updateExecute = jest.fn();
  const deleteExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(
      Test.createTestingModule({
        controllers: [UserController],
        providers: [
          { provide: CreateUserUseCase, useValue: { Execute: createExecute } },
          { provide: GetUserByIdUseCase, useValue: { Execute: getByIdExecute } },
          { provide: ListUsersUseCase, useValue: { Execute: listExecute } },
          { provide: UpdateUserUseCase, useValue: { Execute: updateExecute } },
          { provide: DeleteUserUseCase, useValue: { Execute: deleteExecute } },
        ],
      }),
    ).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    createExecute.mockReset();
    getByIdExecute.mockReset();
    listExecute.mockReset();
    updateExecute.mockReset();
    deleteExecute.mockReset();
  });

  it('POST /users returns 400 on invalid body', async () => {
    await request(app.getHttpServer()).post('/users').send({ FirstName: 'A' }).expect(400);
    expect(createExecute).not.toHaveBeenCalled();
  });

  it('POST /users calls use case on valid body', async () => {
    createExecute.mockResolvedValue({
      Id: 'u1',
      FirstName: 'A',
      LastName: 'B',
      EmailAddress: 'a@b.com',
      CreatedAt: new Date().toISOString(),
    });

    await request(app.getHttpServer())
      .post('/users')
      .send({ FirstName: 'A', LastName: 'B', EmailAddress: 'a@b.com' })
      .expect(201);

    expect(createExecute).toHaveBeenCalledWith({ FirstName: 'A', LastName: 'B', EmailAddress: 'a@b.com' });
  });

  it('GET /users/:id calls use case', async () => {
    getByIdExecute.mockResolvedValue({
      Id: 'u1',
      FirstName: 'A',
      LastName: 'B',
      EmailAddress: 'a@b.com',
      CreatedAt: 'x',
    });
    await request(app.getHttpServer()).get('/users/u1').expect(200);
    expect(getByIdExecute).toHaveBeenCalledWith('u1');
  });
});

describe('UserController access binding (HB-02)', () => {
  const meta = (method: keyof UserController): RequirePermissionMetadata =>
    Reflect.getMetadata(REQUIRE_PERMISSION_KEY, UserController.prototype[method]) as RequirePermissionMetadata;

  it('guards every legacy /users endpoint with UserAssignment permissions', () => {
    expect(meta('Create')).toMatchObject({ Action: ActionCode.Create, ObjectType: ObjectType.UserAssignment });
    expect(meta('GetById')).toMatchObject({ Action: ActionCode.Read, ObjectType: ObjectType.UserAssignment });
    expect(meta('List')).toMatchObject({ Action: ActionCode.Read, ObjectType: ObjectType.UserAssignment });
    expect(meta('Update')).toMatchObject({ Action: ActionCode.Update, ObjectType: ObjectType.UserAssignment });
    expect(meta('Delete')).toMatchObject({
      Action: ActionCode.DeleteCancel,
      ObjectType: ObjectType.UserAssignment,
    });
  });
});

describe('UserController real access guard (HB-02)', () => {
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
    await userRoles.Create(
      new UserRoleEntity({ Id: randomUUID(), UserId: 'admin', RoleId: adminRole!.Id, AssignedAt: new Date() }),
    );
    await userRoles.Create(
      new UserRoleEntity({ Id: randomUUID(), UserId: 'operator', RoleId: operatorRole!.Id, AssignedAt: new Date() }),
    );

    const checker = new PermissionChecker(userRoles, rolePermissions, permissions, dataScopes, roles);
    const moduleRef = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: CreateUserUseCase, useValue: { Execute: createExecute } },
        { provide: GetUserByIdUseCase, useValue: { Execute: jest.fn() } },
        { provide: ListUsersUseCase, useValue: { Execute: jest.fn() } },
        { provide: UpdateUserUseCase, useValue: { Execute: jest.fn() } },
        { provide: DeleteUserUseCase, useValue: { Execute: jest.fn() } },
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
    createExecute.mockResolvedValue({ Id: 'u-new', FirstName: 'A', LastName: 'B', EmailAddress: 'a@b.com' });
  });

  it('allows WMS admin and denies operator/no-user on POST /users', async () => {
    const body = { FirstName: 'A', LastName: 'B', EmailAddress: 'a@b.com' };

    await request(app.getHttpServer()).post('/users').set('x-test-user', 'admin').send(body).expect(201);
    await request(app.getHttpServer()).post('/users').set('x-test-user', 'operator').send(body).expect(403);
    await request(app.getHttpServer()).post('/users').send(body).expect(403);

    expect(createExecute).toHaveBeenCalledTimes(1);
  });
});
