import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';

/**
 * Central exception lifecycle state machine (architecture 6.8 / story C9 AC2). The legal-edge
 * table is the single source of truth for transitions; every use case routes its transition
 * through `AssertTransition`, so an illegal edge always fails with the stable error code
 * `INVALID_EXCEPTION_TRANSITION` (never a silent no-op). V0 is the linear 6-state path; the
 * doc-09 branches are carried on sub_status/outcome, not as extra edges.
 */
export const LEGAL_EDGES: Readonly<Record<ExceptionState, ReadonlyArray<ExceptionState>>> = {
  [ExceptionState.Detected]: [ExceptionState.Logged],
  [ExceptionState.Logged]: [ExceptionState.Assigned],
  [ExceptionState.Assigned]: [ExceptionState.InReviewPendingApproval],
  [ExceptionState.InReviewPendingApproval]: [ExceptionState.Resolved],
  [ExceptionState.Resolved]: [ExceptionState.Closed],
  [ExceptionState.Closed]: [],
};

export class ExceptionStateMachine {
  /** True when `to` is a legal next state from `from`. */
  public static CanTransition(from: ExceptionState, to: ExceptionState): boolean {
    return LEGAL_EDGES[from].includes(to);
  }

  /**
   * Throws `BusinessRuleException('INVALID_EXCEPTION_TRANSITION ...')` (stable code) when the
   * edge is not in the legal-edge table. AC2.
   */
  public static AssertTransition(from: ExceptionState, to: ExceptionState): void {
    if (!ExceptionStateMachine.CanTransition(from, to)) {
      throw new BusinessRuleException(`INVALID_EXCEPTION_TRANSITION: ${from} -> ${to}`, {
        Reason: 'INVALID_EXCEPTION_TRANSITION',
        From: from,
        To: to,
      });
    }
  }
}
