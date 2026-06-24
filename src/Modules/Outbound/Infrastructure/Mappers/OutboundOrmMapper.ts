import {
  OutboundActionIdempotencyRecord,
  OutboundOrderEntity,
} from '@modules/Outbound/Domain/Entities/OutboundOrderEntity';
import { OutboundOrderLineEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderLineEntity';
import { OutboundOrderStatus } from '@modules/Outbound/Domain/Enums/OutboundOrderStatus';
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
}
