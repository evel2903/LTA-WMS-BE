import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class PreviewPrintJobRequest {
  @IsString()
  @IsNotEmpty()
  public TemplateId!: string;

  @IsOptional()
  @IsString()
  public TemplateVersionId?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  public BusinessObjectType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  public BusinessObjectId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public BusinessObjectCode?: string | null;

  @IsOptional()
  @IsString()
  public WarehouseId?: string | null;

  @IsOptional()
  @IsString()
  public OwnerId?: string | null;

  @IsObject()
  public PayloadJson!: Record<string, unknown>;
}
