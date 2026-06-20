/**
 * C8 control-exception categories (doc 09 CTRL-EX-01..09). Each scenario in the
 * control-exception catalog is classified so C9 (exception lifecycle) can branch on it.
 */
export enum ControlExceptionCategory {
  AuthorizationDenied = 'AUTHORIZATION_DENIED',
  DataScopeViolation = 'DATA_SCOPE_VIOLATION',
  SegregationOfDuties = 'SEGREGATION_OF_DUTIES',
  ExceptionClosure = 'EXCEPTION_CLOSURE',
  ComplianceOverride = 'COMPLIANCE_OVERRIDE',
  ApprovalTimeout = 'APPROVAL_TIMEOUT',
  OverrideFrequency = 'OVERRIDE_FREQUENCY',
  ConfigVersioning = 'CONFIG_VERSIONING',
  ManualDataFix = 'MANUAL_DATA_FIX',
}
