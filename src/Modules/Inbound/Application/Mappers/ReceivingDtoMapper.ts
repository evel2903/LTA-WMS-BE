import {
  InboundDiscrepancyDto,
  InboundLpnDto,
  InboundPutawayReleaseDto,
  QcResultDto,
  QcTaskDto,
  ReceiptDto,
  ReceiptLineDto,
  ReceivingSessionDto,
} from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { InboundDiscrepancyEntity } from '@modules/Inbound/Domain/Entities/InboundDiscrepancyEntity';
import { InboundLpnEntity } from '@modules/Inbound/Domain/Entities/InboundLpnEntity';
import { InboundPutawayReleaseEntity } from '@modules/Inbound/Domain/Entities/InboundPutawayReleaseEntity';
import { QcResultEntity } from '@modules/Inbound/Domain/Entities/QcResultEntity';
import { QcTaskEntity } from '@modules/Inbound/Domain/Entities/QcTaskEntity';
import { QcTaskStatus } from '@modules/Inbound/Domain/Enums/QcTaskStatus';
import { ReceiptEntity } from '@modules/Inbound/Domain/Entities/ReceiptEntity';
import { ReceiptLineEntity } from '@modules/Inbound/Domain/Entities/ReceiptLineEntity';
import { ReceivingSessionEntity } from '@modules/Inbound/Domain/Entities/ReceivingSessionEntity';

export class ReceivingDtoMapper {
  public static ToSessionDto(
    session: ReceivingSessionEntity,
    receipt: ReceiptEntity,
    isDuplicate = false,
  ): ReceivingSessionDto {
    return {
      Id: session.Id,
      InboundPlanId: session.InboundPlanId,
      ReceiptId: session.ReceiptId,
      ReceiptNumber: receipt.ReceiptNumber,
      SessionKey: session.SessionKey,
      DeviceCode: session.DeviceCode,
      OwnerId: session.OwnerId,
      OwnerCode: session.OwnerCode,
      WarehouseId: session.WarehouseId,
      WarehouseCode: session.WarehouseCode,
      Status: session.Status,
      StartedAt: session.StartedAt,
      ClosedAt: session.ClosedAt,
      IsDuplicate: isDuplicate,
      CreatedAt: session.CreatedAt,
      UpdatedAt: session.UpdatedAt,
      StartedBy: session.StartedBy,
      UpdatedBy: session.UpdatedBy,
    };
  }

  public static ToReceiptDto(receipt: ReceiptEntity): ReceiptDto {
    return {
      Id: receipt.Id,
      InboundPlanId: receipt.InboundPlanId,
      ReceiptNumber: receipt.ReceiptNumber,
      BusinessReference: receipt.BusinessReference,
      OwnerId: receipt.OwnerId,
      OwnerCode: receipt.OwnerCode,
      WarehouseId: receipt.WarehouseId,
      WarehouseCode: receipt.WarehouseCode,
      Status: receipt.Status,
      CoreFlowInstanceId: receipt.CoreFlowInstanceId,
      CreatedAt: receipt.CreatedAt,
      UpdatedAt: receipt.UpdatedAt,
      CreatedBy: receipt.CreatedBy,
      UpdatedBy: receipt.UpdatedBy,
    };
  }

  public static ToLineDto(line: ReceiptLineEntity, isDuplicate = false): ReceiptLineDto {
    return {
      Id: line.Id,
      ReceiptId: line.ReceiptId,
      InboundPlanId: line.InboundPlanId,
      InboundPlanLineId: line.InboundPlanLineId,
      LineNumber: line.LineNumber,
      SkuId: line.SkuId,
      SkuCode: line.SkuCode,
      UomId: line.UomId,
      UomCode: line.UomCode,
      ExpectedQuantity: line.ExpectedQuantity,
      ActualQuantity: line.ActualQuantity,
      Status: line.Status,
      ManualConfirm: line.ManualConfirm,
      ReasonCode: line.ReasonCode,
      ReasonCodeId: line.ReasonCodeId,
      ReasonNote: line.ReasonNote,
      ScanEvidenceJson: line.ScanEvidenceJson,
      DiscrepancySignals: line.DiscrepancySignals,
      IdempotencyKey: line.IdempotencyKey,
      ReceivedAt: line.ReceivedAt,
      ReceivedBy: line.ReceivedBy,
      IsDuplicate: isDuplicate,
      CreatedAt: line.CreatedAt,
      UpdatedAt: line.UpdatedAt,
    };
  }

  public static ToDiscrepancyDto(discrepancy: InboundDiscrepancyEntity, isDuplicate = false): InboundDiscrepancyDto {
    return {
      Id: discrepancy.Id,
      ReceiptId: discrepancy.ReceiptId,
      ReceiptLineId: discrepancy.ReceiptLineId,
      InboundPlanId: discrepancy.InboundPlanId,
      InboundPlanLineId: discrepancy.InboundPlanLineId,
      OwnerId: discrepancy.OwnerId,
      OwnerCode: discrepancy.OwnerCode,
      WarehouseId: discrepancy.WarehouseId,
      WarehouseCode: discrepancy.WarehouseCode,
      DiscrepancyType: discrepancy.DiscrepancyType,
      Signals: discrepancy.Signals,
      Status: discrepancy.Status,
      Severity: discrepancy.Severity,
      ToleranceDecision: discrepancy.ToleranceDecision,
      ExpectedQuantity: discrepancy.ExpectedQuantity,
      ActualQuantity: discrepancy.ActualQuantity,
      ReasonCode: discrepancy.ReasonCode,
      ReasonCodeId: discrepancy.ReasonCodeId,
      ReasonNote: discrepancy.ReasonNote,
      EvidenceRefs: discrepancy.EvidenceRefs,
      EvidenceJson: discrepancy.EvidenceJson,
      ExceptionCaseId: discrepancy.ExceptionCaseId,
      ExceptionState: discrepancy.ExceptionState,
      IdempotencyKey: discrepancy.IdempotencyKey,
      RecordedAt: discrepancy.RecordedAt,
      RecordedBy: discrepancy.RecordedBy,
      IsDuplicate: isDuplicate,
      CreatedAt: discrepancy.CreatedAt,
      UpdatedAt: discrepancy.UpdatedAt,
    };
  }

  public static ToInboundLpnDto(lpn: InboundLpnEntity, isDuplicate = false): InboundLpnDto {
    return {
      Id: lpn.Id,
      ReceiptId: lpn.ReceiptId,
      ReceiptLineId: lpn.ReceiptLineId,
      InboundPlanId: lpn.InboundPlanId,
      InboundPlanLineId: lpn.InboundPlanLineId,
      OwnerId: lpn.OwnerId,
      OwnerCode: lpn.OwnerCode,
      WarehouseId: lpn.WarehouseId,
      WarehouseCode: lpn.WarehouseCode,
      SkuId: lpn.SkuId,
      SkuCode: lpn.SkuCode,
      UomId: lpn.UomId,
      UomCode: lpn.UomCode,
      Quantity: lpn.Quantity,
      LpnCode: lpn.LpnCode,
      SsccCode: lpn.SsccCode,
      ReasonCode: lpn.ReasonCode,
      ReasonCodeId: lpn.ReasonCodeId,
      ReasonNote: lpn.ReasonNote,
      EvidenceRefs: lpn.EvidenceRefs,
      IdempotencyKey: lpn.IdempotencyKey,
      ConfirmedAt: lpn.ConfirmedAt,
      ConfirmedBy: lpn.ConfirmedBy,
      IsDuplicate: isDuplicate,
      CreatedAt: lpn.CreatedAt,
      UpdatedAt: lpn.UpdatedAt,
    };
  }

  public static ToInboundPutawayReleaseDto(
    release: InboundPutawayReleaseEntity,
    isDuplicate = false,
  ): InboundPutawayReleaseDto {
    return {
      Id: release.Id,
      InboundLpnId: release.InboundLpnId,
      ReceiptId: release.ReceiptId,
      ReceiptLineId: release.ReceiptLineId,
      InboundPlanId: release.InboundPlanId,
      InboundPlanLineId: release.InboundPlanLineId,
      OwnerId: release.OwnerId,
      OwnerCode: release.OwnerCode,
      WarehouseId: release.WarehouseId,
      WarehouseCode: release.WarehouseCode,
      SkuId: release.SkuId,
      SkuCode: release.SkuCode,
      UomId: release.UomId,
      UomCode: release.UomCode,
      Quantity: release.Quantity,
      LpnCode: release.LpnCode,
      SsccCode: release.SsccCode,
      InventoryStatusCode: release.InventoryStatusCode,
      CurrentLocationId: release.CurrentLocationId,
      CurrentLocationCode: release.CurrentLocationCode,
      WarehouseProfileId: release.WarehouseProfileId,
      LabelDecision: release.LabelDecision,
      LabelReason: release.LabelReason,
      MatchedPrintJobId: release.MatchedPrintJobId,
      ConstraintJson: release.ConstraintJson,
      OutboxMessageId: release.OutboxMessageId,
      CoreFlowMilestoneId: release.CoreFlowMilestoneId,
      ReasonCode: release.ReasonCode,
      ReasonCodeId: release.ReasonCodeId,
      ReasonNote: release.ReasonNote,
      EvidenceRefs: release.EvidenceRefs,
      IdempotencyKey: release.IdempotencyKey,
      ReleasedAt: release.ReleasedAt,
      ReleasedBy: release.ReleasedBy,
      IsDuplicate: isDuplicate,
      CreatedAt: release.CreatedAt,
      UpdatedAt: release.UpdatedAt,
    };
  }

  public static ToQcTaskDto(task: QcTaskEntity, isDuplicate = false): QcTaskDto {
    return {
      Id: task.Id,
      ReceiptId: task.ReceiptId,
      ReceiptLineId: task.ReceiptLineId,
      InboundPlanId: task.InboundPlanId,
      InboundPlanLineId: task.InboundPlanLineId,
      OwnerId: task.OwnerId,
      OwnerCode: task.OwnerCode,
      WarehouseId: task.WarehouseId,
      WarehouseCode: task.WarehouseCode,
      SkuId: task.SkuId,
      SkuCode: task.SkuCode,
      UomId: task.UomId,
      UomCode: task.UomCode,
      ActualQuantity: task.ActualQuantity,
      TaskStatus: task.TaskStatus,
      Required: task.Required,
      TriggerReason: task.TriggerReason,
      TriggerPolicyJson: task.TriggerPolicyJson,
      InventoryStatusCode: task.InventoryStatusCode,
      TargetInventoryStatusCode: task.TargetInventoryStatusCode,
      ReasonCode: task.ReasonCode,
      ReasonCodeId: task.ReasonCodeId,
      ReasonNote: task.ReasonNote,
      EvidenceRefs: task.EvidenceRefs,
      IdempotencyKey: task.IdempotencyKey,
      IsDuplicate: isDuplicate,
      CreatedBy: task.CreatedBy,
      UpdatedBy: task.UpdatedBy,
      CreatedAt: task.CreatedAt,
      UpdatedAt: task.UpdatedAt,
    };
  }

  public static ToQcResultDto(result: QcResultEntity, taskStatus: QcTaskStatus, isDuplicate = false): QcResultDto {
    return {
      Id: result.Id,
      QcTaskId: result.QcTaskId,
      ReceiptId: result.ReceiptId,
      ReceiptLineId: result.ReceiptLineId,
      InboundPlanId: result.InboundPlanId,
      InboundPlanLineId: result.InboundPlanLineId,
      OwnerId: result.OwnerId,
      OwnerCode: result.OwnerCode,
      WarehouseId: result.WarehouseId,
      WarehouseCode: result.WarehouseCode,
      ResultStatus: result.ResultStatus,
      DispositionCode: result.DispositionCode,
      TaskStatus: taskStatus,
      InspectedQuantity: result.InspectedQuantity,
      AcceptedQuantity: result.AcceptedQuantity,
      RejectedQuantity: result.RejectedQuantity,
      AcceptedInventoryStatusCode: result.AcceptedInventoryStatusCode,
      RejectedInventoryStatusCode: result.RejectedInventoryStatusCode,
      TargetInventoryStatusCode: result.TargetInventoryStatusCode,
      ReasonCode: result.ReasonCode,
      ReasonCodeId: result.ReasonCodeId,
      ReasonNote: result.ReasonNote,
      EvidenceRefs: result.EvidenceRefs,
      EvidenceJson: result.EvidenceJson,
      IdempotencyKey: result.IdempotencyKey,
      RecordedAt: result.RecordedAt,
      RecordedBy: result.RecordedBy,
      IsDuplicate: isDuplicate,
      CreatedAt: result.CreatedAt,
      UpdatedAt: result.UpdatedAt,
    };
  }
}
