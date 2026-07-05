import { OutboundOrderDto, OutboundOrderLineDto } from '@modules/Outbound/Application/DTOs/OutboundOrderDto';
import { OutboundOrderAggregate } from '@modules/Outbound/Application/Interfaces/IOutboundOrderRepository';
import { OutboundOrderLineEntity } from '@modules/Outbound/Domain/Entities/OutboundOrderLineEntity';

export class OutboundOrderDtoMapper {
  public static ToDto(aggregate: OutboundOrderAggregate, isDuplicate = false): OutboundOrderDto {
    const order = aggregate.Order;
    return {
      Id: order.Id,
      OrderNumber: order.OrderNumber,
      SourceSystem: order.SourceSystem,
      SourceReference: order.SourceReference,
      BusinessReference: order.BusinessReference,
      CustomerId: order.CustomerId,
      CustomerSourceSystem: order.CustomerSourceSystem,
      CustomerExternalReference: order.CustomerExternalReference,
      CustomerCode: order.CustomerCode,
      ShipToReference: order.ShipToReference,
      OwnerId: order.OwnerId,
      OwnerCode: order.OwnerCode,
      WarehouseId: order.WarehouseId,
      WarehouseCode: order.WarehouseCode,
      Priority: order.Priority,
      CutoffAt: order.CutoffAt,
      DocumentStatus: order.DocumentStatus,
      ValidationErrors: order.ValidationErrors,
      CoreFlowInstanceId: order.CoreFlowInstanceId,
      OutboxMessageId: order.OutboxMessageId,
      ReasonCode: order.ReasonCode,
      ReasonCodeId: order.ReasonCodeId,
      ReasonNote: order.ReasonNote,
      EvidenceRefs: order.EvidenceRefs,
      IsDuplicate: isDuplicate,
      Lines: aggregate.Lines.map(this.ToLineDto),
      CreatedAt: order.CreatedAt,
      UpdatedAt: order.UpdatedAt,
      CreatedBy: order.CreatedBy,
      UpdatedBy: order.UpdatedBy,
    };
  }

  private static ToLineDto(line: OutboundOrderLineEntity): OutboundOrderLineDto {
    return {
      Id: line.Id,
      LineNumber: line.LineNumber,
      SkuId: line.SkuId,
      SkuCode: line.SkuCode,
      UomId: line.UomId,
      UomCode: line.UomCode,
      OrderedQuantity: line.OrderedQuantity,
      ExternalLineReference: line.ExternalLineReference,
      RequestedLotNumber: line.RequestedLotNumber,
      RequestedSerialNumber: line.RequestedSerialNumber,
      ValidationErrors: line.ValidationErrors,
    };
  }
}
