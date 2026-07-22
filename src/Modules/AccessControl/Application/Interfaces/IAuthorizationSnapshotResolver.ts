import { AuthorizationSnapshot } from '@modules/AccessControl/Application/DTOs/AuthorizationSnapshot';

export const AUTHORIZATION_SNAPSHOT_RESOLVER = Symbol('IAuthorizationSnapshotResolver');

export interface IAuthorizationSnapshotResolver {
  Resolve(userId: string): Promise<AuthorizationSnapshot>;
}
