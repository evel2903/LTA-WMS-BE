import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

/** Body for POST /exceptions/:id/resolve. */
export class ResolveExceptionRequest {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public ResolutionNote?: string;

  @IsOptional()
  @IsArray()
  public EvidenceRefs?: unknown[];
}
