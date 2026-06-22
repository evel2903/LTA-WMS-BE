import { InboundPlanDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { InboundPlanAggregate } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { InboundPlanLineEntity } from '@modules/Inbound/Domain/Entities/InboundPlanLineEntity';

export class InboundPlanDtoMapper {
  public static ToDto(aggregate: InboundPlanAggregate, isDuplicate = false): InboundPlanDto {
    const plan = aggregate.Plan;
    return {
      Id: plan.Id,
      SourceSystem: plan.SourceSystem,
      SourceDocumentType: plan.SourceDocumentType,
      SourceDocumentNumber: plan.SourceDocumentNumber,
      BusinessReference: plan.BusinessReference,
      SupplierId: plan.SupplierId,
      SupplierCode: plan.SupplierCode,
      OwnerId: plan.OwnerId,
      OwnerCode: plan.OwnerCode,
      WarehouseId: plan.WarehouseId,
      WarehouseCode: plan.WarehouseCode,
      WarehouseProfileId: plan.WarehouseProfileId,
      ExpectedArrivalAt: plan.ExpectedArrivalAt,
      Status: plan.Status,
      GateInStatus: plan.GateInStatus,
      GateInAt: plan.GateInAt,
      GateReference: plan.GateReference,
      VehicleNumber: plan.VehicleNumber,
      DriverName: plan.DriverName,
      EvidenceRefs: plan.EvidenceRefs,
      CoreFlowInstanceId: plan.CoreFlowInstanceId,
      IsDuplicate: isDuplicate,
      Lines: aggregate.Lines.map(this.ToLineDto),
      CreatedAt: plan.CreatedAt,
      UpdatedAt: plan.UpdatedAt,
      CreatedBy: plan.CreatedBy,
      UpdatedBy: plan.UpdatedBy,
    };
  }

  private static ToLineDto(line: InboundPlanLineEntity) {
    return {
      Id: line.Id,
      LineNumber: line.LineNumber,
      SkuId: line.SkuId,
      SkuCode: line.SkuCode,
      UomId: line.UomId,
      UomCode: line.UomCode,
      ExpectedQuantity: line.ExpectedQuantity,
      ExternalLineReference: line.ExternalLineReference,
    };
  }
}
