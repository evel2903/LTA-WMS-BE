import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveCoreFlowInstanceQuery {
  @IsString()
  @MaxLength(100)
  public BusinessReference!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public WarehouseCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public OwnerCode?: string;
}
