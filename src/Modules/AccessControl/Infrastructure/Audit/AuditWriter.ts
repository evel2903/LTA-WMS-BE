import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IAuditWriter } from '@modules/AccessControl/Application/Interfaces/IAuditWriter';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { AuditLogOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/AuditLogOrmMapper';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';

/**
 * Writes one audit row through the CALLER's transaction manager, so the audit shares
 * the command's transaction lifetime (commit/rollback together). It never opens its
 * own transaction.
 */
@Injectable()
export class AuditWriter implements IAuditWriter {
  public async Append(entry: AuditEntry, manager: EntityManager): Promise<void> {
    const orm = AuditLogOrmMapper.FromEntry(entry);
    // save() with a freshly generated UUID PK always issues an INSERT (the row never
    // pre-exists), so this is effectively append-only; `.insert()` is avoided because its
    // QueryDeepPartialEntity typing conflicts with the jsonb (Record) columns.
    await manager.getRepository(AuditLogOrmEntity).save(orm);
  }
}
