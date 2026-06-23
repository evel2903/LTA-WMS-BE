import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { IInventoryTransactionRepository } from '@modules/InventoryExecution/Application/Interfaces/IInventoryTransactionRepository';
import { InventoryMovementEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryMovementEntity';
import { InventoryTransactionEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryTransactionEntity';
import { InventoryTransactionType } from '@modules/InventoryExecution/Domain/Enums/InventoryTransactionType';
import { InventoryTransactionOrmMapper } from '@modules/InventoryExecution/Infrastructure/Mappers/InventoryTransactionOrmMapper';
import { InventoryMovementOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/InventoryMovementOrmEntity';
import { InventoryTransactionOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/InventoryTransactionOrmEntity';

@Injectable()
export class InventoryTransactionRepository implements IInventoryTransactionRepository {
  constructor(
    @InjectRepository(InventoryTransactionOrmEntity)
    private readonly transactions: Repository<InventoryTransactionOrmEntity>,
    @InjectRepository(InventoryMovementOrmEntity)
    private readonly movements: Repository<InventoryMovementOrmEntity>,
  ) {}

  public async CreateTransaction(
    transaction: InventoryTransactionEntity,
    manager?: EntityManager,
  ): Promise<InventoryTransactionEntity> {
    const repo = manager ? manager.getRepository(InventoryTransactionOrmEntity) : this.transactions;
    try {
      const saved = await repo.save(InventoryTransactionOrmMapper.TransactionToOrm(transaction));
      return InventoryTransactionOrmMapper.TransactionToDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async CreateMovement(
    movement: InventoryMovementEntity,
    manager?: EntityManager,
  ): Promise<InventoryMovementEntity> {
    const repo = manager ? manager.getRepository(InventoryMovementOrmEntity) : this.movements;
    try {
      const saved = await repo.save(InventoryTransactionOrmMapper.MovementToOrm(movement));
      return InventoryTransactionOrmMapper.MovementToDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async SaveTransaction(
    transaction: InventoryTransactionEntity,
    manager?: EntityManager,
  ): Promise<InventoryTransactionEntity> {
    const repo = manager ? manager.getRepository(InventoryTransactionOrmEntity) : this.transactions;
    const saved = await repo.save(InventoryTransactionOrmMapper.TransactionToOrm(transaction));
    return InventoryTransactionOrmMapper.TransactionToDomain(saved);
  }

  public async FindTransactionByIdempotencyKey(
    putawayTaskId: string,
    idempotencyKey: string,
    manager?: EntityManager,
  ): Promise<InventoryTransactionEntity | null> {
    const repo = manager ? manager.getRepository(InventoryTransactionOrmEntity) : this.transactions;
    const entity = await repo.findOne({
      where: { PutawayTaskId: putawayTaskId, IdempotencyKey: idempotencyKey },
    });
    return entity ? InventoryTransactionOrmMapper.TransactionToDomain(entity) : null;
  }

  public async FindTransactionByTypeAndIdempotencyKey(
    transactionType: InventoryTransactionType,
    idempotencyKey: string,
    manager?: EntityManager,
  ): Promise<InventoryTransactionEntity | null> {
    const repo = manager ? manager.getRepository(InventoryTransactionOrmEntity) : this.transactions;
    const entity = await repo.findOne({
      where: { PutawayTaskId: IsNull(), TransactionType: transactionType, IdempotencyKey: idempotencyKey },
    });
    return entity ? InventoryTransactionOrmMapper.TransactionToDomain(entity) : null;
  }

  public async FindMovementByTransactionId(
    transactionId: string,
    manager?: EntityManager,
  ): Promise<InventoryMovementEntity | null> {
    const repo = manager ? manager.getRepository(InventoryMovementOrmEntity) : this.movements;
    const entity = await repo.findOne({ where: { InventoryTransactionId: transactionId } });
    return entity ? InventoryTransactionOrmMapper.MovementToDomain(entity) : null;
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Inventory transaction or movement unique constraint violated');
    }
  }
}
