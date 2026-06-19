export class RolePermissionEntity {
  public readonly Id: string;
  public RoleId: string;
  public PermissionId: string;
  public readonly CreatedAt: Date;
  public CreatedBy: string | null;

  constructor(params: {
    Id: string;
    RoleId: string;
    PermissionId: string;
    CreatedAt: Date;
    CreatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.RoleId = params.RoleId;
    this.PermissionId = params.PermissionId;
    this.CreatedAt = params.CreatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
  }
}
