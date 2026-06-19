import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';

/**
 * A scope grant binding a principal (user/role/group) to a data partition
 * (warehouse/zone/owner/customer). `IncludeAll` = unrestricted for that scope type.
 * Runtime enforcement (C2): the checker matches a target scope value against these.
 */
export class DataScopeEntity {
  public readonly Id: string;
  public PrincipalType: PrincipalType;
  public PrincipalId: string;
  public ScopeType: DataScopeType;
  public ScopeValueId: string | null;
  public ScopeValueCode: string | null;
  public IncludeAll: boolean;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    PrincipalType: PrincipalType;
    PrincipalId: string;
    ScopeType: DataScopeType;
    ScopeValueId?: string | null;
    ScopeValueCode?: string | null;
    IncludeAll?: boolean;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.PrincipalType = params.PrincipalType;
    this.PrincipalId = params.PrincipalId;
    this.ScopeType = params.ScopeType;
    this.ScopeValueId = params.ScopeValueId ?? null;
    this.ScopeValueCode = params.ScopeValueCode ?? null;
    this.IncludeAll = params.IncludeAll ?? false;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
