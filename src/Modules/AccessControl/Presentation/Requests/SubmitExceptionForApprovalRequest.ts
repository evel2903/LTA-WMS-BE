import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/** Body for POST /exceptions/:id/submit. */
export class SubmitExceptionForApprovalRequest {
  @IsOptional()
  @IsBoolean()
  public RequireApproval?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public ReasonNote?: string;
}
