import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ListIntegrationQuery {
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
  @MaxLength(100)
  public SourceSystem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  public Status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public EventType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public BusinessReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public WarehouseContext?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public OwnerContext?: string;

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
