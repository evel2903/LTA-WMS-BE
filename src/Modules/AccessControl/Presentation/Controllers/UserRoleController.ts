import { Body, Controller, Delete, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuthUser, CurrentUser } from '@modules/AccessControl/Presentation/Decorators/CurrentUser';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { GetUserEffectivePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/GetUserEffectivePermissionsUseCase';
import { RegisterAssignmentIntentUseCase } from '@modules/AccessControl/Application/UseCases/RegisterAssignmentIntentUseCase';
import { GetAssignmentIntentUseCase } from '@modules/AccessControl/Application/UseCases/GetAssignmentIntentUseCase';
import { ApplyAssignmentIntentUseCase } from '@modules/AccessControl/Application/UseCases/ApplyAssignmentIntentUseCase';
import { AssignmentCompatibilityAdapter } from '@modules/AccessControl/Application/Services/AssignmentCompatibilityAdapter';
import { ListUserDataScopesUseCase } from '@modules/AccessControl/Application/UseCases/ListUserDataScopesUseCase';
import { AssignDataScopeToUserUseCase } from '@modules/AccessControl/Application/UseCases/AssignDataScopeToUserUseCase';
import { RemoveDataScopeFromUserUseCase } from '@modules/AccessControl/Application/UseCases/RemoveDataScopeFromUserUseCase';
import { AssignRoleRequest } from '@modules/AccessControl/Presentation/Requests/AssignRoleRequest';
import { RemoveRoleRequest } from '@modules/AccessControl/Presentation/Requests/RemoveRoleRequest';
import { RegisterIntentRequest } from '@modules/AccessControl/Presentation/Requests/RegisterIntentRequest';
import { AssignDataScopeRequest } from '@modules/AccessControl/Presentation/Requests/AssignDataScopeRequest';

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
    private readonly registerAssignmentIntentUseCase: RegisterAssignmentIntentUseCase,
    private readonly getAssignmentIntentUseCase: GetAssignmentIntentUseCase,
    private readonly applyAssignmentIntentUseCase: ApplyAssignmentIntentUseCase,
    private readonly compatibilityAdapter: AssignmentCompatibilityAdapter,
    private readonly listUserDataScopesUseCase: ListUserDataScopesUseCase,
    private readonly assignDataScopeToUserUseCase: AssignDataScopeToUserUseCase,
    private readonly removeDataScopeFromUserUseCase: RemoveDataScopeFromUserUseCase,
  ) {}

  /** Both present => ticketed apply; both absent => legacy compatibility path. Exactly one present is
   * malformed — 400, never a silent downgrade to an un-fenced legacy write (Review Finding, round 1).
   * Throws only; the caller's own `!== undefined` check does the type-narrowing to the apply branch. */
  private assertBothOrNeither(runId: string | undefined, intentVersion: string | undefined): void {
    if ((runId !== undefined) !== (intentVersion !== undefined)) {
      throw new BusinessRuleException('RunId and IntentVersion must be provided together');
    }
  }

  @Get(':userId/effective-permissions')
  @RequirePermission(ActionCode.Read, ObjectType.UserAssignment)
  public async GetEffectivePermissions(@Param('userId') userId: string) {
    return await this.getUserEffectivePermissionsUseCase.Execute(userId);
  }

  // RH-04 registration: reserve a server ordinal for an assign/remove intent (201 new, 200 replay).
  @Post(':userId/roles/:canonicalRoleCode/intent')
  @RequirePermission(ActionCode.Update, ObjectType.UserAssignment)
  public async RegisterIntent(
    @Param('userId') userId: string,
    @Param('canonicalRoleCode') canonicalRoleCode: string,
    @Body() request: RegisterIntentRequest,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.registerAssignmentIntentUseCase.Execute({
      ActorUserId: user.UserId,
      UserId: userId,
      CanonicalRoleCodeRaw: canonicalRoleCode,
      Operation: request.Operation,
      RunId: request.RunId,
    });
    res.status(result.Replay ? 200 : 201);
    return result.Data;
  }

  // RH-04 recovery: atomic snapshot the FE adopts before enabling mutation.
  @Get(':userId/roles/:canonicalRoleCode/intent')
  @RequirePermission(ActionCode.Read, ObjectType.UserAssignment)
  public async RecoverIntent(
    @Param('userId') userId: string,
    @Param('canonicalRoleCode') canonicalRoleCode: string,
    @CurrentUser() user: AuthUser,
  ) {
    return await this.getAssignmentIntentUseCase.Execute({
      ActorUserId: user.UserId,
      UserId: userId,
      CanonicalRoleCodeRaw: canonicalRoleCode,
    });
  }

  @Post(':userId/roles')
  @RequirePermission(ActionCode.Update, ObjectType.UserAssignment)
  public async AssignRole(
    @Param('userId') userId: string,
    @Body() request: AssignRoleRequest,
    @CurrentAuditContext() context: AuditContext,
    @CurrentUser() user: AuthUser,
  ) {
    // Ticketed (both present) vs legacy (both absent). Exactly one present is a malformed request —
    // reject it rather than silently downgrading to an un-fenced legacy write (Review Finding, round 1).
    this.assertBothOrNeither(request.RunId, request.IntentVersion);
    if (request.RunId !== undefined && request.IntentVersion !== undefined) {
      const outcome = await this.applyAssignmentIntentUseCase.Execute(
        {
          ActorUserId: user.UserId,
          UserId: userId,
          CanonicalRoleCodeRaw: request.RoleCode,
          Operation: 'assign',
          RunId: request.RunId,
          IntentVersion: request.IntentVersion,
        },
        context,
      );
      return outcome.Body;
    }
    return await this.compatibilityAdapter.LegacyAssign(
      { ActorUserId: user.UserId, UserId: userId, RoleCode: request.RoleCode },
      context,
    );
  }

  @Delete(':userId/roles/:roleCode')
  @RequirePermission(ActionCode.Update, ObjectType.UserAssignment)
  public async RemoveRole(
    @Param('userId') userId: string,
    @Param('roleCode') roleCode: string,
    @Body() request: RemoveRoleRequest,
    @CurrentAuditContext() context: AuditContext,
    @CurrentUser() user: AuthUser,
  ) {
    this.assertBothOrNeither(request?.RunId, request?.IntentVersion);
    if (request?.RunId !== undefined && request?.IntentVersion !== undefined) {
      const outcome = await this.applyAssignmentIntentUseCase.Execute(
        {
          ActorUserId: user.UserId,
          UserId: userId,
          CanonicalRoleCodeRaw: roleCode,
          Operation: 'remove',
          RunId: request.RunId,
          IntentVersion: request.IntentVersion,
        },
        context,
      );
      return outcome.Body;
    }
    return await this.compatibilityAdapter.LegacyRemove(
      { ActorUserId: user.UserId, UserId: userId, RoleCode: roleCode },
      context,
    );
  }

  @Get(':userId/data-scopes')
  @RequirePermission(ActionCode.Read, ObjectType.UserAssignment)
  public async ListDataScopes(@Param('userId') userId: string) {
    return await this.listUserDataScopesUseCase.Execute(userId);
  }

  @Post(':userId/data-scopes')
  @RequirePermission(ActionCode.Update, ObjectType.UserAssignment)
  public async AssignDataScope(
    @Param('userId') userId: string,
    @Body() request: AssignDataScopeRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.assignDataScopeToUserUseCase.Execute(
      {
        UserId: userId,
        ScopeType: request.ScopeType,
        ScopeValueId: request.ScopeValueId ?? null,
        ScopeValueCode: request.ScopeValueCode ?? null,
        IncludeAll: request.IncludeAll,
      },
      context,
    );
  }

  @Delete(':userId/data-scopes/:scopeId')
  @RequirePermission(ActionCode.Update, ObjectType.UserAssignment)
  public async RemoveDataScope(
    @Param('userId') userId: string,
    @Param('scopeId') scopeId: string,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.removeDataScopeFromUserUseCase.Execute({ UserId: userId, ScopeId: scopeId }, context);
  }
}
