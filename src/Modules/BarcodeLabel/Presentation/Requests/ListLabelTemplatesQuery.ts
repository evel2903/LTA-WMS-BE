import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { LabelTemplateStatus } from '@modules/BarcodeLabel/Domain/Enums/LabelTemplateStatus';

export class ListLabelTemplatesQuery {
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
  @MaxLength(80)
  public TemplateCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public LabelType?: string;

  @IsOptional()
  @IsEnum(LabelTemplateStatus)
  public Status?: LabelTemplateStatus;
}
