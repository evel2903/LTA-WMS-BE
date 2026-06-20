import { IsBoolean, IsOptional } from 'class-validator';

/** Body for POST /exceptions/:id/log. */
export class LogExceptionRequest {
  @IsOptional()
  @IsBoolean()
  public HardBlock?: boolean;
}
