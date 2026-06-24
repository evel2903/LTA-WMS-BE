import { PackageContentDto, PackageDto, PackSessionDto } from '@modules/Outbound/Application/DTOs/PackingDto';
import { PackageContentEntity } from '@modules/Outbound/Domain/Entities/PackageContentEntity';
import { PackageEntity } from '@modules/Outbound/Domain/Entities/PackageEntity';
import { PackSessionEntity } from '@modules/Outbound/Domain/Entities/PackSessionEntity';

const date = (value: Date | null): string | null => (value ? value.toISOString() : null);

export class PackingDtoMapper {
  public static ToSessionDto(entity: PackSessionEntity): PackSessionDto {
    return {
      Id: entity.Id,
      SessionNumber: entity.SessionNumber,
      PickTaskId: entity.PickTaskId,
      MobileTaskId: entity.MobileTaskId,
      OutboundOrderId: entity.OutboundOrderId,
      WarehouseProfileId: entity.WarehouseProfileId,
      WarehouseId: entity.WarehouseId,
      WarehouseCode: entity.WarehouseCode,
      OwnerId: entity.OwnerId,
      OwnerCode: entity.OwnerCode,
      Status: entity.Status,
      CheckRequired: entity.CheckRequired,
      CheckResult: entity.CheckResult,
      CheckExceptionCaseId: entity.CheckExceptionCaseId,
      StartedAt: entity.StartedAt.toISOString(),
      StartedBy: entity.StartedBy,
      CheckedAt: date(entity.CheckedAt),
      CheckedBy: entity.CheckedBy,
    };
  }

  public static ToContentDto(entity: PackageContentEntity): PackageContentDto {
    return {
      Id: entity.Id,
      PackageId: entity.PackageId,
      PickTaskId: entity.PickTaskId,
      OutboundOrderLineId: entity.OutboundOrderLineId,
      SourceBalanceId: entity.SourceBalanceId,
      SourceDimensionId: entity.SourceDimensionId,
      SkuId: entity.SkuId,
      SkuCode: entity.SkuCode,
      UomId: entity.UomId,
      UomCode: entity.UomCode,
      Quantity: entity.Quantity,
      InventoryStatusCode: entity.InventoryStatusCode,
      LotNumber: entity.LotNumber,
      SerialNumber: entity.SerialNumber,
      ExpiryDate: date(entity.ExpiryDate)?.slice(0, 10) ?? null,
      CreatedAt: entity.CreatedAt.toISOString(),
    };
  }

  public static ToPackageDto(entity: PackageEntity, contents: PackageContentEntity[] = []): PackageDto {
    return {
      Id: entity.Id,
      PackageCode: entity.PackageCode,
      PackSessionId: entity.PackSessionId,
      PickTaskId: entity.PickTaskId,
      OutboundOrderId: entity.OutboundOrderId,
      WarehouseProfileId: entity.WarehouseProfileId,
      WarehouseId: entity.WarehouseId,
      WarehouseCode: entity.WarehouseCode,
      OwnerId: entity.OwnerId,
      OwnerCode: entity.OwnerCode,
      Status: entity.Status,
      CheckRequired: entity.CheckRequired,
      CheckResult: entity.CheckResult,
      CartonType: entity.CartonType,
      Weight: entity.Weight,
      Length: entity.Length,
      Width: entity.Width,
      Height: entity.Height,
      LabelBlockingDecision: entity.LabelBlockingDecision,
      LabelPrintJobId: entity.LabelPrintJobId,
      LabelPrintJobCode: entity.LabelPrintJobCode,
      ClosedAt: date(entity.ClosedAt),
      ClosedBy: entity.ClosedBy,
      ReadyForStagingAt: date(entity.ReadyForStagingAt),
      ReadyForStagingBy: entity.ReadyForStagingBy,
      CreatedAt: entity.CreatedAt.toISOString(),
      UpdatedAt: entity.UpdatedAt.toISOString(),
      Contents: contents.map(PackingDtoMapper.ToContentDto),
    };
  }
}
