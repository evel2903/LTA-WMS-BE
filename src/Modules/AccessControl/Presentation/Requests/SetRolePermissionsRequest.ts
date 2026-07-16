import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

// Wire shape is lower-camel (contract §4 Signal 3, RATIFIED) -- unlike most of this API's
// PascalCase bodies. See RoleController.SetPermissions for the explicit mapping to the
// PascalCase Application DTO.
export class PermissionPairRequest {
  @IsEnum(ActionCode)
  public action!: ActionCode;

  @IsEnum(ObjectType)
  public objectType!: ObjectType;
}

export class SetRolePermissionsRequest {
  // Empty array is a legitimate declarative "revoke everything" (contract §4 AC1) --
  // ArrayNotEmpty is deliberately NOT used here.
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionPairRequest)
  public permissions!: PermissionPairRequest[];

  // Must equal the role's current permissionsVersion (from the last GET) -- mismatch is a
  // 409 (RA-04 review, Decision #1).
  @IsInt()
  public version!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public reasonCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public reasonNote?: string;

  @IsOptional()
  @IsArray()
  public evidenceRefs?: unknown[];
}
