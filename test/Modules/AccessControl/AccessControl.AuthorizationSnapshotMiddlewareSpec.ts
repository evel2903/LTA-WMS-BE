import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Inject,
  INestApplication,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AUTHORIZATION_SNAPSHOT_RESOLVER } from '@modules/AccessControl/Application/Interfaces/IAuthorizationSnapshotResolver';
import {
  IPermissionChecker,
  PERMISSION_CHECKER,
} from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { AuthorizationSnapshotContext } from '@modules/AccessControl/Application/Services/AuthorizationSnapshotContext';
import { PermissionChecker } from '@modules/AccessControl/Application/Services/PermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ActorSnapshotStatus } from '@modules/AccessControl/Domain/Enums/ActorSnapshotStatus';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { AuthorizationSnapshotContextMiddleware } from '@modules/AccessControl/Presentation/Middleware/AuthorizationSnapshotContextMiddleware';
import { ScopeExtractor } from '@modules/AccessControl/Presentation/Services/ScopeExtractor';

@Injectable()
class TestActorGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = { UserId: 'actor-1', Role: 'Admin' };
    return true;
  }
}

@Controller('rh-01-snapshot')
@UseGuards(TestActorGuard, PermissionGuard)
class SnapshotProbeController {
  constructor(@Inject(PERMISSION_CHECKER) private readonly checker: IPermissionChecker) {}

  @Get('allow')
  @RequirePermission(ActionCode.Read, ObjectType.Role)
  public async Allow(@CurrentAuditContext() context: AuditContext) {
    const downstream = await this.checker.Check({
      UserId: 'actor-1',
      Action: ActionCode.Read,
      ObjectType: ObjectType.Role,
    });
    return { Context: context, Downstream: downstream };
  }

  @Get('cold')
  public async Cold() {
    return await this.checker.Check({
      UserId: 'actor-1',
      Action: ActionCode.Read,
      ObjectType: ObjectType.Role,
    });
  }
}

describe('AuthorizationSnapshotContextMiddleware HTTP integration', () => {
  let app: INestApplication;
  const userRoles = { FindByUserId: jest.fn() };
  const rolePermissions = { FindByRoleIds: jest.fn() };
  const permissions = { FindByIds: jest.fn() };
  const dataScopes = { FindByPrincipals: jest.fn() };
  const roles = { FindByIds: jest.fn() };
  const resolver = {
    Resolve: jest.fn().mockResolvedValue({
      UserId: 'actor-1',
      ActiveRoles: [{ Id: 'role-1', RoleCode: 'CUSTOM_AUDITOR' }],
      Permissions: [{ Action: ActionCode.Read, ObjectType: ObjectType.Role }],
      DataScopes: [],
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SnapshotProbeController],
      providers: [
        TestActorGuard,
        ScopeExtractor,
        PermissionGuard,
        AuthorizationSnapshotContext,
        AuthorizationSnapshotContextMiddleware,
        { provide: AUTHORIZATION_SNAPSHOT_RESOLVER, useValue: resolver },
        {
          provide: PERMISSION_CHECKER,
          useFactory: (context: AuthorizationSnapshotContext) =>
            new PermissionChecker(
              userRoles as never,
              rolePermissions as never,
              permissions as never,
              dataScopes as never,
              roles as never,
              context,
              resolver,
            ),
          inject: [AuthorizationSnapshotContext],
        },
        {
          provide: AuditedTransaction,
          useValue: {
            Run: jest.fn(async (work: (manager: unknown) => Promise<{ result: unknown }>) => (await work({})).result),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    const middleware = moduleRef.get(AuthorizationSnapshotContextMiddleware);
    app.use((req, res, next) => middleware.use(req, res, next));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resolver.Resolve.mockClear();
    for (const repository of [userRoles, rolePermissions, permissions, dataScopes, roles]) {
      for (const mock of Object.values(repository)) mock.mockClear();
    }
  });

  it('reuses one real-guard snapshot in the decorator and downstream checker, ignoring JWT Role', async () => {
    const response = await request(app.getHttpServer()).get('/rh-01-snapshot/allow').expect(200);
    expect(response.body.Context).toMatchObject({
      ActorUserId: 'actor-1',
      ActorRoleCodes: ['CUSTOM_AUDITOR'],
      ActorSnapshotStatus: ActorSnapshotStatus.Resolved,
    });
    expect(response.body.Downstream).toEqual({ Allowed: true });
    expect(resolver.Resolve).toHaveBeenCalledTimes(1);
    expect(userRoles.FindByUserId).not.toHaveBeenCalled();
  });

  it('cold-resolves once when an HTTP route has no metadata but invokes the checker', async () => {
    await request(app.getHttpServer()).get('/rh-01-snapshot/cold').expect(200, { Allowed: true });
    expect(resolver.Resolve).toHaveBeenCalledTimes(1);
    expect(userRoles.FindByUserId).not.toHaveBeenCalled();
  });
});
