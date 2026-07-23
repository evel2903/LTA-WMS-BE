import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { IAssignmentLedgerRepository } from '@modules/AccessControl/Application/Interfaces/IAssignmentLedgerRepository';
import {
  HeadRecord,
  HeadStatus,
  IntentRecord,
  IntentStatus,
} from '@modules/AccessControl/Application/DTOs/AssignmentIntent';

/**
 * RH-04 (RH-ASG-01 / D3) transactional ledger over raw SQL so lock modes (FOR KEY SHARE /
 * FOR UPDATE / FOR SHARE) are explicit and the global lock order is enforced by call sequence.
 * BIGINT columns round-trip as decimal strings (node-postgres default) matching AssignmentVersion.
 */
export class AssignmentLedgerRepository implements IAssignmentLedgerRepository {
  public async LockUserForKeyShare(manager: EntityManager, userId: string): Promise<boolean> {
    const rows = await manager.query(`SELECT id FROM users WHERE id = $1 FOR KEY SHARE`, [userId]);
    return rows.length > 0;
  }

  public async LockRoleForKeyShareByCode(
    manager: EntityManager,
    canonicalRoleCode: string,
  ): Promise<{ RoleId: string } | null> {
    const rows = await manager.query(`SELECT id FROM roles WHERE role_code = $1 FOR KEY SHARE`, [canonicalRoleCode]);
    return rows.length ? { RoleId: rows[0].id } : null;
  }

  public async EnsureAndLockEffectiveVersion(manager: EntityManager, userId: string): Promise<string> {
    await manager.query(
      `INSERT INTO user_effective_versions (user_id, effective_version) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
    const rows = await manager.query(
      `SELECT effective_version FROM user_effective_versions WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );
    return String(rows[0].effective_version);
  }

  /** Read the per-user effective version FOR SHARE WITHOUT bootstrapping a row — a `Read`-permission
   * caller (recovery / effective-permissions) must not write. Absent row => canonical '0'; a real
   * row is created only on register/apply (write paths). */
  public async ReadEffectiveVersionShared(manager: EntityManager, userId: string): Promise<string> {
    const rows = await manager.query(
      `SELECT effective_version FROM user_effective_versions WHERE user_id = $1 FOR SHARE`,
      [userId],
    );
    return rows.length ? String(rows[0].effective_version) : '0';
  }

  public async IncrementEffectiveVersion(manager: EntityManager, userId: string, next: string): Promise<void> {
    await manager.query(
      `UPDATE user_effective_versions SET effective_version = $2, updated_at = now() WHERE user_id = $1`,
      [userId, next],
    );
  }

  public async EnsureAndLockHeadForUpdate(manager: EntityManager, userId: string, roleId: string): Promise<HeadRecord> {
    await manager.query(
      `INSERT INTO user_role_assignment_heads (id, user_id, role_id, current_intent_version, current_run_id, status)
       VALUES ($1, $2, $3, 0, NULL, 'Idle') ON CONFLICT (user_id, role_id) DO NOTHING`,
      [randomUUID(), userId, roleId],
    );
    const rows = await manager.query(
      `SELECT id, user_id, role_id, current_intent_version, current_run_id, status
       FROM user_role_assignment_heads WHERE user_id = $1 AND role_id = $2 FOR UPDATE`,
      [userId, roleId],
    );
    return this.toHead(rows[0]);
  }

  /** Read the (user, role) head FOR SHARE WITHOUT bootstrapping a row — recovery is a `Read` and must
   * not write. Absent => null (caller treats it as a virtual Idle/version-0 snapshot); the head row is
   * created only on register/apply. Not bootstrapping here also stops a merely-viewed (user, role)
   * from pinning the FK-restricted users/roles rows (Review Finding, round 1). */
  public async ReadHeadShared(manager: EntityManager, userId: string, roleId: string): Promise<HeadRecord | null> {
    const rows = await manager.query(
      `SELECT id, user_id, role_id, current_intent_version, current_run_id, status
       FROM user_role_assignment_heads WHERE user_id = $1 AND role_id = $2 FOR SHARE`,
      [userId, roleId],
    );
    return rows.length ? this.toHead(rows[0]) : null;
  }

  public async UpdateHead(
    manager: EntityManager,
    id: string,
    fields: { CurrentIntentVersion: string; CurrentRunId: string | null; Status: HeadStatus },
  ): Promise<void> {
    await manager.query(
      `UPDATE user_role_assignment_heads
       SET current_intent_version = $2, current_run_id = $3, status = $4, updated_at = now() WHERE id = $1`,
      [id, fields.CurrentIntentVersion, fields.CurrentRunId, fields.Status],
    );
  }

  public async FindIntentByRunId(manager: EntityManager, runId: string): Promise<IntentRecord | null> {
    const rows = await manager.query(
      `SELECT run_id, actor_user_id, user_id, role_id, canonical_role_code, operation, intent_version,
              status, effective_version, outcome
       FROM user_role_assignment_intents WHERE run_id = $1`,
      [runId],
    );
    return rows.length ? this.toIntent(rows[0]) : null;
  }

  /** Recovery reads the current intent FOR SHARE (AC6) so it cannot transition mid-snapshot. Apply and
   * register keep the unlocked read — they already hold the head FOR UPDATE, which gates every
   * transition. */
  public async FindIntentByRunIdShared(manager: EntityManager, runId: string): Promise<IntentRecord | null> {
    const rows = await manager.query(
      `SELECT run_id, actor_user_id, user_id, role_id, canonical_role_code, operation, intent_version,
              status, effective_version, outcome
       FROM user_role_assignment_intents WHERE run_id = $1 FOR SHARE`,
      [runId],
    );
    return rows.length ? this.toIntent(rows[0]) : null;
  }

  public async InsertIntent(manager: EntityManager, intent: IntentRecord): Promise<void> {
    await manager.query(
      `INSERT INTO user_role_assignment_intents
         (run_id, actor_user_id, user_id, role_id, canonical_role_code, operation, intent_version, status,
          effective_version, outcome)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        intent.RunId,
        intent.ActorUserId,
        intent.UserId,
        intent.RoleId,
        intent.CanonicalRoleCode,
        intent.Operation,
        intent.IntentVersion,
        intent.Status,
        intent.EffectiveVersion,
        intent.Outcome === null ? null : JSON.stringify(intent.Outcome),
      ],
    );
  }

  public async SupersedeRegistered(
    manager: EntityManager,
    userId: string,
    roleId: string,
    excludeRunId: string,
  ): Promise<void> {
    await manager.query(
      `UPDATE user_role_assignment_intents SET status = 'Superseded'
       WHERE user_id = $1 AND role_id = $2 AND status = 'Registered' AND run_id <> $3`,
      [userId, roleId, excludeRunId],
    );
  }

  public async FinalizeIntent(
    manager: EntityManager,
    runId: string,
    fields: { Status: IntentStatus; EffectiveVersion: string | null; Outcome: Record<string, unknown> },
  ): Promise<void> {
    await manager.query(
      `UPDATE user_role_assignment_intents SET status = $2, effective_version = $3, outcome = $4 WHERE run_id = $1`,
      [runId, fields.Status, fields.EffectiveVersion, JSON.stringify(fields.Outcome)],
    );
  }

  public async FindAssignment(manager: EntityManager, userId: string, roleId: string): Promise<{ Id: string } | null> {
    const rows = await manager.query(`SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2`, [userId, roleId]);
    return rows.length ? { Id: rows[0].id } : null;
  }

  public async InsertAssignment(
    manager: EntityManager,
    row: { Id: string; UserId: string; RoleId: string; Source: string; AssignedBy: string | null },
  ): Promise<Date> {
    const rows = await manager.query(
      `INSERT INTO user_roles (id, user_id, role_id, source, assigned_at, assigned_by)
       VALUES ($1, $2, $3, $4, now(), $5) RETURNING assigned_at`,
      [row.Id, row.UserId, row.RoleId, row.Source, row.AssignedBy],
    );
    return new Date(rows[0].assigned_at);
  }

  public async DeleteAssignment(manager: EntityManager, id: string): Promise<void> {
    await manager.query(`DELETE FROM user_roles WHERE id = $1`, [id]);
  }

  public async ReadAssignedRoleCodesShared(manager: EntityManager, userId: string): Promise<string[]> {
    const rows = await manager.query(
      `SELECT r.role_code FROM user_roles ur JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1 ORDER BY r.role_code`,
      [userId],
    );
    return rows.map((r: { role_code: string }) => r.role_code);
  }

  private toHead(row: {
    id: string;
    user_id: string;
    role_id: string;
    current_intent_version: string | number;
    current_run_id: string | null;
    status: string;
  }): HeadRecord {
    return {
      Id: row.id,
      UserId: row.user_id,
      RoleId: row.role_id,
      CurrentIntentVersion: String(row.current_intent_version),
      CurrentRunId: row.current_run_id,
      Status: row.status as HeadStatus,
    };
  }

  private toIntent(row: {
    run_id: string;
    actor_user_id: string;
    user_id: string;
    role_id: string;
    canonical_role_code: string;
    operation: string;
    intent_version: string | number;
    status: string;
    effective_version: string | number | null;
    outcome: Record<string, unknown> | null;
  }): IntentRecord {
    return {
      RunId: row.run_id,
      ActorUserId: row.actor_user_id,
      UserId: row.user_id,
      RoleId: row.role_id,
      CanonicalRoleCode: row.canonical_role_code,
      Operation: row.operation as IntentRecord['Operation'],
      IntentVersion: String(row.intent_version),
      Status: row.status as IntentStatus,
      EffectiveVersion: row.effective_version === null ? null : String(row.effective_version),
      Outcome: row.outcome,
    };
  }
}
