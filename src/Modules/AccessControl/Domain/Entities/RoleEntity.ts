import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';

export class RoleEntity {
  public readonly Id: string;
  public RoleCode: string;
  public RoleName: string;
  public Description: string | null;
  public IsSystem: boolean;
  public Status: RoleStatus;
  /** Optimistic-lock counter for role_permissions writes (RA-04 review) -- bumped by both
   * SetRolePermissionsUseCase and ResetRolePermissionsUseCase on every successful change. */
  public PermissionsVersion: number;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    RoleCode: string;
    RoleName: string;
    Description?: string | null;
    IsSystem?: boolean;
    Status?: RoleStatus;
    PermissionsVersion?: number;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.RoleCode = params.RoleCode;
    this.RoleName = params.RoleName;
    this.Description = params.Description ?? null;
    this.IsSystem = params.IsSystem ?? false;
    this.Status = params.Status ?? RoleStatus.Active;
    this.PermissionsVersion = params.PermissionsVersion ?? 0;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
