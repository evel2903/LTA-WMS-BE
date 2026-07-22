import { ExecutionContext, Logger } from '@nestjs/common';
import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { AuthorizationSnapshot } from '@modules/AccessControl/Application/DTOs/AuthorizationSnapshot';
import { SnapshotResolutionError } from '@modules/AccessControl/Application/Errors/SnapshotResolutionError';
import { AuthorizationSnapshotContext } from '@modules/AccessControl/Application/Services/AuthorizationSnapshotContext';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { ScopeExtractor } from '@modules/AccessControl/Presentation/Services/ScopeExtractor';
import {
  REQUIRE_PERMISSION_KEY,
  RequirePermissionMetadata,
} from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CURRENT_AUDIT_CONTEXT_KEY } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { ActorSnapshotStatus } from '@modules/AccessControl/Domain/Enums/ActorSnapshotStatus';

const makeContext = (user: unknown) => {
  const request = { user, body: {}, params: {}, query: {}, headers: {} };
  const context = {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
};

const snapshot: AuthorizationSnapshot = {
  UserId: 'u',
  ActiveRoles: [{ Id: 'role-1', RoleCode: 'CUSTOM_AUDITOR' }],
  Permissions: [{ Action: ActionCode.Read, ObjectType: ObjectType.Warehouse }],
  DataScopes: [],
};

const buildGuard = (
  metadata: RequirePermissionMetadata | undefined,
  decision?: PermissionDecision,
  auditContextRequired = false,
) => {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === REQUIRE_PERMISSION_KEY) return metadata;
      if (key === CURRENT_AUDIT_CONTEXT_KEY) return auditContextRequired;
      return undefined;
    }),
  };
  const checker = { Check: jest.fn().mockResolvedValue(decision ?? { Allowed: true }) };
  const resolver = { Resolve: jest.fn().mockResolvedValue(snapshot) };
  const requestContext = new AuthorizationSnapshotContext();
  const entries: unknown[] = [];
  const audited = {
    Run: jest.fn(async (work: (manager: unknown) => Promise<{ result: unknown; entry: unknown | unknown[] }>) => {
      const { result, entry } = await work({});
      entries.push(...(Array.isArray(entry) ? entry : [entry]));
      return result;
    }),
  };
  const guard = new PermissionGuard(
    reflector as never,
    new ScopeExtractor(),
    checker as never,
    resolver as never,
    requestContext,
    audited as never,
  );
  const Activate = async (context: ExecutionContext) => await requestContext.Run(() => guard.canActivate(context));
  return { guard, checker, resolver, requestContext, audited, entries, Activate };
};

describe('PermissionGuard', () => {
  let loggerError: jest.SpyInstance;

  beforeEach(() => {
    loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    loggerError.mockRestore();
  });

  it('passes through when no @RequirePermission metadata is present', async () => {
    const { checker, resolver, Activate } = buildGuard(undefined);
    await expect(Activate(makeContext({ UserId: 'u' }).context)).resolves.toBe(true);
    expect(checker.Check).not.toHaveBeenCalled();
    expect(resolver.Resolve).not.toHaveBeenCalled();
  });

  it('allows when the checker allows', async () => {
    const { checker, resolver, Activate } = buildGuard(
      { Action: ActionCode.Read, ObjectType: ObjectType.Warehouse },
      { Allowed: true },
    );
    await expect(Activate(makeContext({ UserId: 'u' }).context)).resolves.toBe(true);
    expect(resolver.Resolve).toHaveBeenCalledTimes(1);
    expect(checker.Check).toHaveBeenCalledWith(expect.objectContaining({ UserId: 'u' }), snapshot);
  });

  it('resolves audit-only metadata once and skips permission evaluation', async () => {
    const { checker, resolver, Activate } = buildGuard(undefined, undefined, true);
    const { context, request } = makeContext({ UserId: 'u' });
    await expect(Activate(context)).resolves.toBe(true);
    expect(resolver.Resolve).toHaveBeenCalledTimes(1);
    expect(checker.Check).not.toHaveBeenCalled();
    expect(request).toMatchObject({ AuthorizationSnapshot: snapshot });
  });

  it('resolves only once when permission and audit-context metadata are both present', async () => {
    const { resolver, Activate } = buildGuard(
      { Action: ActionCode.Read, ObjectType: ObjectType.Warehouse },
      { Allowed: true },
      true,
    );
    await expect(Activate(makeContext({ UserId: 'u' }).context)).resolves.toBe(true);
    expect(resolver.Resolve).toHaveBeenCalledTimes(1);
  });

  it('throws ForbiddenAppException with the deny reason when the checker denies', async () => {
    const { Activate, audited, entries } = buildGuard(
      { Action: ActionCode.Read, ObjectType: ObjectType.Warehouse },
      { Allowed: false, Reason: 'OUT_OF_SCOPE' },
    );
    await expect(Activate(makeContext({ UserId: 'u' }).context)).rejects.toBeInstanceOf(ForbiddenAppException);
    expect(audited.Run).toHaveBeenCalled();
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ActorUserId: 'u',
          ActorRoleCodes: ['CUSTOM_AUDITOR'],
          ActorSnapshotStatus: ActorSnapshotStatus.Resolved,
          Action: ActionCode.Read,
          ObjectType: ObjectType.Warehouse,
          Result: AuditResult.Failed,
          ReferenceType: 'PermissionGuard',
          AfterJson: expect.objectContaining({ Decision: 'Denied', Reason: 'OUT_OF_SCOPE' }),
        }),
      ]),
    );
  });

  it('writes unresolved NULL provenance and returns stable 403 for typed resolver failure', async () => {
    const { resolver, Activate, entries } = buildGuard({
      Action: ActionCode.Read,
      ObjectType: ObjectType.Warehouse,
    });
    resolver.Resolve.mockRejectedValueOnce(new SnapshotResolutionError());
    await expect(Activate(makeContext({ UserId: 'u' }).context)).rejects.toMatchObject({
      Details: { Reason: 'ACTOR_SNAPSHOT_UNAVAILABLE' },
    });
    expect(entries).toEqual([
      expect.objectContaining({
        ActorRoleCodes: null,
        ActorSnapshotStatus: ActorSnapshotStatus.Unresolved,
        AfterJson: expect.objectContaining({ Reason: 'ACTOR_SNAPSHOT_UNAVAILABLE' }),
      }),
    ]);
  });

  it('keeps denied response at 403 when resolved audit append fails', async () => {
    const { audited, Activate } = buildGuard(
      { Action: ActionCode.Read, ObjectType: ObjectType.Warehouse },
      { Allowed: false, Reason: 'PERMISSION_DENIED' },
    );
    audited.Run.mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(Activate(makeContext({ UserId: 'u' }).context)).rejects.toMatchObject({
      Details: { Reason: 'PERMISSION_DENIED' },
    });
    expect(loggerError).toHaveBeenCalledWith(expect.stringContaining('SnapshotStatus=resolved'), expect.any(String));
  });

  it('keeps typed resolution failure at stable 403 when unresolved audit append also fails', async () => {
    const { resolver, audited, Activate, entries } = buildGuard({
      Action: ActionCode.Read,
      ObjectType: ObjectType.Warehouse,
    });
    resolver.Resolve.mockRejectedValueOnce(new SnapshotResolutionError());
    audited.Run.mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(Activate(makeContext({ UserId: 'u' }).context)).rejects.toMatchObject({
      Details: { Reason: 'ACTOR_SNAPSHOT_UNAVAILABLE' },
    });
    expect(entries).toEqual([]);
    expect(loggerError).toHaveBeenCalledWith(expect.stringContaining('SnapshotStatus=unresolved'), expect.any(String));
  });

  it('propagates a generic resolver error without manufacturing unresolved provenance', async () => {
    const { resolver, audited, Activate } = buildGuard({
      Action: ActionCode.Read,
      ObjectType: ObjectType.Warehouse,
    });
    resolver.Resolve.mockRejectedValueOnce(new Error('unexpected resolver defect'));
    await expect(Activate(makeContext({ UserId: 'u' }).context)).rejects.toThrow('unexpected resolver defect');
    expect(audited.Run).not.toHaveBeenCalled();
  });

  it('propagates typed resolver failure on audit-only routes without writing a denied audit', async () => {
    const { resolver, audited, Activate } = buildGuard(undefined, undefined, true);
    resolver.Resolve.mockRejectedValueOnce(new SnapshotResolutionError());
    await expect(Activate(makeContext({ UserId: 'u' }).context)).rejects.toBeInstanceOf(SnapshotResolutionError);
    expect(audited.Run).not.toHaveBeenCalled();
  });

  it('does not swallow generic checker failures or write a false denied row', async () => {
    const { checker, audited, Activate } = buildGuard({
      Action: ActionCode.Read,
      ObjectType: ObjectType.Warehouse,
    });
    checker.Check.mockRejectedValueOnce(new Error('checker infrastructure failed'));
    await expect(Activate(makeContext({ UserId: 'u' }).context)).rejects.toThrow('checker infrastructure failed');
    expect(audited.Run).not.toHaveBeenCalled();
  });

  it('throws ForbiddenAppException when the request has no authenticated user', async () => {
    const { Activate } = buildGuard({ Action: ActionCode.Read, ObjectType: ObjectType.Warehouse });
    await expect(Activate(makeContext(undefined).context)).rejects.toBeInstanceOf(ForbiddenAppException);
  });
});
