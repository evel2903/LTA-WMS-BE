/**
 * V0 reason-code groups (architecture 6.6). Core groups are used by the foundation
 * (rule override, master-data/config change, hold/release, inventory adjustment,
 * integration, manual fix); business-process groups arrive with V1+ epics.
 */
export enum ReasonGroup {
  RuleOverride = 'RULE_OVERRIDE',
  MasterDataConfigChange = 'MASTER_DATA_CONFIG_CHANGE',
  HoldRelease = 'HOLD_RELEASE',
  InventoryAdjustment = 'INVENTORY_ADJUSTMENT',
  Integration = 'INTEGRATION',
  ManualFix = 'MANUAL_FIX',
}
