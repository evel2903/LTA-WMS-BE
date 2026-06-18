import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';

export class CreateRuleGroupRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public GroupCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public GroupName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public Description?: string;

  @IsOptional()
  @IsEnum(RuleGroupCatalogState)
  public CatalogState?: RuleGroupCatalogState;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  public DisplayOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public SourceSystem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReferenceId?: string;
}
