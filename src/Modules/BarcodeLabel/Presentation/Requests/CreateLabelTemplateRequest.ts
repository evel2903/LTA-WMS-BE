import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { LabelTemplateStatus } from '@modules/BarcodeLabel/Domain/Enums/LabelTemplateStatus';

export class CreateLabelTemplateRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  public TemplateCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  public TemplateName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public LabelType!: string;

  @IsArray()
  @IsString({ each: true })
  public RequiredFields!: string[];

  @IsString()
  @IsNotEmpty()
  public TemplateBody!: string;

  @IsOptional()
  @IsEnum(LabelTemplateStatus)
  public Status?: LabelTemplateStatus;
}
