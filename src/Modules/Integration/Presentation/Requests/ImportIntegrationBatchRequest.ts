import { Type } from 'class-transformer';
import { ArrayMinSize, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { IntegrationEnvelopeRequest } from '@modules/Integration/Presentation/Requests/IntegrationEnvelopeRequest';

export class ImportIntegrationBatchRequest {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  public BatchReference?: string | null;

  @ValidateNested({ each: true })
  @Type(() => IntegrationEnvelopeRequest)
  @ArrayMinSize(1)
  public Messages!: IntegrationEnvelopeRequest[];
}
