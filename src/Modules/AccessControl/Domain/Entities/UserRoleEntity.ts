import { UserRoleSource } from '@modules/AccessControl/Domain/Enums/UserRoleSource';

export class UserRoleEntity {
  public readonly Id: string;
  public UserId: string;
  public RoleId: string;
  public Source: UserRoleSource;
  public readonly AssignedAt: Date;
  public AssignedBy: string | null;

  constructor(params: {
    Id: string;
    UserId: string;
    RoleId: string;
    Source?: UserRoleSource;
    AssignedAt: Date;
    AssignedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.UserId = params.UserId;
    this.RoleId = params.RoleId;
    this.Source = params.Source ?? UserRoleSource.Manual;
    this.AssignedAt = params.AssignedAt;
    this.AssignedBy = params.AssignedBy ?? null;
  }
}
