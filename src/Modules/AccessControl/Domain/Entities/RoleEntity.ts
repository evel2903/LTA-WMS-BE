import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';

export class RoleEntity {
  public readonly Id: string;
  public RoleCode: string;
  public RoleName: string;
  public Description: string | null;
  public IsSystem: boolean;
  public Status: RoleStatus;
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
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
