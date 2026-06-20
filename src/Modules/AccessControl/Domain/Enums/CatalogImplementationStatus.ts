/**
 * C8 implementation status of a catalog item. `Implemented` = enforcement already shipped
 * in C1-C7; `DeferredToC9` = exception lifecycle (C9); `DeferredV1Plus` = advanced
 * escalation/analytics/manual-fix deferred past V0. AC4: missing required (Implemented /
 * DeferredToC9) item fails V0; `DeferredV1Plus` items are flagged and not counted missing.
 */
export enum CatalogImplementationStatus {
  Implemented = 'IMPLEMENTED',
  DeferredToC9 = 'DEFERRED_TO_C9',
  DeferredV1Plus = 'DEFERRED_V1_PLUS',
}
