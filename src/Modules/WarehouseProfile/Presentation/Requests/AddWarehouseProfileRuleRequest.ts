import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AddWarehouseProfileRuleRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public RuleDefinitionId!: string;

  @IsOptional()
  @IsBoolean()
  public IsEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  public OverridePriority?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public SourceSystem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReferenceId?: string;
}
