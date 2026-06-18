export class CreateWarehouseProfileRuleDto {
  public WarehouseProfileId!: string;
  public RuleDefinitionId!: string;
  public IsEnabled?: boolean;
  public OverridePriority?: number;
  public SourceSystem?: string;
  public ReferenceId?: string;
  public CreatedBy?: string;
}
