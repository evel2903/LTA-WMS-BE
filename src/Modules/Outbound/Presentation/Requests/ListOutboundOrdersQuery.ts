import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OutboundOrderStatus } from '@modules/Outbound/Domain/Enums/OutboundOrderStatus';

export class ListOutboundOrdersQuery {
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
  public SourceSystem?: string;

  @IsOptional()
  @IsString()
  public SourceReference?: string;

  @IsOptional()
  @IsString()
  public OwnerId?: string;

  @IsOptional()
  @IsString()
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  public CustomerId?: string;

  @IsOptional()
  @IsEnum(OutboundOrderStatus)
  public DocumentStatus?: OutboundOrderStatus;
}
