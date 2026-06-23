import {
  InventoryBalanceSnapshotDto,
  InventoryMovementDto,
  InventoryTransactionDto,
} from '@modules/InventoryExecution/Application/DTOs/InventoryTransactionDto';
import { InventoryMovementEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryMovementEntity';
import { InventoryTransactionEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryTransactionEntity';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';

export class InventoryTransactionDtoMapper {
  public static TransactionToDto(transaction: InventoryTransactionEntity): InventoryTransactionDto {
    return {
      Id: transaction.Id,
      TransactionCode: transaction.TransactionCode,
      TransactionType: transaction.TransactionType,
      TransactionStatus: transaction.TransactionStatus,
      PutawayTaskId: transaction.PutawayTaskId,
      PutawayTaskCode: transaction.PutawayTaskCode,
      InventoryMovementId: transaction.InventoryMovementId,
      OwnerId: transaction.OwnerId,
      OwnerCode: transaction.OwnerCode,
      WarehouseId: transaction.WarehouseId,
      WarehouseCode: transaction.WarehouseCode,
      SkuId: transaction.SkuId,
      SkuCode: transaction.SkuCode,
      UomId: transaction.UomId,
      UomCode: transaction.UomCode,
      Quantity: transaction.Quantity,
      FromInventoryStatusCode: transaction.FromInventoryStatusCode,
      ToInventoryStatusCode: transaction.ToInventoryStatusCode,
      FromLocationId: transaction.FromLocationId,
      FromLocationCode: transaction.FromLocationCode,
      ToLocationId: transaction.ToLocationId,
      ToLocationCode: transaction.ToLocationCode,
      LpnCode: transaction.LpnCode,
      SsccCode: transaction.SsccCode,
      IdempotencyKey: transaction.IdempotencyKey,
      OutboxMessageId: transaction.OutboxMessageId,
      ReasonCode: transaction.ReasonCode,
      ReasonCodeId: transaction.ReasonCodeId,
      ReasonNote: transaction.ReasonNote,
      EvidenceRefs: transaction.EvidenceRefs,
      PostedAt: transaction.PostedAt.toISOString(),
      PostedBy: transaction.PostedBy,
      CreatedAt: transaction.CreatedAt.toISOString(),
      UpdatedAt: transaction.UpdatedAt.toISOString(),
    };
  }

  public static MovementToDto(movement: InventoryMovementEntity): InventoryMovementDto {
    return {
      Id: movement.Id,
      MovementCode: movement.MovementCode,
      MovementStatus: movement.MovementStatus,
      InventoryTransactionId: movement.InventoryTransactionId,
      PutawayTaskId: movement.PutawayTaskId,
      PutawayTaskCode: movement.PutawayTaskCode,
      OwnerId: movement.OwnerId,
      OwnerCode: movement.OwnerCode,
      WarehouseId: movement.WarehouseId,
      WarehouseCode: movement.WarehouseCode,
      SkuId: movement.SkuId,
      SkuCode: movement.SkuCode,
      UomId: movement.UomId,
      UomCode: movement.UomCode,
      Quantity: movement.Quantity,
      FromDimensionId: movement.FromDimensionId,
      FromBalanceId: movement.FromBalanceId,
      FromLocationId: movement.FromLocationId,
      FromLocationCode: movement.FromLocationCode,
      FromInventoryStatusCode: movement.FromInventoryStatusCode,
      ToDimensionId: movement.ToDimensionId,
      ToBalanceId: movement.ToBalanceId,
      ToLocationId: movement.ToLocationId,
      ToLocationCode: movement.ToLocationCode,
      ToInventoryStatusCode: movement.ToInventoryStatusCode,
      LpnCode: movement.LpnCode,
      SsccCode: movement.SsccCode,
      ScanEvidenceJson: movement.ScanEvidenceJson,
      CreatedAt: movement.CreatedAt.toISOString(),
      CreatedBy: movement.CreatedBy,
    };
  }

  public static BalanceToSnapshot(balance: InventoryBalanceEntity): InventoryBalanceSnapshotDto {
    return {
      BalanceId: balance.Id,
      DimensionId: balance.DimensionId,
      QtyOnHand: balance.QtyOnHand,
      QtyReserved: balance.QtyReserved,
      QtyAvailable: balance.QtyAvailable,
    };
  }
}
