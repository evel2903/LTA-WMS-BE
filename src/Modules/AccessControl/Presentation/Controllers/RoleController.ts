import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
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
import { SetRolePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/SetRolePermissionsUseCase';
import { ResetRolePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/ResetRolePermissionsUseCase';
import { ListRolesQuery } from '@modules/AccessControl/Presentation/Requests/ListRolesQuery';
import { CreateRoleRequest } from '@modules/AccessControl/Presentation/Requests/CreateRoleRequest';
import { UpdateRoleRequest } from '@modules/AccessControl/Presentation/Requests/UpdateRoleRequest';
import { SetRolePermissionsRequest } from '@modules/AccessControl/Presentation/Requests/SetRolePermissionsRequest';
import { ResetRolePermissionsRequest } from '@modules/AccessControl/Presentation/Requests/ResetRolePermissionsRequest';
import { EffectivePermissionsDto } from '@modules/AccessControl/Application/DTOs/RoleDto';

interface EffectivePermissionsResponse {
  permissions: Array<{ action: ActionCode; objectType: ObjectType }>;
  version: number;
}

// Contract §4 AC3/AC4: PUT/reset keep their existing lower-camel response. Permission writes
// still advance the role metadata token in the locked row, but a token without its corresponding
// metadata representation must not be exposed: pairing it with stale client metadata would
// bypass RH-02's compare-and-set protection.
const ToEffectivePermissionsResponse = (dto: EffectivePermissionsDto): EffectivePermissionsResponse => ({
  permissions: dto.Permissions.map((p) => ({ action: p.Action, objectType: p.ObjectType })),
  version: dto.Version,
});

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('access-control/roles')
export class RoleController {
  constructor(
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly getRoleUseCase: GetRoleUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly setRolePermissionsUseCase: SetRolePermissionsUseCase,
    private readonly resetRolePermissionsUseCase: ResetRolePermissionsUseCase,
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

  @Put(':id/permissions')
  @RequirePermission(ActionCode.Update, ObjectType.Role)
  public async SetPermissions(
    @Param('id') id: string,
    @Body() request: SetRolePermissionsRequest,
    @CurrentAuditContext() context: AuditContext,
    @CurrentUser() user?: AuthUser,
  ): Promise<EffectivePermissionsResponse> {
    const result = await this.setRolePermissionsUseCase.Execute(
      {
        Id: id,
        Permissions: request.permissions.map((p) => ({ Action: p.action, ObjectType: p.objectType })),
        Version: request.version,
        ReasonCode: request.reasonCode,
        ReasonNote: request.reasonNote,
        EvidenceRefs: request.evidenceRefs,
        ActorUserId: user?.UserId,
      },
      context,
    );
    return ToEffectivePermissionsResponse(result);
  }

  @Post(':id/permissions/reset')
  @RequirePermission(ActionCode.Update, ObjectType.Role)
  public async ResetPermissions(
    @Param('id') id: string,
    @Body() request: ResetRolePermissionsRequest,
    @CurrentAuditContext() context: AuditContext,
    @CurrentUser() user?: AuthUser,
  ): Promise<EffectivePermissionsResponse> {
    const result = await this.resetRolePermissionsUseCase.Execute(
      {
        Id: id,
        ReasonCode: request.reasonCode,
        ReasonNote: request.reasonNote,
        EvidenceRefs: request.evidenceRefs,
        ActorUserId: user?.UserId,
      },
      context,
    );
    return ToEffectivePermissionsResponse(result);
  }
}
