import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListReceiptsQuery {
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
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  public OwnerId?: string;

  @IsOptional()
  @IsString()
  public Search?: string;

  @IsOptional()
  @IsIn(['CreatedAt', 'ReceiptNumber'])
  public SortBy?: 'CreatedAt' | 'ReceiptNumber';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  public SortDirection?: 'ASC' | 'DESC';
}
