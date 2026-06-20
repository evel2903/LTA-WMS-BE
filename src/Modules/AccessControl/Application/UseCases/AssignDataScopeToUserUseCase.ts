import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { DataScopeEntity } from '@modules/AccessControl/Domain/Entities/DataScopeEntity';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { DataScopeDto } from '@modules/AccessControl/Application/DTOs/DataScopeDto';
import { DataScopeDtoMapper } from '@modules/AccessControl/Application/Mappers/DataScopeDtoMapper';
import { IDataScopeRepository } from '@modules/AccessControl/Application/Interfaces/IDataScopeRepository';

export interface AssignDataScopeInput {
  UserId: string;
  ScopeType: DataScopeType;
  ScopeValueId?: string | null;
  ScopeValueCode?: string | null;
  IncludeAll?: boolean;
}

/**
 * Grants a data scope (warehouse/zone/owner/customer) directly to a user. Either
 * `IncludeAll` (unrestricted for that scope type) OR a concrete value — not both, not
 * neither. Duplicate grant → Conflict. Audited (C5); enforcement of WHO may call this
 * (PermissionGuard against UserAssignment) is C2.
 */
export class AssignDataScopeToUserUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it. This is AUDIT-ONLY (no ownership policy / reason code).
  constructor(
    private readonly dataScopeRepository: IDataScopeRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(input: AssignDataScopeInput, context: AuditContext = SystemAuditContext): Promise<DataScopeDto> {
    const includeAll = input.IncludeAll ?? false;
    const scopeValueId = input.ScopeValueId ?? null;
    const scopeValueCode = input.ScopeValueCode ?? null;

    if (includeAll && (scopeValueId !== null || scopeValueCode !== null)) {
      throw new BusinessRuleException('A data scope cannot set IncludeAll together with a scope value');
    }
    if (!includeAll && scopeValueId === null && scopeValueCode === null) {
      throw new BusinessRuleException('A data scope requires either IncludeAll or a scope value');
    }

    const existing = await this.dataScopeRepository.FindByPrincipal(PrincipalType.User, input.UserId);
    const duplicate = existing.some(
      (s) =>
        s.ScopeType === input.ScopeType &&
        (includeAll
          ? s.IncludeAll
          : // Match the full value identity, not just ScopeValueId: a code-only grant
            // stores ScopeValueId=null, so two distinct codes (both null id) must not
            // collide on `null === null`.
            !s.IncludeAll && s.ScopeValueId === scopeValueId && s.ScopeValueCode === scopeValueCode),
    );
    if (duplicate) throw new ConflictException('User already has this data scope');

    const now = new Date();
    const scope = new DataScopeEntity({
      Id: randomUUID(),
      PrincipalType: PrincipalType.User,
      PrincipalId: input.UserId,
      ScopeType: input.ScopeType,
      ScopeValueId: scopeValueId,
      ScopeValueCode: scopeValueCode,
      IncludeAll: includeAll,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: context.ActorUserId,
      UpdatedBy: null,
    });

    const buildEntry = (created: DataScopeEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.UserAssignment,
        ObjectId: created.Id,
        ObjectCode: created.ScopeType,
        AfterJson: { UserId: input.UserId, ...DataScopeDtoMapper.ToDto(created) } as unknown as Record<string, unknown>,
      });

    if (!this.auditedTransaction) {
      const created = await this.dataScopeRepository.Create(scope);
      return DataScopeDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.dataScopeRepository.Create(scope, manager);
      return { result: DataScopeDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
