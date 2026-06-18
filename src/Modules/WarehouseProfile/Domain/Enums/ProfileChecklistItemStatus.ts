/**
 * Per-item verdict of the B7 warehouse-profile checklist.
 *
 * - Pass: item meets the V0 operating condition (catalog + control mode are sufficient).
 * - Fail: a V0 invariant is violated (blocks acceptance/activation).
 * - Warning: a non-blocking deviation worth attention that does not break an invariant.
 * - Deferred: a V1+/Epic-C capability that V0 does not yet evaluate (always carries DeferredToStory).
 */
export enum ProfileChecklistItemStatus {
  Pass = 'PASS',
  Fail = 'FAIL',
  Warning = 'WARNING',
  Deferred = 'DEFERRED',
}
