import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionEntity } from '@modules/AccessControl/Domain/Entities/PermissionEntity';
import { IPermissionRepository } from '@modules/AccessControl/Application/Interfaces/IPermissionRepository';
import { IRolePermissionRepository } from '@modules/AccessControl/Application/Interfaces/IRolePermissionRepository';

/**
 * V0 approval matrix = RBAC (architecture 6.7 / story C6 decision 5). A "valid approver"
 * exists when at least one role is granted `(Approve, ApprovalRequest)`. Threshold from
 * Warehouse Profile / owner and per-scope principal resolution are deferred (Open Questions);
 * here we verify the coarse `(action, object)` grant exists so requests are never created
 * for an action no one can ever approve.
 */
export class ApproverDirectory {
  constructor(
    private readonly permissionRepository: IPermissionRepository,
    private readonly rolePermissionRepository: IRolePermissionRepository,
  ) {}

  public async HasApprover(): Promise<boolean> {
    const code = PermissionEntity.BuildCode(ActionCode.Approve, ObjectType.ApprovalRequest);
    const permission = await this.permissionRepository.FindByCode(code);
    if (!permission) return false;
    const grants = await this.rolePermissionRepository.FindByPermissionId(permission.Id);
    return grants.length > 0;
  }
}
