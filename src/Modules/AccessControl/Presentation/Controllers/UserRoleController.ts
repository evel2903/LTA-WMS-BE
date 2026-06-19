import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Post, UseGuards } from '@nestjs/common';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { GetUserEffectivePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/GetUserEffectivePermissionsUseCase';
import { AssignRoleToUserUseCase } from '@modules/AccessControl/Application/UseCases/AssignRoleToUserUseCase';
import { RemoveRoleFromUserUseCase } from '@modules/AccessControl/Application/UseCases/RemoveRoleFromUserUseCase';
import { AssignRoleRequest } from '@modules/AccessControl/Presentation/Requests/AssignRoleRequest';

/**
 * Role assignment + per-user permission reads. C2 enforces these via the granular
 * PermissionGuard against the `UserAssignment` object — replacing the interim legacy
 * admin gate C1 added. `UserAssignment` carries no data-scope axis in V0, so only the
 * permission dimension applies; the seeded matrix grants these to WMS_ADMIN only.
 */
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('access-control/users')
export class UserRoleController {
  constructor(
    private readonly getUserEffectivePermissionsUseCase: GetUserEffectivePermissionsUseCase,
    private readonly assignRoleToUserUseCase: AssignRoleToUserUseCase,
    private readonly removeRoleFromUserUseCase: RemoveRoleFromUserUseCase,
  ) {}

  @Get(':userId/effective-permissions')
  @RequirePermission(ActionCode.Read, ObjectType.UserAssignment)
  public async GetEffectivePermissions(@Param('userId') userId: string) {
    return await this.getUserEffectivePermissionsUseCase.Execute(userId);
  }

  @Post(':userId/roles')
  @RequirePermission(ActionCode.Update, ObjectType.UserAssignment)
  public async AssignRole(@Param('userId') userId: string, @Body() request: AssignRoleRequest) {
    return await this.assignRoleToUserUseCase.Execute({ UserId: userId, RoleCode: request.RoleCode });
  }

  @Delete(':userId/roles/:roleCode')
  @RequirePermission(ActionCode.Update, ObjectType.UserAssignment)
  public async RemoveRole(
    @Param('userId') userId: string,
    @Param('roleCode', new ParseEnumPipe(RoleCode)) roleCode: RoleCode,
  ) {
    return await this.removeRoleFromUserUseCase.Execute({ UserId: userId, RoleCode: roleCode });
  }
}
