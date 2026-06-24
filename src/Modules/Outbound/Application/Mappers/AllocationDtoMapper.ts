import { AllocationDto, AllocationLineDto } from '@modules/Outbound/Application/DTOs/AllocationDto';
import { AllocationAggregate } from '@modules/Outbound/Application/Interfaces/IAllocationRepository';
import { AllocationLineEntity } from '@modules/Outbound/Domain/Entities/AllocationLineEntity';

export class AllocationDtoMapper {
  public static ToDto(aggregate: AllocationAggregate, isDuplicate = false): AllocationDto {
    const allocation = aggregate.Allocation;
    return {
      Id: allocation.Id,
      AllocationNumber: allocation.AllocationNumber,
      OutboundOrderId: allocation.OutboundOrderId,
      WarehouseId: allocation.WarehouseId,
      WarehouseCode: allocation.WarehouseCode,
      OwnerId: allocation.OwnerId,
      OwnerCode: allocation.OwnerCode,
      Policy: allocation.Policy,
      Status: allocation.Status,
      TotalOrderedQuantity: allocation.TotalOrderedQuantity,
      TotalAllocatedQuantity: allocation.TotalAllocatedQuantity,
      TotalBackorderedQuantity: allocation.TotalBackorderedQuantity,
      ShortageReason: allocation.ShortageReason,
      OutboxMessageId: allocation.OutboxMessageId,
      ReasonCode: allocation.ReasonCode,
      ReasonCodeId: allocation.ReasonCodeId,
      ReasonNote: allocation.ReasonNote,
      EvidenceRefs: allocation.EvidenceRefs,
      IsDuplicate: isDuplicate,
      Lines: aggregate.Lines.map(this.ToLineDto),
      CreatedAt: allocation.CreatedAt,
      UpdatedAt: allocation.UpdatedAt,
      CreatedBy: allocation.CreatedBy,
      UpdatedBy: allocation.UpdatedBy,
    };
  }

  private static ToLineDto(line: AllocationLineEntity): AllocationLineDto {
    return {
      Id: line.Id,
      OutboundOrderLineId: line.OutboundOrderLineId,
      LineNumber: line.LineNumber,
      SkuId: line.SkuId,
      SkuCode: line.SkuCode,
      UomId: line.UomId,
      UomCode: line.UomCode,
      OrderedQuantity: line.OrderedQuantity,
      AllocatedQuantity: line.AllocatedQuantity,
      BackorderedQuantity: line.BackorderedQuantity,
      SourceBalanceId: line.SourceBalanceId,
      SourceDimensionId: line.SourceDimensionId,
      SourceLocationId: line.SourceLocationId,
      InventoryStatusCode: line.InventoryStatusCode,
      LotNumber: line.LotNumber,
      SerialNumber: line.SerialNumber,
      ExpiryDate: line.ExpiryDate,
      Status: line.Status,
      ShortageReason: line.ShortageReason,
    };
  }
}
