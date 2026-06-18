export class WarehouseProfileRuleEntity {
  public readonly Id: string;
  public WarehouseProfileId: string;
  public RuleDefinitionId: string;
  public IsEnabled: boolean;
  public OverridePriority: number | null;

  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    WarehouseProfileId: string;
    RuleDefinitionId: string;
    IsEnabled?: boolean;
    OverridePriority?: number | null;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.WarehouseProfileId = params.WarehouseProfileId;
    this.RuleDefinitionId = params.RuleDefinitionId;
    this.IsEnabled = params.IsEnabled ?? true;
    this.OverridePriority = params.OverridePriority ?? null;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
