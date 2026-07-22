import { NotFoundException } from '@common/Exceptions/AppException';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { RoleDto } from '@modules/AccessControl/Application/DTOs/RoleDto';
import { IRoleCatalogRepository } from '@modules/AccessControl/Application/Interfaces/IRoleCatalogRepository';
import { RoleDtoMapper } from '@modules/AccessControl/Application/Mappers/RoleDtoMapper';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

/** Reusable application seam only. RH-05 intentionally exposes no public delete endpoint. */
export class DeleteRoleUseCase {
  constructor(
    private readonly catalogRepository: IRoleCatalogRepository,
    private readonly auditedTransaction: AuditedTransaction,
  ) {}

  public async Execute(roleId: string, context: AuditContext = SystemAuditContext): Promise<RoleDto> {
    return this.auditedTransaction.Run(async (manager) => {
      const deleted = await this.catalogRepository.DeleteUnassigned(roleId, manager);
      if (!deleted) throw new NotFoundException('Role not found');
      await this.catalogRepository.Bump(manager);
      const before = RoleDtoMapper.ToDto(deleted);
      return {
        result: before,
        entry: MergeAuditContext(context, {
          Action: ActionCode.DeleteCancel,
          ObjectType: ObjectType.Role,
          ObjectId: deleted.Id,
          ObjectCode: deleted.RoleCode,
          BeforeJson: before as unknown as Record<string, unknown>,
        }),
      };
    });
  }
}
