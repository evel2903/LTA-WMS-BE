import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuthUser, CurrentUser } from '@modules/AccessControl/Presentation/Decorators/CurrentUser';
import { ListRolesUseCase } from '@modules/AccessControl/Application/UseCases/ListRolesUseCase';
import { GetRoleUseCase } from '@modules/AccessControl/Application/UseCases/GetRoleUseCase';
import { CreateRoleUseCase } from '@modules/AccessControl/Application/UseCases/CreateRoleUseCase';
import { UpdateRoleUseCase } from '@modules/AccessControl/Application/UseCases/UpdateRoleUseCase';
import { ListRolesQuery } from '@modules/AccessControl/Presentation/Requests/ListRolesQuery';
import { CreateRoleRequest } from '@modules/AccessControl/Presentation/Requests/CreateRoleRequest';
import { UpdateRoleRequest } from '@modules/AccessControl/Presentation/Requests/UpdateRoleRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('access-control/roles')
export class RoleController {
  constructor(
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly getRoleUseCase: GetRoleUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
  ) {}

  @Get()
  public async List(@Query() query: ListRolesQuery) {
    return await this.listRolesUseCase.Execute(query);
  }

  @Get(':roleCode')
  public async GetByCode(@Param('roleCode') roleCode: string) {
    return await this.getRoleUseCase.Execute(roleCode);
  }

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Role)
  public async Create(
    @Body() request: CreateRoleRequest,
    @CurrentAuditContext() context: AuditContext,
    @CurrentUser() user?: AuthUser,
  ) {
    return await this.createRoleUseCase.Execute({ ...request, ActorUserId: user?.UserId }, context);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.Role)
  public async Update(
    @Param('id') id: string,
    @Body() request: UpdateRoleRequest,
    @CurrentAuditContext() context: AuditContext,
    @CurrentUser() user?: AuthUser,
  ) {
    return await this.updateRoleUseCase.Execute({ Id: id, ...request, ActorUserId: user?.UserId }, context);
  }
}
