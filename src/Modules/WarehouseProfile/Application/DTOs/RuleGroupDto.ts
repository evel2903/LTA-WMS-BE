import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';

export class RuleGroupDto {
  public Id!: string;
  public GroupCode!: string;
  public GroupName!: string;
  public Description!: string | null;
  public CatalogState!: RuleGroupCatalogState;
  public DisplayOrder!: number | null;
  public SourceSystem!: string | null;
  public ReferenceId!: string | null;
  public CreatedAt!: string;
  public UpdatedAt!: string;
  public CreatedBy!: string | null;
  public UpdatedBy!: string | null;
}
