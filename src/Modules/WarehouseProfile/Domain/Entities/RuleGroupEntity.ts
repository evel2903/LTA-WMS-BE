import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';

export class RuleGroupEntity {
  public readonly Id: string;
  public GroupCode: string;
  public GroupName: string;
  public Description: string | null;
  public CatalogState: RuleGroupCatalogState;
  public DisplayOrder: number | null;

  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    GroupCode: string;
    GroupName: string;
    Description?: string | null;
    CatalogState: RuleGroupCatalogState;
    DisplayOrder?: number | null;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.GroupCode = params.GroupCode;
    this.GroupName = params.GroupName;
    this.Description = params.Description ?? null;
    this.CatalogState = params.CatalogState;
    this.DisplayOrder = params.DisplayOrder ?? null;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
