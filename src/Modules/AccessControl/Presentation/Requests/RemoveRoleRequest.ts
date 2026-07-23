import { IsOptional, IsString } from 'class-validator';

/** RH-04 remove (DELETE) body. Dual-protocol: both present => ticketed apply; both absent =>
 * compatibility adapter. Version format is validated in the use case. */
export class RemoveRoleRequest {
  @IsOptional()
  @IsString()
  public RunId?: string;

  @IsOptional()
  @IsString()
  public IntentVersion?: string;
}
