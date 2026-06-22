import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';

export type CoreFlowStepDefinition = {
  StepCode: CoreFlowStepCode;
  StageCode: CoreFlowStageCode;
  Sequence: number;
  RequiredByDefault: boolean;
};

export const CORE_FLOW_STEP_DEFINITIONS: ReadonlyArray<CoreFlowStepDefinition> = [
  {
    StepCode: CoreFlowStepCode.SourceDocumentReceived,
    StageCode: CoreFlowStageCode.Inbound,
    Sequence: 1,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.GateInRecorded,
    StageCode: CoreFlowStageCode.Inbound,
    Sequence: 2,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.ReceiptLineReceived,
    StageCode: CoreFlowStageCode.Inbound,
    Sequence: 3,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.DiscrepancyRecorded,
    StageCode: CoreFlowStageCode.Inbound,
    Sequence: 4,
    RequiredByDefault: false,
  },
  {
    StepCode: CoreFlowStepCode.QcCompleted,
    StageCode: CoreFlowStageCode.Inbound,
    Sequence: 5,
    RequiredByDefault: false,
  },
  {
    StepCode: CoreFlowStepCode.LpnConfirmed,
    StageCode: CoreFlowStageCode.Inbound,
    Sequence: 6,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.InboundReleasedToPutaway,
    StageCode: CoreFlowStageCode.Inbound,
    Sequence: 7,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.PutawayTaskReleased,
    StageCode: CoreFlowStageCode.Storage,
    Sequence: 8,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.PutawayConfirmed,
    StageCode: CoreFlowStageCode.Storage,
    Sequence: 9,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.InventoryStatusChanged,
    StageCode: CoreFlowStageCode.Storage,
    Sequence: 10,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.CycleCountSubmitted,
    StageCode: CoreFlowStageCode.Storage,
    Sequence: 11,
    RequiredByDefault: false,
  },
  {
    StepCode: CoreFlowStepCode.ReplenishmentReleased,
    StageCode: CoreFlowStageCode.Storage,
    Sequence: 12,
    RequiredByDefault: false,
  },
  {
    StepCode: CoreFlowStepCode.OutboundOrderReceived,
    StageCode: CoreFlowStageCode.Outbound,
    Sequence: 13,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.AllocationCompleted,
    StageCode: CoreFlowStageCode.Outbound,
    Sequence: 14,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.ReleasedToWarehouse,
    StageCode: CoreFlowStageCode.Outbound,
    Sequence: 15,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.PickConfirmed,
    StageCode: CoreFlowStageCode.Outbound,
    Sequence: 16,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.PackagePacked,
    StageCode: CoreFlowStageCode.Outbound,
    Sequence: 17,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.PackageReadyForStaging,
    StageCode: CoreFlowStageCode.Outbound,
    Sequence: 18,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.PackageStaged,
    StageCode: CoreFlowStageCode.Shipping,
    Sequence: 19,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.DockTruckMilestoneRecorded,
    StageCode: CoreFlowStageCode.Shipping,
    Sequence: 20,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.LoadingConfirmed,
    StageCode: CoreFlowStageCode.Shipping,
    Sequence: 21,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.GateOutRecorded,
    StageCode: CoreFlowStageCode.Shipping,
    Sequence: 22,
    RequiredByDefault: true,
  },
  {
    StepCode: CoreFlowStepCode.GoodsIssuePosted,
    StageCode: CoreFlowStageCode.Shipping,
    Sequence: 23,
    RequiredByDefault: true,
  },
];

export const CORE_FLOW_STAGE_ORDER: ReadonlyArray<CoreFlowStageCode> = [
  CoreFlowStageCode.Inbound,
  CoreFlowStageCode.Storage,
  CoreFlowStageCode.Outbound,
  CoreFlowStageCode.Shipping,
];

export const CORE_FLOW_STAGE_COMPLETION_STEPS: Record<CoreFlowStageCode, CoreFlowStepCode> = {
  [CoreFlowStageCode.Inbound]: CoreFlowStepCode.InboundReleasedToPutaway,
  [CoreFlowStageCode.Storage]: CoreFlowStepCode.PutawayConfirmed,
  [CoreFlowStageCode.Outbound]: CoreFlowStepCode.PackageReadyForStaging,
  [CoreFlowStageCode.Shipping]: CoreFlowStepCode.GoodsIssuePosted,
};

export const FORBIDDEN_INVENTORY_STATUS_MILESTONES = ['SHIPPED', 'GATE_OUT', 'GOODS_ISSUE_POSTED'] as const;
