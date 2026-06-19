import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Post, UseGuards } from '@nestjs/common';
import { Role } from '@common/Constants/Role';
import { Roles } from '@common/Security/Roles';
import { RolesGuard } from '@common/Security/RolesGuard';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { GetUserEffectivePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/GetUserEffectivePermissionsUseCase';
import { AssignRoleToUserUseCase } from '@modules/AccessControl/Application/UseCases/AssignRoleToUserUseCase';
import { RemoveRoleFromUserUseCase } from '@modules/AccessControl/Application/UseCases/RemoveRoleFromUserUseCase';
import { AssignRoleRequest } from '@modules/AccessControl/Presentation/Requests/AssignRoleRequest';

/**
 * Role assignment and per-user permission reads are sensitive: reading another
 * user's effective permissions, or granting/revoking roles, must not be open to
 * any authenticated principal (it would allow self-elevation to WMS_ADMIN and
 * cross-user disclosure). C1 gates them behind the existing legacy admin role
 * (JwtAuthGuard + RolesGuard). C2 replaces this with granular @RequirePermission
 * + data-scope enforcement.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('access-control/users')
export class UserRoleController {
  constructor(
    private readonly getUserEffectivePermissionsUseCase: GetUserEffectivePermissionsUseCase,
    private readonly assignRoleToUserUseCase: AssignRoleToUserUseCase,
    private readonly removeRoleFromUserUseCase: RemoveRoleFromUserUseCase,
  ) {}

  @Get(':userId/effective-permissions')
  public async GetEffectivePermissions(@Param('userId') userId: string) {
    return await this.getUserEffectivePermissionsUseCase.Execute(userId);
  }

  @Post(':userId/roles')
  public async AssignRole(@Param('userId') userId: string, @Body() request: AssignRoleRequest) {
    return await this.assignRoleToUserUseCase.Execute({ UserId: userId, RoleCode: request.RoleCode });
  }

  @Delete(':userId/roles/:roleCode')
  public async RemoveRole(
    @Param('userId') userId: string,
    @Param('roleCode', new ParseEnumPipe(RoleCode)) roleCode: RoleCode,
  ) {
    return await this.removeRoleFromUserUseCase.Execute({ UserId: userId, RoleCode: roleCode });
  }
}
