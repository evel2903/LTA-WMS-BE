import { NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { DataScopeEntity } from '@modules/AccessControl/Domain/Entities/DataScopeEntity';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IDataScopeRepository } from '@modules/AccessControl/Application/Interfaces/IDataScopeRepository';

/**
 * Removes a data scope grant from a user. The scope must belong to that user (looked up by
 * principal) — removing a scope by id that belongs to a role/another user → NotFound, so the
 * route can never delete a foreign grant. Audited (C5).
 */
export class RemoveDataScopeFromUserUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case bare.
  constructor(
    private readonly dataScopeRepository: IDataScopeRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    input: { UserId: string; ScopeId: string },
    context: AuditContext = SystemAuditContext,
  ): Promise<{ Removed: boolean }> {
    const scopes = await this.dataScopeRepository.FindByPrincipal(PrincipalType.User, input.UserId);
    const existing = scopes.find((s) => s.Id === input.ScopeId);
    if (!existing) throw new NotFoundException('Data scope not found for this user');

    const before = this.ToJson(existing);
    const buildEntry = () =>
      MergeAuditContext(context, {
        Action: ActionCode.DeleteCancel,
        ObjectType: ObjectType.UserAssignment,
        ObjectId: existing.Id,
        ObjectCode: existing.ScopeType,
        BeforeJson: before,
      });

    if (!this.auditedTransaction) {
      await this.dataScopeRepository.Delete(existing.Id);
      return { Removed: true };
    }
    return this.auditedTransaction.Run(async (manager) => {
      await this.dataScopeRepository.Delete(existing.Id, manager);
      return { result: { Removed: true }, entry: buildEntry() };
    });
  }

  private ToJson(scope: DataScopeEntity): Record<string, unknown> {
    return {
      Id: scope.Id,
      UserId: scope.PrincipalId,
      ScopeType: scope.ScopeType,
      ScopeValueId: scope.ScopeValueId,
      ScopeValueCode: scope.ScopeValueCode,
      IncludeAll: scope.IncludeAll,
    };
  }
}
