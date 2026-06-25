import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ListReconciliationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public Page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public PageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public BusinessReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public OwnerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  public RunStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  public ItemStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  public Severity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public MismatchType?: string;

  @IsOptional()
  @IsDateString()
  public CreatedFrom?: string;

  @IsOptional()
  @IsDateString()
  public CreatedTo?: string;

  @IsOptional()
  @IsDateString()
  public UpdatedFrom?: string;

  @IsOptional()
  @IsDateString()
  public UpdatedTo?: string;
}
