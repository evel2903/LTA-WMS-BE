import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateLabelTemplateVersionRequest {
  @IsArray()
  @IsString({ each: true })
  public RequiredFields!: string[];

  @IsString()
  @IsNotEmpty()
  public TemplateBody!: string;
}
