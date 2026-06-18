export class WarehouseProfileRuleDto {
  public Id!: string;
  public WarehouseProfileId!: string;
  public RuleDefinitionId!: string;
  public IsEnabled!: boolean;
  public OverridePriority!: number | null;
  public SourceSystem!: string | null;
  public ReferenceId!: string | null;
  public CreatedAt!: string;
  public UpdatedAt!: string;
  public CreatedBy!: string | null;
  public UpdatedBy!: string | null;
}
