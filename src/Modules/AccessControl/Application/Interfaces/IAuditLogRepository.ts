import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AuditLogEntity } from '@modules/AccessControl/Domain/Entities/AuditLogEntity';

export const AUDIT_LOG_REPOSITORY = Symbol('IAuditLogRepository');

export interface AuditLogQueryFilter {
  ActorUserId?: string;
  Action?: ActionCode;
  ObjectType?: ObjectType;
  ObjectId?: string;
  ReasonCodeId?: string;
  From?: Date;
  To?: Date;
}

/**
 * Read-only access to audit_logs. By design there is NO update/delete here — audit is
 * append-only (writes happen only via IAuditWriter; immutability is also DB-enforced).
 */
export interface IAuditLogRepository {
  FindById(id: string): Promise<AuditLogEntity | null>;
  Query(
    skip: number,
    take: number,
    filter?: AuditLogQueryFilter,
  ): Promise<{ Items: AuditLogEntity[]; TotalItems: number }>;
}
