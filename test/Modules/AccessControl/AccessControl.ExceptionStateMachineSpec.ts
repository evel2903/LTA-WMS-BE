import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ExceptionStateMachine, LEGAL_EDGES } from '@modules/AccessControl/Application/Services/ExceptionStateMachine';

/**
 * AC2 — the central state machine is the single source of truth for transitions. Always-run
 * (no DB): asserts every legal edge passes and every illegal edge fails with the stable code
 * INVALID_EXCEPTION_TRANSITION (never a silent no-op).
 */
describe('ExceptionStateMachine (C9 AC2)', () => {
  const allStates = Object.values(ExceptionState);

  const legalPairs: ReadonlyArray<[ExceptionState, ExceptionState]> = [
    [ExceptionState.Detected, ExceptionState.Logged],
    [ExceptionState.Logged, ExceptionState.Assigned],
    [ExceptionState.Assigned, ExceptionState.InReviewPendingApproval],
    [ExceptionState.InReviewPendingApproval, ExceptionState.Resolved],
    [ExceptionState.Resolved, ExceptionState.Closed],
  ];

  it.each(legalPairs)('allows the legal edge %s -> %s', (from, to) => {
    expect(ExceptionStateMachine.CanTransition(from, to)).toBe(true);
    expect(() => ExceptionStateMachine.AssertTransition(from, to)).not.toThrow();
  });

  it('rejects EVERY edge not in the legal-edge table with INVALID_EXCEPTION_TRANSITION', () => {
    const legalSet = new Set(legalPairs.map(([from, to]) => `${from}->${to}`));
    let illegalChecked = 0;
    for (const from of allStates) {
      for (const to of allStates) {
        if (legalSet.has(`${from}->${to}`)) continue;
        illegalChecked += 1;
        let caught: unknown;
        try {
          ExceptionStateMachine.AssertTransition(from, to);
        } catch (error) {
          caught = error;
        }
        expect(caught).toBeInstanceOf(BusinessRuleException);
        expect((caught as BusinessRuleException).message).toContain('INVALID_EXCEPTION_TRANSITION');
        expect((caught as BusinessRuleException).Details).toMatchObject({ Reason: 'INVALID_EXCEPTION_TRANSITION' });
      }
    }
    // 6 states * 6 states = 36 pairs minus 5 legal edges = 31 illegal edges (incl. self-loops + backward).
    expect(illegalChecked).toBe(31);
  });

  it('blocks backward and skip transitions explicitly', () => {
    expect(() => ExceptionStateMachine.AssertTransition(ExceptionState.Logged, ExceptionState.Detected)).toThrow(
      BusinessRuleException,
    );
    expect(() => ExceptionStateMachine.AssertTransition(ExceptionState.Detected, ExceptionState.Resolved)).toThrow(
      BusinessRuleException,
    );
    expect(() => ExceptionStateMachine.AssertTransition(ExceptionState.Closed, ExceptionState.Resolved)).toThrow(
      BusinessRuleException,
    );
  });

  it('CLOSED is terminal (no outgoing legal edges)', () => {
    expect(LEGAL_EDGES[ExceptionState.Closed]).toEqual([]);
  });
});
