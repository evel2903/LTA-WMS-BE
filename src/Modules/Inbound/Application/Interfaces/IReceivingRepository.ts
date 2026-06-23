import { EntityManager } from 'typeorm';
import { InboundDiscrepancyEntity } from '@modules/Inbound/Domain/Entities/InboundDiscrepancyEntity';
import { InboundDiscrepancyStatus } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyStatus';
import { InboundLpnEntity } from '@modules/Inbound/Domain/Entities/InboundLpnEntity';
import { InboundPutawayReleaseEntity } from '@modules/Inbound/Domain/Entities/InboundPutawayReleaseEntity';
import { QcResultEntity } from '@modules/Inbound/Domain/Entities/QcResultEntity';
import { QcTaskEntity } from '@modules/Inbound/Domain/Entities/QcTaskEntity';
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
  CreateInboundLpn(lpn: InboundLpnEntity, manager?: EntityManager): Promise<InboundLpnEntity>;
  FindInboundLpnById(id: string): Promise<InboundLpnEntity | null>;
  FindInboundLpnByReceiptLineId(receiptLineId: string): Promise<InboundLpnEntity | null>;
  FindInboundLpnByIdempotencyKey(receiptLineId: string, idempotencyKey: string): Promise<InboundLpnEntity | null>;
  FindInboundLpnByScopeCode(warehouseId: string, ownerId: string, lpnCode: string): Promise<InboundLpnEntity | null>;
  CreateInboundPutawayRelease(
    release: InboundPutawayReleaseEntity,
    manager?: EntityManager,
  ): Promise<InboundPutawayReleaseEntity>;
  FindInboundPutawayReleaseByIdempotencyKey(
    receiptLineId: string,
    idempotencyKey: string,
  ): Promise<InboundPutawayReleaseEntity | null>;
  CreateQcTask(task: QcTaskEntity, manager?: EntityManager): Promise<QcTaskEntity>;
  UpdateQcTask(task: QcTaskEntity, manager?: EntityManager): Promise<QcTaskEntity>;
  FindQcTaskById(id: string): Promise<QcTaskEntity | null>;
  FindQcTaskByIdempotencyKey(receiptId: string, idempotencyKey: string): Promise<QcTaskEntity | null>;
  FindLatestQcTaskByReceiptLineId(receiptLineId: string): Promise<QcTaskEntity | null>;
  CreateQcResult(result: QcResultEntity, manager?: EntityManager): Promise<QcResultEntity>;
  FindQcResultByIdempotencyKey(qcTaskId: string, idempotencyKey: string): Promise<QcResultEntity | null>;
  FindLatestQcResultByReceiptLineId(receiptLineId: string): Promise<QcResultEntity | null>;
}
