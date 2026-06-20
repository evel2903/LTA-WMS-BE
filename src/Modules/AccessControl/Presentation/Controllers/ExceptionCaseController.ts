import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CreateExceptionUseCase } from '@modules/AccessControl/Application/UseCases/CreateExceptionUseCase';
import { GetExceptionUseCase } from '@modules/AccessControl/Application/UseCases/GetExceptionUseCase';
import { ListExceptionsUseCase } from '@modules/AccessControl/Application/UseCases/ListExceptionsUseCase';
import { LogExceptionUseCase } from '@modules/AccessControl/Application/UseCases/LogExceptionUseCase';
import { AssignExceptionUseCase } from '@modules/AccessControl/Application/UseCases/AssignExceptionUseCase';
import { SubmitExceptionForApprovalUseCase } from '@modules/AccessControl/Application/UseCases/SubmitExceptionForApprovalUseCase';
import { ResolveExceptionUseCase } from '@modules/AccessControl/Application/UseCases/ResolveExceptionUseCase';
import { CloseExceptionUseCase } from '@modules/AccessControl/Application/UseCases/CloseExceptionUseCase';
import { CreateExceptionRequest } from '@modules/AccessControl/Presentation/Requests/CreateExceptionRequest';
import { LogExceptionRequest } from '@modules/AccessControl/Presentation/Requests/LogExceptionRequest';
import { AssignExceptionRequest } from '@modules/AccessControl/Presentation/Requests/AssignExceptionRequest';
import { SubmitExceptionForApprovalRequest } from '@modules/AccessControl/Presentation/Requests/SubmitExceptionForApprovalRequest';
import { ResolveExceptionRequest } from '@modules/AccessControl/Presentation/Requests/ResolveExceptionRequest';
import { ListExceptionsQuery } from '@modules/AccessControl/Presentation/Requests/ListExceptionsQuery';

/**
 * Exception lifecycle API (C9). Create requires (Create, ExceptionCase); reads require
 * (Read, ExceptionCase); every transition requires (Update, ExceptionCase). The audit context
 * (@CurrentAuditContext) is threaded into each mutation so the in-transaction audit row records
 * the actor/trace (AC4). Enforcement is the C2 JwtAuthGuard + PermissionGuard.
 */
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('exceptions')
export class ExceptionCaseController {
  constructor(
    private readonly createExceptionUseCase: CreateExceptionUseCase,
    private readonly getExceptionUseCase: GetExceptionUseCase,
    private readonly listExceptionsUseCase: ListExceptionsUseCase,
    private readonly logExceptionUseCase: LogExceptionUseCase,
    private readonly assignExceptionUseCase: AssignExceptionUseCase,
    private readonly submitExceptionForApprovalUseCase: SubmitExceptionForApprovalUseCase,
    private readonly resolveExceptionUseCase: ResolveExceptionUseCase,
    private readonly closeExceptionUseCase: CloseExceptionUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.ExceptionCase)
  public async Create(@Body() request: CreateExceptionRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createExceptionUseCase.Execute(request, context);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.ExceptionCase)
  public async GetById(@Param('id') id: string) {
    return await this.getExceptionUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.ExceptionCase)
  public async List(@Query() query: ListExceptionsQuery) {
    return await this.listExceptionsUseCase.Execute(query);
  }

  @Post(':id/log')
  @RequirePermission(ActionCode.Update, ObjectType.ExceptionCase)
  public async Log(
    @Param('id') id: string,
    @Body() request: LogExceptionRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.logExceptionUseCase.Execute({ Id: id, ...request }, context);
  }

  @Post(':id/assign')
  @RequirePermission(ActionCode.Update, ObjectType.ExceptionCase)
  public async Assign(
    @Param('id') id: string,
    @Body() request: AssignExceptionRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.assignExceptionUseCase.Execute({ Id: id, ...request }, context);
  }

  @Post(':id/submit')
  @RequirePermission(ActionCode.Update, ObjectType.ExceptionCase)
  public async Submit(
    @Param('id') id: string,
    @Body() request: SubmitExceptionForApprovalRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.submitExceptionForApprovalUseCase.Execute({ Id: id, ...request }, context);
  }

  @Post(':id/resolve')
  @RequirePermission(ActionCode.Update, ObjectType.ExceptionCase)
  public async Resolve(
    @Param('id') id: string,
    @Body() request: ResolveExceptionRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.resolveExceptionUseCase.Execute({ Id: id, ...request }, context);
  }

  @Post(':id/close')
  @RequirePermission(ActionCode.Update, ObjectType.ExceptionCase)
  public async Close(@Param('id') id: string, @CurrentAuditContext() context: AuditContext) {
    return await this.closeExceptionUseCase.Execute({ Id: id }, context);
  }
}
