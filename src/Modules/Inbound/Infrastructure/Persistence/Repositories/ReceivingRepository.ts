import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { EntityManager, Repository } from 'typeorm';
import {
  IReceivingRepository,
  ReceivingSessionAggregate,
} from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { InboundDiscrepancyEntity } from '@modules/Inbound/Domain/Entities/InboundDiscrepancyEntity';
import { InboundDiscrepancyStatus } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyStatus';
import { ReceiptEntity } from '@modules/Inbound/Domain/Entities/ReceiptEntity';
import { ReceiptLineEntity } from '@modules/Inbound/Domain/Entities/ReceiptLineEntity';
import { ReceivingSessionEntity } from '@modules/Inbound/Domain/Entities/ReceivingSessionEntity';
import { ReceivingSessionStatus } from '@modules/Inbound/Domain/Enums/ReceivingSessionStatus';
import { ReceivingOrmMapper } from '@modules/Inbound/Infrastructure/Mappers/ReceivingOrmMapper';
import { InboundDiscrepancyOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundDiscrepancyOrmEntity';
import { ReceiptOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceiptOrmEntity';
import { ReceiptLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceiptLineOrmEntity';
import { ReceivingSessionOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/ReceivingSessionOrmEntity';

@Injectable()
export class ReceivingRepository implements IReceivingRepository {
  constructor(
    @InjectRepository(ReceivingSessionOrmEntity)
    private readonly sessions: Repository<ReceivingSessionOrmEntity>,
    @InjectRepository(ReceiptOrmEntity)
    private readonly receipts: Repository<ReceiptOrmEntity>,
    @InjectRepository(ReceiptLineOrmEntity)
    private readonly lines: Repository<ReceiptLineOrmEntity>,
    @InjectRepository(InboundDiscrepancyOrmEntity)
    private readonly discrepancies: Repository<InboundDiscrepancyOrmEntity>,
  ) {}

  public async CreateSessionWithReceipt(
    session: ReceivingSessionEntity,
    receipt: ReceiptEntity,
    manager?: EntityManager,
  ): Promise<ReceivingSessionAggregate> {
    const sessionRepo = manager ? manager.getRepository(ReceivingSessionOrmEntity) : this.sessions;
    const receiptRepo = manager ? manager.getRepository(ReceiptOrmEntity) : this.receipts;
    try {
      const savedReceipt = await receiptRepo.save(ReceivingOrmMapper.ToReceiptOrm(receipt));
      const savedSession = await sessionRepo.save(ReceivingOrmMapper.ToSessionOrm(session));
      return {
        Session: ReceivingOrmMapper.ToSessionDomain(savedSession),
        Receipt: ReceivingOrmMapper.ToReceiptDomain(savedReceipt),
      };
    } catch (error) {
      this.HandleUniqueViolation(error, 'Receiving session or receipt already exists');
      throw error;
    }
  }

  public async FindOpenSessionByPlanAndKey(
    inboundPlanId: string,
    sessionKey: string,
  ): Promise<ReceivingSessionAggregate | null> {
    const session = await this.sessions.findOne({
      where: { InboundPlanId: inboundPlanId, SessionKey: sessionKey, Status: ReceivingSessionStatus.Open },
    });
    if (!session) return null;
    const receipt = await this.receipts.findOne({ where: { Id: session.ReceiptId } });
    if (!receipt) return null;
    return {
      Session: ReceivingOrmMapper.ToSessionDomain(session),
      Receipt: ReceivingOrmMapper.ToReceiptDomain(receipt),
    };
  }

  public async FindReceiptById(id: string): Promise<ReceiptEntity | null> {
    const entity = await this.receipts.findOne({ where: { Id: id } });
    return entity ? ReceivingOrmMapper.ToReceiptDomain(entity) : null;
  }

  public async FindReceiptByInboundPlanId(inboundPlanId: string): Promise<ReceiptEntity | null> {
    const entity = await this.receipts.findOne({ where: { InboundPlanId: inboundPlanId } });
    return entity ? ReceivingOrmMapper.ToReceiptDomain(entity) : null;
  }

  public async UpdateReceipt(receipt: ReceiptEntity, manager?: EntityManager): Promise<ReceiptEntity> {
    const repo = manager ? manager.getRepository(ReceiptOrmEntity) : this.receipts;
    const saved = await repo.save(ReceivingOrmMapper.ToReceiptOrm(receipt));
    return ReceivingOrmMapper.ToReceiptDomain(saved);
  }

  public async CreateReceiptLine(line: ReceiptLineEntity, manager?: EntityManager): Promise<ReceiptLineEntity> {
    const repo = manager ? manager.getRepository(ReceiptLineOrmEntity) : this.lines;
    try {
      const saved = await repo.save(ReceivingOrmMapper.ToLineOrm(line));
      return ReceivingOrmMapper.ToLineDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error, 'Receipt line idempotency key already exists');
      throw error;
    }
  }

  public async FindReceiptLineByIdempotencyKey(
    receiptId: string,
    idempotencyKey: string,
  ): Promise<ReceiptLineEntity | null> {
    const entity = await this.lines.findOne({ where: { ReceiptId: receiptId, IdempotencyKey: idempotencyKey } });
    return entity ? ReceivingOrmMapper.ToLineDomain(entity) : null;
  }

  public async FindReceiptLineById(id: string): Promise<ReceiptLineEntity | null> {
    const entity = await this.lines.findOne({ where: { Id: id } });
    return entity ? ReceivingOrmMapper.ToLineDomain(entity) : null;
  }

  public async CreateInboundDiscrepancy(
    discrepancy: InboundDiscrepancyEntity,
    manager?: EntityManager,
  ): Promise<InboundDiscrepancyEntity> {
    const repo = manager ? manager.getRepository(InboundDiscrepancyOrmEntity) : this.discrepancies;
    try {
      const saved = await repo.save(ReceivingOrmMapper.ToDiscrepancyOrm(discrepancy));
      return ReceivingOrmMapper.ToDiscrepancyDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error, 'Inbound discrepancy idempotency key already exists');
      throw error;
    }
  }

  public async FindInboundDiscrepancyByIdempotencyKey(
    receiptId: string,
    idempotencyKey: string,
  ): Promise<InboundDiscrepancyEntity | null> {
    const entity = await this.discrepancies.findOne({
      where: { ReceiptId: receiptId, IdempotencyKey: idempotencyKey },
    });
    return entity ? ReceivingOrmMapper.ToDiscrepancyDomain(entity) : null;
  }

  public async ListInboundDiscrepancies(
    skip: number,
    take: number,
    filter: {
      ReceiptId?: string;
      ReceiptLineId?: string;
      InboundPlanId?: string;
      WarehouseId?: string;
      OwnerId?: string;
      Status?: InboundDiscrepancyStatus;
    } = {},
  ): Promise<{ Items: InboundDiscrepancyEntity[]; TotalItems: number }> {
    const query = this.discrepancies.createQueryBuilder('d');
    if (filter.ReceiptId) query.andWhere('d.ReceiptId = :receiptId', { receiptId: filter.ReceiptId });
    if (filter.ReceiptLineId)
      query.andWhere('d.ReceiptLineId = :receiptLineId', { receiptLineId: filter.ReceiptLineId });
    if (filter.InboundPlanId)
      query.andWhere('d.InboundPlanId = :inboundPlanId', { inboundPlanId: filter.InboundPlanId });
    if (filter.WarehouseId) query.andWhere('d.WarehouseId = :warehouseId', { warehouseId: filter.WarehouseId });
    if (filter.OwnerId) query.andWhere('d.OwnerId = :ownerId', { ownerId: filter.OwnerId });
    if (filter.Status) query.andWhere('d.Status = :status', { status: filter.Status });
    query.orderBy('d.CreatedAt', 'DESC').skip(skip).take(take);
    const [entities, total] = await query.getManyAndCount();
    return { Items: entities.map(ReceivingOrmMapper.ToDiscrepancyDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown, message: string): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException(message);
    }
  }
}
