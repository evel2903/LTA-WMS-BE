import { ExecutionContext } from '@nestjs/common';
import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { ScopeExtractor } from '@modules/AccessControl/Presentation/Services/ScopeExtractor';
import { RequirePermissionMetadata } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';

const makeContext = (user: unknown): ExecutionContext =>
  ({
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user, body: {}, params: {}, query: {} }) }),
  }) as unknown as ExecutionContext;

const buildGuard = (metadata: RequirePermissionMetadata | undefined, decision?: PermissionDecision) => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(metadata) };
  const checker = { Check: jest.fn().mockResolvedValue(decision ?? { Allowed: true }) };
  const entries: unknown[] = [];
  const audited = {
    Run: jest.fn(async (work: (manager: unknown) => Promise<{ result: unknown; entry: unknown | unknown[] }>) => {
      const { result, entry } = await work({});
      entries.push(...(Array.isArray(entry) ? entry : [entry]));
      return result;
    }),
  };
  const guard = new PermissionGuard(reflector as never, new ScopeExtractor(), checker as never, audited as never);
  return { guard, checker, audited, entries };
};

describe('PermissionGuard', () => {
  it('passes through when no @RequirePermission metadata is present', async () => {
    const { guard, checker } = buildGuard(undefined);
    await expect(guard.canActivate(makeContext({ UserId: 'u' }))).resolves.toBe(true);
    expect(checker.Check).not.toHaveBeenCalled();
  });

  it('allows when the checker allows', async () => {
    const { guard } = buildGuard({ Action: ActionCode.Read, ObjectType: ObjectType.Warehouse }, { Allowed: true });
    await expect(guard.canActivate(makeContext({ UserId: 'u' }))).resolves.toBe(true);
  });

  it('throws ForbiddenAppException with the deny reason when the checker denies', async () => {
    const { guard, audited, entries } = buildGuard(
      { Action: ActionCode.Read, ObjectType: ObjectType.Warehouse },
      { Allowed: false, Reason: 'OUT_OF_SCOPE' },
    );
    await expect(guard.canActivate(makeContext({ UserId: 'u' }))).rejects.toBeInstanceOf(ForbiddenAppException);
    await expect(guard.canActivate(makeContext({ UserId: 'u' }))).rejects.toMatchObject({
      Details: { Reason: 'OUT_OF_SCOPE' },
    });
    expect(audited.Run).toHaveBeenCalled();
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ActorUserId: 'u',
          Action: ActionCode.Read,
          ObjectType: ObjectType.Warehouse,
          Result: AuditResult.Failed,
          ReferenceType: 'PermissionGuard',
          AfterJson: expect.objectContaining({ Decision: 'Denied', Reason: 'OUT_OF_SCOPE' }),
        }),
      ]),
    );
  });

  it('throws ForbiddenAppException when the request has no authenticated user', async () => {
    const { guard } = buildGuard({ Action: ActionCode.Read, ObjectType: ObjectType.Warehouse });
    await expect(guard.canActivate(makeContext(undefined))).rejects.toBeInstanceOf(ForbiddenAppException);
  });
});
