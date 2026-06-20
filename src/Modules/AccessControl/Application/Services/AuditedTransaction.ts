import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { IAuditWriter, AUDIT_WRITER } from '@modules/AccessControl/Application/Interfaces/IAuditWriter';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';

/**
 * Runs a mutation and its audit record in ONE transaction (architecture 6.5): the work
 * callback performs the write via the transaction `manager` and returns the result plus
 * the audit entry; the entry is appended in the same transaction, so a failure rolls both
 * back. Use cases inject this instead of wiring DataSource + IAuditWriter individually.
 */
@Injectable()
export class AuditedTransaction {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(AUDIT_WRITER) private readonly auditWriter: IAuditWriter,
  ) {}

  public async Run<T>(work: (manager: EntityManager) => Promise<{ result: T; entry: AuditEntry }>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const { result, entry } = await work(manager);
      await this.auditWriter.Append(entry, manager);
      return result;
    });
  }
}
