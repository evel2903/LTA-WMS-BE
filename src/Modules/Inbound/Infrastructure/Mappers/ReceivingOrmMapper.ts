import { ReceiptEntity } from '@modules/Inbound/Domain/Entities/ReceiptEntity';
import { ReceiptLineEntity } from '@modules/Inbound/Domain/Entities/ReceiptLineEntity';
import { ReceivingSessionEntity } from '@modules/Inbound/Domain/Entities/ReceivingSessionEntity';
import { InboundDiscrepancyEntity } from '@modules/Inbound/Domain/Entities/InboundDiscrepancyEntity';
import { InboundLpnEntity } from '@modules/Inbound/Domain/Entities/InboundLpnEntity';
import { InboundPutawayReleaseEntity } from '@modules/Inbound/Domain/Entities/InboundPutawayReleaseEntity';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { InboundDiscrepancyStatus } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyStatus';
import { InboundDiscrepancyToleranceDecision } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyToleranceDecision';
import { InboundDiscrepancyType } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyType';
import { QcDispositionCode } from '@modules/Inbound/Domain/Enums/QcDispositionCode';
import { QcResultStatus } from '@modules/Inbound/Domain/Enums/QcResultStatus';
import { QcTaskStatus } from '@modules/Inbound/Domain/Enums/QcTaskStatus';
import { QcResultEntity } from '@modules/Inbound/Domain/Entities/QcResultEntity';
import { QcTaskEntity } from '@modules/Inbound/Domain/Entities/QcTaskEntity';
import { ReceiptDocumentStatus } from '@modules/Inbound/Domain/Enums/ReceiptDocumentStatus';
import { ReceiptLineDiscrepancySignal } from '@modules/Inbound/Domain/Enums/ReceiptLineDiscrepancySignal';
import { ReceiptLineStatus } from '@modules/Inbound/Domain/Enums/ReceiptLineStatus';
import { ReceivingSessionStatus } from '@modules/Inbound/Domain/Enums/ReceivingSessionStatus';
import { InboundDiscrepancyOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundDiscrepancyOrmEntity';
import { InboundLpnOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundLpnOrmEntity';
import { InboundPutawayReleaseOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPutawayReleaseOrmEntity';
import { QcResultOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/QcResultOrmEntity';
import { QcTaskOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/QcTaskOrmEntity';
import { ReceiptOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceiptOrmEntity';
import { ReceiptLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceiptLineOrmEntity';
import { ReceivingSessionOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceivingSessionOrmEntity';

export class ReceivingOrmMapper {
  public static ToSessionDomain(entity: ReceivingSessionOrmEntity): ReceivingSessionEntity {
    return new ReceivingSessionEntity({
      Id: entity.Id,
      InboundPlanId: entity.InboundPlanId,
      ReceiptId: entity.ReceiptId,
      SessionKey: entity.SessionKey,
      DeviceCode: entity.DeviceCode,
      OwnerId: entity.OwnerId,
      OwnerCode: entity.OwnerCode,
      WarehouseId: entity.WarehouseId,
      WarehouseCode: entity.WarehouseCode,
      Status: entity.Status as ReceivingSessionStatus,
      StartedAt: entity.StartedAt,
      ClosedAt: entity.ClosedAt,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      StartedBy: entity.StartedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToReceiptDomain(entity: ReceiptOrmEntity): ReceiptEntity {
    return new ReceiptEntity({
      Id: entity.Id,
      InboundPlanId: entity.InboundPlanId,
      ReceiptNumber: entity.ReceiptNumber,
      BusinessReference: entity.BusinessReference,
      OwnerId: entity.OwnerId,
      OwnerCode: entity.OwnerCode,
      WarehouseId: entity.WarehouseId,
      WarehouseCode: entity.WarehouseCode,
      Status: entity.Status as ReceiptDocumentStatus,
      CoreFlowInstanceId: entity.CoreFlowInstanceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToLineDomain(entity: ReceiptLineOrmEntity): ReceiptLineEntity {
    return new ReceiptLineEntity({
      Id: entity.Id,
      ReceiptId: entity.ReceiptId,
      InboundPlanId: entity.InboundPlanId,
      InboundPlanLineId: entity.InboundPlanLineId,
      LineNumber: entity.LineNumber,
      SkuId: entity.SkuId,
      SkuCode: entity.SkuCode,
      UomId: entity.UomId,
      UomCode: entity.UomCode,
      ExpectedQuantity: Number(entity.ExpectedQuantity),
      ActualQuantity: Number(entity.ActualQuantity),
      Status: entity.Status as ReceiptLineStatus,
      ManualConfirm: entity.ManualConfirm,
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      ScanEvidenceJson: entity.ScanEvidenceJson,
      DiscrepancySignals: (entity.DiscrepancySignals ?? []) as ReceiptLineDiscrepancySignal[],
      IdempotencyKey: entity.IdempotencyKey,
      ReceivedAt: entity.ReceivedAt,
      ReceivedBy: entity.ReceivedBy,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
    });
  }

  public static ToDiscrepancyDomain(entity: InboundDiscrepancyOrmEntity): InboundDiscrepancyEntity {
    return new InboundDiscrepancyEntity({
      Id: entity.Id,
      ReceiptId: entity.ReceiptId,
      ReceiptLineId: entity.ReceiptLineId,
      InboundPlanId: entity.InboundPlanId,
      InboundPlanLineId: entity.InboundPlanLineId,
      OwnerId: entity.OwnerId,
      OwnerCode: entity.OwnerCode,
      WarehouseId: entity.WarehouseId,
      WarehouseCode: entity.WarehouseCode,
      DiscrepancyType: entity.DiscrepancyType as InboundDiscrepancyType,
      Signals: (entity.Signals ?? []) as ReceiptLineDiscrepancySignal[],
      Status: entity.Status as InboundDiscrepancyStatus,
      Severity: entity.Severity as ControlExceptionSeverity,
      ToleranceDecision: entity.ToleranceDecision as InboundDiscrepancyToleranceDecision,
      ExpectedQuantity: Number(entity.ExpectedQuantity),
      ActualQuantity: Number(entity.ActualQuantity),
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs ?? [],
      EvidenceJson: entity.EvidenceJson,
      RuleCode: entity.RuleCode,
      ExceptionCaseId: entity.ExceptionCaseId,
      ExceptionState: entity.ExceptionState as ExceptionState,
      IdempotencyKey: entity.IdempotencyKey,
      RecordedAt: entity.RecordedAt,
      RecordedBy: entity.RecordedBy,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
    });
  }

  public static ToInboundLpnDomain(entity: InboundLpnOrmEntity): InboundLpnEntity {
    return new InboundLpnEntity({
      Id: entity.Id,
      ReceiptId: entity.ReceiptId,
      ReceiptLineId: entity.ReceiptLineId,
      InboundPlanId: entity.InboundPlanId,
      InboundPlanLineId: entity.InboundPlanLineId,
      OwnerId: entity.OwnerId,
      OwnerCode: entity.OwnerCode,
      WarehouseId: entity.WarehouseId,
      WarehouseCode: entity.WarehouseCode,
      SkuId: entity.SkuId,
      SkuCode: entity.SkuCode,
      UomId: entity.UomId,
      UomCode: entity.UomCode,
      Quantity: Number(entity.Quantity),
      LpnCode: entity.LpnCode,
      SsccCode: entity.SsccCode,
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs ?? [],
      IdempotencyKey: entity.IdempotencyKey,
      ConfirmedAt: entity.ConfirmedAt,
      ConfirmedBy: entity.ConfirmedBy,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
    });
  }

  public static ToInboundPutawayReleaseDomain(entity: InboundPutawayReleaseOrmEntity): InboundPutawayReleaseEntity {
    return new InboundPutawayReleaseEntity({
      Id: entity.Id,
      InboundLpnId: entity.InboundLpnId,
      ReceiptId: entity.ReceiptId,
      ReceiptLineId: entity.ReceiptLineId,
      InboundPlanId: entity.InboundPlanId,
      InboundPlanLineId: entity.InboundPlanLineId,
      OwnerId: entity.OwnerId,
      OwnerCode: entity.OwnerCode,
      WarehouseId: entity.WarehouseId,
      WarehouseCode: entity.WarehouseCode,
      SkuId: entity.SkuId,
      SkuCode: entity.SkuCode,
      UomId: entity.UomId,
      UomCode: entity.UomCode,
      Quantity: Number(entity.Quantity),
      LpnCode: entity.LpnCode,
      SsccCode: entity.SsccCode,
      InventoryStatusCode: entity.InventoryStatusCode,
      CurrentLocationId: entity.CurrentLocationId,
      CurrentLocationCode: entity.CurrentLocationCode,
      WarehouseProfileId: entity.WarehouseProfileId,
      LabelDecision: entity.LabelDecision,
      LabelReason: entity.LabelReason,
      MatchedPrintJobId: entity.MatchedPrintJobId,
      ConstraintJson: entity.ConstraintJson,
      RuleCode: entity.RuleCode,
      OutboxMessageId: entity.OutboxMessageId,
      CoreFlowMilestoneId: entity.CoreFlowMilestoneId,
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs ?? [],
      IdempotencyKey: entity.IdempotencyKey,
      ReleasedAt: entity.ReleasedAt,
      ReleasedBy: entity.ReleasedBy,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
    });
  }

  public static ToQcTaskDomain(entity: QcTaskOrmEntity): QcTaskEntity {
    return new QcTaskEntity({
      Id: entity.Id,
      ReceiptId: entity.ReceiptId,
      ReceiptLineId: entity.ReceiptLineId,
      InboundPlanId: entity.InboundPlanId,
      InboundPlanLineId: entity.InboundPlanLineId,
      OwnerId: entity.OwnerId,
      OwnerCode: entity.OwnerCode,
      WarehouseId: entity.WarehouseId,
      WarehouseCode: entity.WarehouseCode,
      SkuId: entity.SkuId,
      SkuCode: entity.SkuCode,
      UomId: entity.UomId,
      UomCode: entity.UomCode,
      ActualQuantity: Number(entity.ActualQuantity),
      TaskStatus: entity.TaskStatus as QcTaskStatus,
      Required: entity.Required,
      TriggerReason: entity.TriggerReason,
      TriggerPolicyJson: entity.TriggerPolicyJson,
      SamplingPercent: entity.SamplingPercent !== null ? Number(entity.SamplingPercent) : null,
      InventoryStatusCode: entity.InventoryStatusCode,
      TargetInventoryStatusCode: entity.TargetInventoryStatusCode,
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs ?? [],
      IdempotencyKey: entity.IdempotencyKey,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
    });
  }

  public static ToQcResultDomain(entity: QcResultOrmEntity): QcResultEntity {
    return new QcResultEntity({
      Id: entity.Id,
      QcTaskId: entity.QcTaskId,
      ReceiptId: entity.ReceiptId,
      ReceiptLineId: entity.ReceiptLineId,
      InboundPlanId: entity.InboundPlanId,
      InboundPlanLineId: entity.InboundPlanLineId,
      OwnerId: entity.OwnerId,
      OwnerCode: entity.OwnerCode,
      WarehouseId: entity.WarehouseId,
      WarehouseCode: entity.WarehouseCode,
      ResultStatus: entity.ResultStatus as QcResultStatus,
      DispositionCode: entity.DispositionCode as QcDispositionCode,
      InspectedQuantity: Number(entity.InspectedQuantity),
      AcceptedQuantity: Number(entity.AcceptedQuantity),
      RejectedQuantity: Number(entity.RejectedQuantity),
      AcceptedInventoryStatusCode: entity.AcceptedInventoryStatusCode,
      RejectedInventoryStatusCode: entity.RejectedInventoryStatusCode,
      TargetInventoryStatusCode: entity.TargetInventoryStatusCode,
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs ?? [],
      EvidenceJson: entity.EvidenceJson,
      IdempotencyKey: entity.IdempotencyKey,
      RecordedAt: entity.RecordedAt,
      RecordedBy: entity.RecordedBy,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
    });
  }

  public static ToSessionOrm(entity: ReceivingSessionEntity): ReceivingSessionOrmEntity {
    const orm = new ReceivingSessionOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }

  public static ToReceiptOrm(entity: ReceiptEntity): ReceiptOrmEntity {
    const orm = new ReceiptOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }

  public static ToLineOrm(entity: ReceiptLineEntity): ReceiptLineOrmEntity {
    const orm = new ReceiptLineOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }

  public static ToDiscrepancyOrm(entity: InboundDiscrepancyEntity): InboundDiscrepancyOrmEntity {
    const orm = new InboundDiscrepancyOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }

  public static ToInboundLpnOrm(entity: InboundLpnEntity): InboundLpnOrmEntity {
    const orm = new InboundLpnOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }

  public static ToInboundPutawayReleaseOrm(entity: InboundPutawayReleaseEntity): InboundPutawayReleaseOrmEntity {
    const orm = new InboundPutawayReleaseOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }

  public static ToQcTaskOrm(entity: QcTaskEntity): QcTaskOrmEntity {
    const orm = new QcTaskOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }

  public static ToQcResultOrm(entity: QcResultEntity): QcResultOrmEntity {
    const orm = new QcResultOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }
}
