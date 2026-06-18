export type PolicyConfig = Record<string, unknown>;

export const ProfilePolicyKeys = [
  'CapabilityFlags',
  'StrategyPolicy',
  'ThresholdPolicy',
  'ApprovalPolicy',
  'LabelDevicePolicy',
  'IntegrationPolicy',
  'AuditPolicy',
] as const;

export type ProfilePolicyKey = (typeof ProfilePolicyKeys)[number];

export type ProfilePolicyConfig = Record<ProfilePolicyKey, PolicyConfig>;

export const EmptyProfilePolicyConfig = (): ProfilePolicyConfig => ({
  CapabilityFlags: {},
  StrategyPolicy: {},
  ThresholdPolicy: {},
  ApprovalPolicy: {},
  LabelDevicePolicy: {},
  IntegrationPolicy: {},
  AuditPolicy: {},
});
