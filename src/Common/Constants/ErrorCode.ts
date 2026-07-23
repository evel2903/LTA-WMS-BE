export enum ErrorCode {
  Unknown = 'UNKNOWN',
  Validation = 'VALIDATION',
  NotFound = 'NOT_FOUND',
  Conflict = 'CONFLICT',
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',
  BusinessRule = 'BUSINESS_RULE',
  CatalogVersionUnavailable = 'CATALOG_VERSION_UNAVAILABLE',
  CatalogVersionExhausted = 'CATALOG_VERSION_EXHAUSTED',
  CatalogMetadataRange = 'CATALOG_METADATA_RANGE',
  // RH-04 (RH-ASG-01 / D3) assignment intent ticket protocol wire codes.
  RunIdReused = 'RUN_ID_REUSED',
  IntentActorMismatch = 'INTENT_ACTOR_MISMATCH',
  RoleAlreadyAssigned = 'ROLE_ALREADY_ASSIGNED',
  IntentStale = 'INTENT_STALE',
  VersionExhausted = 'VERSION_EXHAUSTED',
}
