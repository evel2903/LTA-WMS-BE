/**
 * Produces a server-issued, wire-safe optimistic-concurrency token for a real role-row write.
 * JavaScript Date has millisecond precision, so an update must advance at least one millisecond
 * beyond the locked before-image even when the wall clock is equal to or behind that value.
 */
export function NextRoleUpdatedAt(before: Date, serverNow: Date = new Date()): Date {
  return new Date(Math.max(serverNow.getTime(), before.getTime() + 1));
}
