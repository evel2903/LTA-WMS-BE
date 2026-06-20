/**
 * C8 action the system takes / allows for a control exception (doc 09). Reference data
 * consumed by C9 when raising/resolving an exception.
 */
export enum ControlExceptionAction {
  Block = 'BLOCK',
  RouteToOtherApprover = 'ROUTE_TO_OTHER_APPROVER',
  Escalate = 'ESCALATE',
  Warn = 'WARN',
  RequireVersionAudit = 'REQUIRE_VERSION_AUDIT',
  RequireSpecialApproval = 'REQUIRE_SPECIAL_APPROVAL',
}
