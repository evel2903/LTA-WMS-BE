import { CycleCountWorkDto } from '@modules/InventoryExecution/Application/DTOs/CycleCountWorkDto';
import { CycleCountWorkEntity } from '@modules/InventoryExecution/Domain/Entities/CycleCountWorkEntity';

export class CycleCountWorkDtoMapper {
  public static ToDto(work: CycleCountWorkEntity): CycleCountWorkDto {
    return {
      Id: work.Id,
      CountCode: work.CountCode,
      WorkStatus: work.WorkStatus,
      SourceBalanceId: work.SourceBalanceId,
      LockedBalanceId: work.LockedBalanceId,
      OriginalInventoryStatusCode: work.OriginalInventoryStatusCode,
      WarehouseId: work.WarehouseId,
      WarehouseCode: work.WarehouseCode,
      OwnerId: work.OwnerId,
      OwnerCode: work.OwnerCode,
      SkuId: work.SkuId,
      SkuCode: work.SkuCode,
      LocationId: work.LocationId,
      LocationCode: work.LocationCode,
      UomId: work.UomId,
      UomCode: work.UomCode,
      LpnCode: work.LpnCode,
      ExpectedQuantity: work.ExpectedQuantity,
      CountedQuantity: work.CountedQuantity,
      VarianceQuantity: work.VarianceQuantity,
      ToleranceQuantity: work.ToleranceQuantity,
      ApprovalRequestId: work.ApprovalRequestId,
      LockTransactionId: work.LockTransactionId,
      AdjustmentTransactionId: work.AdjustmentTransactionId,
      UnlockTransactionId: work.UnlockTransactionId,
      ReasonCode: work.ReasonCode,
      ReasonCodeId: work.ReasonCodeId,
      ReasonNote: work.ReasonNote,
      EvidenceRefs: work.EvidenceRefs,
      CreatedAt: work.CreatedAt.toISOString(),
      UpdatedAt: work.UpdatedAt.toISOString(),
      CreatedBy: work.CreatedBy,
      UpdatedBy: work.UpdatedBy,
    };
  }
}
