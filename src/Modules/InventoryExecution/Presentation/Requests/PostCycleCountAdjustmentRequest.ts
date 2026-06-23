import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CycleCountReasonedRequest } from '@modules/InventoryExecution/Presentation/Requests/CycleCountReasonedRequest';

export class PostCycleCountAdjustmentRequest extends CycleCountReasonedRequest {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  public ApprovalRequestId?: string | null;
}
