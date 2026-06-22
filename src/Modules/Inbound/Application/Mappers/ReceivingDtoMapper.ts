import {
  InboundDiscrepancyDto,
  ReceiptDto,
  ReceiptLineDto,
  ReceivingSessionDto,
} from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { InboundDiscrepancyEntity } from '@modules/Inbound/Domain/Entities/InboundDiscrepancyEntity';
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
}
