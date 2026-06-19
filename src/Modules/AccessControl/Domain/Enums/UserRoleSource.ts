/**
 * Provenance of a user_roles row. `LegacyBridge` marks rows derived from the
 * pre-RBAC `users.role` varchar; `Manual` marks admin assignments; `Seed` marks
 * fixture data. Lets C5 audit distinguish automatic bridge from deliberate grant.
 */
export enum UserRoleSource {
  Seed = 'SEED',
  LegacyBridge = 'LEGACY_BRIDGE',
  Manual = 'MANUAL',
}
