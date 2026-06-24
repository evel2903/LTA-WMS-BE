import { IsEnum, IsString, MaxLength } from 'class-validator';
import { IntegrationFailureCategory } from '@modules/Integration/Domain/Enums/IntegrationFailureCategory';

export class RecordOutboxFailureRequest {
  @IsEnum(IntegrationFailureCategory)
  public FailureCategory!: IntegrationFailureCategory;

  @IsString()
  @MaxLength(2000)
  public ErrorMessage!: string;
}
