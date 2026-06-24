import {
  OutboundActionIdempotencyRecord,
  OutboundOrderEntity,
} from '@modules/Outbound/Domain/Entities/OutboundOrderEntity';
import { AllocationEntity } from '@modules/Outbound/Domain/Entities/AllocationEntity';
import { AllocationLineEntity } from '@modules/Outbound/Domain/Entities/AllocationLineEntity';
import { OutboundOrderLineEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderLineEntity';
import { AllocationPolicy } from '@modules/Outbound/Domain/Enums/AllocationPolicy';
import { AllocationStatus } from '@modules/Outbound/Domain/Enums/AllocationStatus';
import { OutboundOrderStatus } from '@modules/Outbound/Domain/Enums/OutboundOrderStatus';
import { AllocationLineOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/AllocationLineOrmEntity';
import { AllocationOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/AllocationOrmEntity';
import { OutboundOrderOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/OutboundOrderOrmEntity';
import { OutboundOrderLineOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/OutboundOrderLineOrmEntity';

export class OutboundOrmMapper {
  public static ToOrderDomain(entity: OutboundOrderOrmEntity): OutboundOrderEntity {
    return new OutboundOrderEntity({
      Id: entity.Id,
      OrderNumber: entity.OrderNumber,
      SourceSystem: entity.SourceSystem,
      SourceReference: entity.SourceReference,
      BusinessReference: entity.BusinessReference,
      CustomerId: entity.CustomerId,
      CustomerSourceSystem: entity.CustomerSourceSystem,
      CustomerExternalReference: entity.CustomerExternalReference,
      CustomerCode: entity.CustomerCode,
      ShipToReference: entity.ShipToReference,
      OwnerId: entity.OwnerId,
      OwnerCode: entity.OwnerCode,
      WarehouseId: entity.WarehouseId,
      WarehouseCode: entity.WarehouseCode,
      Priority: entity.Priority,
      CutoffAt: entity.CutoffAt,
      DocumentStatus: entity.DocumentStatus as OutboundOrderStatus,
      ValidationErrors: entity.ValidationErrors ?? [],
      CoreFlowInstanceId: entity.CoreFlowInstanceId,
      OutboxMessageId: entity.OutboxMessageId,
      ImportIdempotencyKey: entity.ImportIdempotencyKey,
      ImportPayloadFingerprint: entity.ImportPayloadFingerprint,
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs ?? [],
      ActionIdempotency: (entity.ActionIdempotency as Record<string, OutboundActionIdempotencyRecord> | null) ?? {},
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToLineDomain(entity: OutboundOrderLineOrmEntity): OutboundOrderLineEntity {
    return new OutboundOrderLineEntity({
      Id: entity.Id,
      OutboundOrderId: entity.OutboundOrderId,
      LineNumber: entity.LineNumber,
      SkuId: entity.SkuId,
      SkuCode: entity.SkuCode,
      UomId: entity.UomId,
      UomCode: entity.UomCode,
      OrderedQuantity: Number(entity.OrderedQuantity),
      ExternalLineReference: entity.ExternalLineReference,
      ValidationErrors: entity.ValidationErrors ?? [],
      CreatedAt: entity.CreatedAt,
    });
  }

  public static ToOrderOrm(entity: OutboundOrderEntity): OutboundOrderOrmEntity {
    const orm = new OutboundOrderOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }

  public static ToLineOrm(entity: OutboundOrderLineEntity): OutboundOrderLineOrmEntity {
    const orm = new OutboundOrderLineOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }

  public static ToAllocationDomain(entity: AllocationOrmEntity): AllocationEntity {
    return new AllocationEntity({
      Id: entity.Id,
      AllocationNumber: entity.AllocationNumber,
      OutboundOrderId: entity.OutboundOrderId,
      WarehouseId: entity.WarehouseId,
      WarehouseCode: entity.WarehouseCode,
      OwnerId: entity.OwnerId,
      OwnerCode: entity.OwnerCode,
      Policy: entity.Policy as AllocationPolicy,
      Status: entity.Status as AllocationStatus,
      TotalOrderedQuantity: Number(entity.TotalOrderedQuantity),
      TotalAllocatedQuantity: Number(entity.TotalAllocatedQuantity),
      TotalBackorderedQuantity: Number(entity.TotalBackorderedQuantity),
      ShortageReason: entity.ShortageReason,
      OutboxMessageId: entity.OutboxMessageId,
      IdempotencyKey: entity.IdempotencyKey,
      PayloadFingerprint: entity.PayloadFingerprint,
      ReasonCode: entity.ReasonCode,
      ReasonCodeId: entity.ReasonCodeId,
      ReasonNote: entity.ReasonNote,
      EvidenceRefs: entity.EvidenceRefs ?? [],
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToAllocationLineDomain(entity: AllocationLineOrmEntity): AllocationLineEntity {
    return new AllocationLineEntity({
      Id: entity.Id,
      AllocationId: entity.AllocationId,
      OutboundOrderLineId: entity.OutboundOrderLineId,
      LineNumber: entity.LineNumber,
      SkuId: entity.SkuId,
      SkuCode: entity.SkuCode,
      UomId: entity.UomId,
      UomCode: entity.UomCode,
      OrderedQuantity: Number(entity.OrderedQuantity),
      AllocatedQuantity: Number(entity.AllocatedQuantity),
      BackorderedQuantity: Number(entity.BackorderedQuantity),
      SourceBalanceId: entity.SourceBalanceId,
      SourceDimensionId: entity.SourceDimensionId,
      SourceLocationId: entity.SourceLocationId,
      InventoryStatusCode: entity.InventoryStatusCode,
      LotNumber: entity.LotNumber,
      SerialNumber: entity.SerialNumber,
      ExpiryDate: entity.ExpiryDate ? new Date(entity.ExpiryDate) : null,
      Status: entity.Status as AllocationStatus,
      ShortageReason: entity.ShortageReason,
      CreatedAt: entity.CreatedAt,
    });
  }

  public static ToAllocationOrm(entity: AllocationEntity): AllocationOrmEntity {
    const orm = new AllocationOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }

  public static ToAllocationLineOrm(entity: AllocationLineEntity): AllocationLineOrmEntity {
    const orm = new AllocationLineOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }
}
