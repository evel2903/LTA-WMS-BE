/**
 * Six V0 precedence tiers. Business precedence (resolver, B3):
 * Compliance > Integrity > Physical > Owner/Contract > Operation > Optimization.
 * B2 only stores the tier as data; it does NOT sort by it.
 */
export enum RulePrecedenceTier {
  Compliance = 'COMPLIANCE',
  Integrity = 'INTEGRITY',
  Physical = 'PHYSICAL',
  OwnerContract = 'OWNER_CONTRACT',
  Operation = 'OPERATION',
  Optimization = 'OPTIMIZATION',
}
