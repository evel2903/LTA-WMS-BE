import 'reflect-metadata';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuthorizationSnapshot } from '@modules/AccessControl/Application/DTOs/AuthorizationSnapshot';
import { SnapshotResolutionError } from '@modules/AccessControl/Application/Errors/SnapshotResolutionError';
import { ActorSnapshotStatus } from '@modules/AccessControl/Domain/Enums/ActorSnapshotStatus';
import {
  BuildCurrentAuditContext,
  CURRENT_AUDIT_CONTEXT_KEY,
  CurrentAuditContext,
} from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';

const snapshot: AuthorizationSnapshot = {
  UserId: 'actor-1',
  ActiveRoles: [{ Id: 'role-1', RoleCode: 'CUSTOM_AUDITOR' }],
  Permissions: [],
  DataScopes: [],
};

class DecoratedController {
  public Handle(@CurrentAuditContext() context: AuditContext): void {
    void context;
  }
}

describe('CurrentAuditContext', () => {
  it('uses the resolved request snapshot and ignores the JWT legacy role', () => {
    const context = BuildCurrentAuditContext({
      user: { UserId: 'actor-1', Role: 'Admin' },
      AuthorizationSnapshot: snapshot,
      correlationId: 'corr-1',
      requestId: 'req-1',
      headers: {},
    });
    expect(context.ActorRoleCodes).toEqual(['CUSTOM_AUDITOR']);
    expect(context.ActorSnapshotStatus).toBe(ActorSnapshotStatus.Resolved);
  });

  it('fails closed instead of falling back when an authenticated audit route lacks a snapshot', () => {
    expect(() => BuildCurrentAuditContext({ user: { UserId: 'actor-1', Role: 'Admin' }, headers: {} })).toThrow(
      SnapshotResolutionError,
    );
  });

  it('marks the route so PermissionGuard resolves an audit-only snapshot', () => {
    expect(Reflect.getMetadata(CURRENT_AUDIT_CONTEXT_KEY, DecoratedController, 'Handle')).toBe(true);
  });

  it('keeps JwtAuthGuard before PermissionGuard on every controller using the decorator', () => {
    const walk = (directory: string): string[] =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? walk(path) : entry.name.endsWith('Controller.ts') ? [path] : [];
      });
    const consumers = walk(join(process.cwd(), 'src', 'Modules')).filter((path) =>
      /@CurrentAuditContext\s*\(/.test(readFileSync(path, 'utf8')),
    );

    expect(consumers.length).toBeGreaterThan(0);
    for (const path of consumers) {
      expect(readFileSync(path, 'utf8')).toMatch(/@UseGuards\(JwtAuthGuard,\s*PermissionGuard\)/);
    }
  });
});
