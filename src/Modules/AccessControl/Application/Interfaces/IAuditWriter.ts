import { EntityManager } from 'typeorm';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';

export const AUDIT_WRITER = Symbol('IAuditWriter');

/**
 * Appends an audit record inside the command's transaction (architecture 6.5). The
 * caller owns the transaction (`DataSource.transaction(manager => ...)`) and passes its
 * `manager`; if the command rolls back, the audit row rolls back with it. The writer
 * must NOT open its own transaction.
 */
export interface IAuditWriter {
  Append(entry: AuditEntry, manager: EntityManager): Promise<void>;
}
