import { EntityManager } from 'typeorm';
import { InventoryMovementEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryMovementEntity';
import { InventoryTransactionEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryTransactionEntity';

export const INVENTORY_TRANSACTION_REPOSITORY = Symbol('IInventoryTransactionRepository');

export interface IInventoryTransactionRepository {
  CreateTransaction(
    transaction: InventoryTransactionEntity,
    manager?: EntityManager,
  ): Promise<InventoryTransactionEntity>;
  CreateMovement(movement: InventoryMovementEntity, manager?: EntityManager): Promise<InventoryMovementEntity>;
  SaveTransaction(
    transaction: InventoryTransactionEntity,
    manager?: EntityManager,
  ): Promise<InventoryTransactionEntity>;
  FindTransactionByIdempotencyKey(
    putawayTaskId: string,
    idempotencyKey: string,
    manager?: EntityManager,
  ): Promise<InventoryTransactionEntity | null>;
  FindMovementByTransactionId(transactionId: string): Promise<InventoryMovementEntity | null>;
}
