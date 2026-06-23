import { InventoryMovementEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryMovementEntity';
import { InventoryTransactionEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryTransactionEntity';
import { InventoryMovementOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/InventoryMovementOrmEntity';
import { InventoryTransactionOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/InventoryTransactionOrmEntity';

export class InventoryTransactionOrmMapper {
  public static TransactionToDomain(entity: InventoryTransactionOrmEntity): InventoryTransactionEntity {
    return new InventoryTransactionEntity({
      ...entity,
      Quantity: Number(entity.Quantity),
      EvidenceRefs: entity.EvidenceRefs ?? [],
    });
  }

  public static TransactionToOrm(entity: InventoryTransactionEntity): InventoryTransactionOrmEntity {
    const orm = new InventoryTransactionOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }

  public static MovementToDomain(entity: InventoryMovementOrmEntity): InventoryMovementEntity {
    return new InventoryMovementEntity({
      ...entity,
      Quantity: Number(entity.Quantity),
      ScanEvidenceJson: entity.ScanEvidenceJson ?? {},
    });
  }

  public static MovementToOrm(entity: InventoryMovementEntity): InventoryMovementOrmEntity {
    const orm = new InventoryMovementOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }
}
