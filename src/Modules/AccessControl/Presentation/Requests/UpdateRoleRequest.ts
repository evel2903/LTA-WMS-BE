import { Transform } from 'class-transformer';
import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';

export class UpdateRoleRequest {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  @IsISO8601({ strict: true, strictSeparator: true })
  public ExpectedUpdatedAt!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public RoleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public Description?: string | null;

  @IsOptional()
  @IsEnum(RoleStatus)
  public Status?: RoleStatus;
}
