import { InboundPlanEntity } from '@modules/Inbound/Domain/Entities/InboundPlanEntity';
import { InboundPlanLineEntity } from '@modules/Inbound/Domain/Entities/InboundPlanLineEntity';
import { InboundGateInStatus } from '@modules/Inbound/Domain/Enums/InboundGateInStatus';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';
import { InboundPlanOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanOrmEntity';
import { InboundPlanLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanLineOrmEntity';

export class InboundOrmMapper {
  public static ToPlanDomain(entity: InboundPlanOrmEntity): InboundPlanEntity {
    return new InboundPlanEntity({
      Id: entity.Id,
      SourceSystem: entity.SourceSystem,
      SourceDocumentType: entity.SourceDocumentType,
      SourceDocumentNumber: entity.SourceDocumentNumber,
      BusinessReference: entity.BusinessReference,
      SupplierId: entity.SupplierId,
      SupplierCode: entity.SupplierCode,
      OwnerId: entity.OwnerId,
      OwnerCode: entity.OwnerCode,
      WarehouseId: entity.WarehouseId,
      WarehouseCode: entity.WarehouseCode,
      WarehouseProfileId: entity.WarehouseProfileId,
      ExpectedArrivalAt: entity.ExpectedArrivalAt,
      Status: entity.Status as InboundPlanDocumentStatus,
      GateInStatus: entity.GateInStatus as InboundGateInStatus,
      GateInAt: entity.GateInAt,
      GateReference: entity.GateReference,
      VehicleNumber: entity.VehicleNumber,
      DriverName: entity.DriverName,
      EvidenceRefs: entity.EvidenceRefs ?? [],
      CoreFlowInstanceId: entity.CoreFlowInstanceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToLineDomain(entity: InboundPlanLineOrmEntity): InboundPlanLineEntity {
    return new InboundPlanLineEntity({
      Id: entity.Id,
      InboundPlanId: entity.InboundPlanId,
      LineNumber: entity.LineNumber,
      SkuId: entity.SkuId,
      SkuCode: entity.SkuCode,
      UomId: entity.UomId,
      UomCode: entity.UomCode,
      ExpectedQuantity: Number(entity.ExpectedQuantity),
      ExternalLineReference: entity.ExternalLineReference,
      CreatedAt: entity.CreatedAt,
    });
  }

  public static ToPlanOrm(entity: InboundPlanEntity): InboundPlanOrmEntity {
    const orm = new InboundPlanOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }

  public static ToLineOrm(entity: InboundPlanLineEntity): InboundPlanLineOrmEntity {
    const orm = new InboundPlanLineOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }
}
