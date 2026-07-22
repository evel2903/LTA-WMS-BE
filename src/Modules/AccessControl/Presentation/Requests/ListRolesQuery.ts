import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';

export class ListRolesQuery {
  @IsOptional()
  @Type(() => Number)
  @ValidateIf((query: ListRolesQuery) => query.CompleteCatalog !== true)
  @IsInt()
  @Min(1)
  public Page?: number;

  @IsOptional()
  @Type(() => Number)
  @ValidateIf((query: ListRolesQuery) => query.CompleteCatalog !== true)
  @IsInt()
  @Min(1)
  @Max(100)
  public PageSize?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  public CompleteCatalog?: boolean;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value : ''))
  @IsString()
  public CatalogToken?: string;

  @IsOptional()
  @IsString()
  public Search?: string;

  @IsOptional()
  @IsString()
  public Status?: string;

  @IsOptional()
  @IsString()
  public SortBy?: string;

  @IsOptional()
  @IsString()
  public SortDirection?: string;
}
