import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { AuthorizationSnapshot } from '@modules/AccessControl/Application/DTOs/AuthorizationSnapshot';
import { SnapshotResolutionError } from '@modules/AccessControl/Application/Errors/SnapshotResolutionError';

interface AuthorizationSnapshotStore {
  ActorUserId?: string;
  Pending: Map<string, Promise<AuthorizationSnapshot>>;
  Resolved: Map<string, AuthorizationSnapshot>;
}

/** Request-local resolve-once storage shared by guard, checker and audit decorator. */
@Injectable()
export class AuthorizationSnapshotContext {
  private readonly storage = new AsyncLocalStorage<AuthorizationSnapshotStore>();

  public Run<T>(work: () => T): T {
    return this.storage.run({ Pending: new Map(), Resolved: new Map() }, work);
  }

  public async Resolve(userId: string, factory: () => Promise<AuthorizationSnapshot>): Promise<AuthorizationSnapshot> {
    const store = this.storage.getStore();
    const resolveBoundActor = async (): Promise<AuthorizationSnapshot> => {
      const snapshot = await factory();
      if (snapshot.UserId !== userId) throw new SnapshotResolutionError();
      return snapshot;
    };
    if (!store) return await resolveBoundActor();

    const existing = store.Pending.get(userId);
    if (existing) return await existing;

    const pending = resolveBoundActor().then((snapshot) => {
      store.Resolved.set(userId, snapshot);
      return snapshot;
    });
    store.Pending.set(userId, pending);
    return await pending;
  }

  public Get(userId: string): AuthorizationSnapshot | undefined {
    const snapshot = this.storage.getStore()?.Resolved.get(userId);
    return snapshot?.UserId === userId ? snapshot : undefined;
  }

  public BindActor(userId: string): void {
    const store = this.storage.getStore();
    if (!store) return;
    if (store.ActorUserId && store.ActorUserId !== userId) throw new SnapshotResolutionError();
    store.ActorUserId = userId;
  }

  public IsActor(userId: string): boolean {
    return this.storage.getStore()?.ActorUserId === userId;
  }
}
