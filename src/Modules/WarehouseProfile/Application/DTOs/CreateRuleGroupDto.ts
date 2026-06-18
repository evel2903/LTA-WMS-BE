import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';

export class CreateRuleGroupDto {
  public GroupCode!: string;
  public GroupName!: string;
  public Description?: string;
  public CatalogState?: RuleGroupCatalogState;
  public DisplayOrder?: number;
  public SourceSystem?: string;
  public ReferenceId?: string;
  public CreatedBy?: string;
}
