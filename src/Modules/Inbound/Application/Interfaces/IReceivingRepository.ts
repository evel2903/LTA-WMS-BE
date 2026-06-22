import { EntityManager } from 'typeorm';
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
  FindReceiptLineByIdempotencyKey(receiptId: string, idempotencyKey: string): Promise<ReceiptLineEntity | null>;
}
