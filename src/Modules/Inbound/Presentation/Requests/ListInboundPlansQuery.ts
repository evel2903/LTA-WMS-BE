import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';

export class ListInboundPlansQuery {
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
  public SourceDocumentNumber?: string;

  @IsOptional()
  @IsString()
  public OwnerId?: string;

  @IsOptional()
  @IsString()
  public WarehouseId?: string;

  @IsOptional()
  @IsEnum(InboundPlanDocumentStatus)
  public Status?: InboundPlanDocumentStatus;
}
