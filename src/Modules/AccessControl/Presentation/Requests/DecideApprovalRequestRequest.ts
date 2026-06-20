import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

/** Body for POST /approval-requests/:id/approve and /:id/reject. */
export class DecideApprovalRequestRequest {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public ReasonNote?: string;

  @IsOptional()
  @IsArray()
  public EvidenceRefs?: unknown[];
}
