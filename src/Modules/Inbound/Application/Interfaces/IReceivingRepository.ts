import { EntityManager } from 'typeorm';
import { InboundDiscrepancyEntity } from '@modules/Inbound/Domain/Entities/InboundDiscrepancyEntity';
import { InboundDiscrepancyStatus } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyStatus';
import { ReceiptEntity } from '@modules/Inbound/Domain/Entities/ReceiptEntity';
import { ReceiptLineEntity } from '@modules/Inbound/Domain/Entities/ReceiptLineEntity';
import { ReceivingSessionEntity } from '@modules/Inbound/Domain/Entities/ReceivingSessionEntity';

export const RECEIVING_REPOSITORY = Symbol('RECEIVING_REPOSITORY');

export interface ReceivingSessionAggregate {
  Session: ReceivingSessionEntity;
  Receipt: ReceiptEntity;
}

export interface IReceivingRepository {
  CreateSessionWithReceipt(
    session: ReceivingSessionEntity,
    receipt: ReceiptEntity,
    manager?: EntityManager,
  ): Promise<ReceivingSessionAggregate>;
  FindOpenSessionByPlanAndKey(inboundPlanId: string, sessionKey: string): Promise<ReceivingSessionAggregate | null>;
  FindReceiptById(id: string): Promise<ReceiptEntity | null>;
  FindReceiptByInboundPlanId(inboundPlanId: string): Promise<ReceiptEntity | null>;
  UpdateReceipt(receipt: ReceiptEntity, manager?: EntityManager): Promise<ReceiptEntity>;
  CreateReceiptLine(line: ReceiptLineEntity, manager?: EntityManager): Promise<ReceiptLineEntity>;
  FindReceiptLineById(id: string): Promise<ReceiptLineEntity | null>;
  FindReceiptLineByIdempotencyKey(receiptId: string, idempotencyKey: string): Promise<ReceiptLineEntity | null>;
  CreateInboundDiscrepancy(
    discrepancy: InboundDiscrepancyEntity,
    manager?: EntityManager,
  ): Promise<InboundDiscrepancyEntity>;
  FindInboundDiscrepancyByIdempotencyKey(
    receiptId: string,
    idempotencyKey: string,
  ): Promise<InboundDiscrepancyEntity | null>;
  ListInboundDiscrepancies(
    skip: number,
    take: number,
    filter?: {
      ReceiptId?: string;
      ReceiptLineId?: string;
      InboundPlanId?: string;
      WarehouseId?: string;
      OwnerId?: string;
      Status?: InboundDiscrepancyStatus;
    },
  ): Promise<{ Items: InboundDiscrepancyEntity[]; TotalItems: number }>;
}
