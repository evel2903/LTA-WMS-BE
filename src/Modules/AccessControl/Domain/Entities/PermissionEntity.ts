import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

/**
 * Atomic `(Action, ObjectType)` permission. `PermissionCode` is the normalized
 * `{Action}:{ObjectType}` token used for stable seed/lookup.
 */
export class PermissionEntity {
  public readonly Id: string;
  public Action: ActionCode;
  public ObjectType: ObjectType;
  public PermissionCode: string;
  public Description: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    Action: ActionCode;
    ObjectType: ObjectType;
    PermissionCode?: string;
    Description?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.Action = params.Action;
    this.ObjectType = params.ObjectType;
    this.PermissionCode = params.PermissionCode ?? PermissionEntity.BuildCode(params.Action, params.ObjectType);
    this.Description = params.Description ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }

  public static BuildCode(action: ActionCode, objectType: ObjectType): string {
    return `${action}:${objectType}`;
  }
}
