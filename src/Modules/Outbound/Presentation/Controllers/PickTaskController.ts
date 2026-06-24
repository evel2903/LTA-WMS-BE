import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ConfirmPickTaskUseCase } from '@modules/Outbound/Application/UseCases/PickTaskConfirmUseCases';
import {
  ReportPickExceptionUseCase,
  RequestPickSubstitutionUseCase,
} from '@modules/Outbound/Application/UseCases/PickTaskExceptionUseCases';
import { ConfirmPickTaskRequest } from '@modules/Outbound/Presentation/Requests/ConfirmPickTaskRequest';
import {
  ReportPickExceptionRequest,
  RequestPickSubstitutionRequest,
} from '@modules/Outbound/Presentation/Requests/PickTaskExceptionRequests';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('pick-tasks')
export class PickTaskController {
  constructor(
    private readonly confirmPickTaskUseCase: ConfirmPickTaskUseCase,
    private readonly reportPickExceptionUseCase: ReportPickExceptionUseCase,
    private readonly requestPickSubstitutionUseCase: RequestPickSubstitutionUseCase,
  ) {}

  @Post(':id/confirm')
  @RequirePermission(ActionCode.Update, ObjectType.PickTask)
  public async Confirm(
    @Param('id') id: string,
    @Body() request: ConfirmPickTaskRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.confirmPickTaskUseCase.Execute(id, request, context);
  }

  @Post(':id/exceptions')
  @RequirePermission(ActionCode.Update, ObjectType.PickTask)
  public async ReportException(
    @Param('id') id: string,
    @Body() request: ReportPickExceptionRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.reportPickExceptionUseCase.Execute(id, request, context);
  }

  @Post(':id/substitution')
  @RequirePermission(ActionCode.Update, ObjectType.PickTask)
  public async RequestSubstitution(
    @Param('id') id: string,
    @Body() request: RequestPickSubstitutionRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.requestPickSubstitutionUseCase.Execute(id, request, context);
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('mobile/tasks')
export class MobilePickTaskController {
  constructor(
    private readonly confirmPickTaskUseCase: ConfirmPickTaskUseCase,
    private readonly reportPickExceptionUseCase: ReportPickExceptionUseCase,
    private readonly requestPickSubstitutionUseCase: RequestPickSubstitutionUseCase,
  ) {}

  @Post(':id/confirm')
  @RequirePermission(ActionCode.Update, ObjectType.MobileTask)
  public async Confirm(
    @Param('id') id: string,
    @Body() request: ConfirmPickTaskRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.confirmPickTaskUseCase.ExecuteByMobileTask(id, request, context);
  }

  @Post(':id/exceptions')
  @RequirePermission(ActionCode.Update, ObjectType.MobileTask)
  public async ReportException(
    @Param('id') id: string,
    @Body() request: ReportPickExceptionRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.reportPickExceptionUseCase.ExecuteByMobileTask(id, request, context);
  }

  @Post(':id/substitution')
  @RequirePermission(ActionCode.Update, ObjectType.MobileTask)
  public async RequestSubstitution(
    @Param('id') id: string,
    @Body() request: RequestPickSubstitutionRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.requestPickSubstitutionUseCase.ExecuteByMobileTask(id, request, context);
  }
}
