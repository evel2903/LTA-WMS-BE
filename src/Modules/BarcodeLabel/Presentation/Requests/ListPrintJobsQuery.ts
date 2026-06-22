import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PrintJobStatus } from '@modules/BarcodeLabel/Domain/Enums/PrintJobStatus';

export class ListPrintJobsQuery {
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
  public TemplateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public BusinessObjectType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public BusinessObjectId?: string;

  @IsOptional()
  @IsEnum(PrintJobStatus)
  public Status?: PrintJobStatus;
}
