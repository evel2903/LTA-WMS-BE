import { LabelBlockingDecision } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingDecision';
import { PackageContentEntity } from '@modules/Outbound/Domain/Entities/PackageContentEntity';
import { PackageEntity } from '@modules/Outbound/Domain/Entities/PackageEntity';
import { PackSessionEntity } from '@modules/Outbound/Domain/Entities/PackSessionEntity';
import { PackageCheckResult } from '@modules/Outbound/Domain/Enums/PackageCheckResult';
import { PackageStatus } from '@modules/Outbound/Domain/Enums/PackageStatus';
import { PackSessionStatus } from '@modules/Outbound/Domain/Enums/PackSessionStatus';
import { PackageContentOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PackageContentOrmEntity';
import { PackageOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PackageOrmEntity';
import { PackSessionOrmEntity } from '@modules/Outbound/Infrastructure/Persistence/Entities/PackSessionOrmEntity';

export class PackingOrmMapper {
  public static ToSessionDomain(entity: PackSessionOrmEntity): PackSessionEntity {
    return new PackSessionEntity({
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
      Status: entity.Status as PackSessionStatus,
      CheckRequired: entity.CheckRequired,
      CheckResult: entity.CheckResult as PackageCheckResult,
      CheckExceptionCaseId: entity.CheckExceptionCaseId,
      CheckReasonCode: entity.CheckReasonCode,
      CheckReasonCodeId: entity.CheckReasonCodeId,
      CheckReasonNote: entity.CheckReasonNote,
      CheckEvidenceRefs: entity.CheckEvidenceRefs ?? [],
      CheckPayloadJson: entity.CheckPayloadJson,
      CheckIdempotencyKey: entity.CheckIdempotencyKey,
      CheckPayloadFingerprint: entity.CheckPayloadFingerprint,
      StartedAt: new Date(entity.StartedAt),
      StartedBy: entity.StartedBy,
      CheckedAt: entity.CheckedAt ? new Date(entity.CheckedAt) : null,
      CheckedBy: entity.CheckedBy,
      IdempotencyKey: entity.IdempotencyKey,
      PayloadFingerprint: entity.PayloadFingerprint,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
    });
  }

  public static ToSessionOrm(entity: PackSessionEntity): PackSessionOrmEntity {
    const orm = new PackSessionOrmEntity();
    Object.assign(orm, entity);
    orm.CheckEvidenceRefs = entity.CheckEvidenceRefs;
    return orm;
  }

  public static ToPackageDomain(entity: PackageOrmEntity): PackageEntity {
    return new PackageEntity({
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
      Status: entity.Status as PackageStatus,
      CheckRequired: entity.CheckRequired,
      CheckResult: entity.CheckResult as PackageCheckResult,
      CartonType: entity.CartonType,
      Weight: entity.Weight === null ? null : Number(entity.Weight),
      Length: entity.Length === null ? null : Number(entity.Length),
      Width: entity.Width === null ? null : Number(entity.Width),
      Height: entity.Height === null ? null : Number(entity.Height),
      LabelBlockingDecision: entity.LabelBlockingDecision as LabelBlockingDecision | null,
      LabelPrintJobId: entity.LabelPrintJobId,
      LabelPrintJobCode: entity.LabelPrintJobCode,
      ReadyForStagingIdempotencyKey: entity.ReadyForStagingIdempotencyKey,
      ReadyForStagingPayloadFingerprint: entity.ReadyForStagingPayloadFingerprint,
      CloseIdempotencyKey: entity.CloseIdempotencyKey,
      ClosePayloadFingerprint: entity.ClosePayloadFingerprint,
      ClosedAt: entity.ClosedAt ? new Date(entity.ClosedAt) : null,
      ClosedBy: entity.ClosedBy,
      ReadyForStagingAt: entity.ReadyForStagingAt ? new Date(entity.ReadyForStagingAt) : null,
      ReadyForStagingBy: entity.ReadyForStagingBy,
      IdempotencyKey: entity.IdempotencyKey,
      PayloadFingerprint: entity.PayloadFingerprint,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToPackageOrm(entity: PackageEntity): PackageOrmEntity {
    const orm = new PackageOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }

  public static ToContentDomain(entity: PackageContentOrmEntity): PackageContentEntity {
    return new PackageContentEntity({
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
      Quantity: Number(entity.Quantity),
      InventoryStatusCode: entity.InventoryStatusCode,
      LotNumber: entity.LotNumber,
      SerialNumber: entity.SerialNumber,
      ExpiryDate: entity.ExpiryDate ? new Date(entity.ExpiryDate) : null,
      CreatedAt: entity.CreatedAt,
    });
  }

  public static ToContentOrm(entity: PackageContentEntity): PackageContentOrmEntity {
    const orm = new PackageContentOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }
}
