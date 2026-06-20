import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CreateApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/CreateApprovalRequestUseCase';
import { GetApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/GetApprovalRequestUseCase';
import { ListApprovalRequestsUseCase } from '@modules/AccessControl/Application/UseCases/ListApprovalRequestsUseCase';
import { ApproveApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/ApproveApprovalRequestUseCase';
import { RejectApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/RejectApprovalRequestUseCase';
import { CreateApprovalRequestRequest } from '@modules/AccessControl/Presentation/Requests/CreateApprovalRequestRequest';
import { DecideApprovalRequestRequest } from '@modules/AccessControl/Presentation/Requests/DecideApprovalRequestRequest';
import { ListApprovalRequestsQuery } from '@modules/AccessControl/Presentation/Requests/ListApprovalRequestsQuery';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('approval-requests')
export class ApprovalRequestController {
  constructor(
    private readonly createApprovalRequestUseCase: CreateApprovalRequestUseCase,
    private readonly getApprovalRequestUseCase: GetApprovalRequestUseCase,
    private readonly listApprovalRequestsUseCase: ListApprovalRequestsUseCase,
    private readonly approveApprovalRequestUseCase: ApproveApprovalRequestUseCase,
    private readonly rejectApprovalRequestUseCase: RejectApprovalRequestUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.ApprovalRequest)
  public async Create(@Body() request: CreateApprovalRequestRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createApprovalRequestUseCase.Execute(request, context);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.ApprovalRequest)
  public async GetById(@Param('id') id: string) {
    return await this.getApprovalRequestUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.ApprovalRequest)
  public async List(@Query() query: ListApprovalRequestsQuery) {
    return await this.listApprovalRequestsUseCase.Execute(query);
  }

  @Post(':id/approve')
  @RequirePermission(ActionCode.Approve, ObjectType.ApprovalRequest)
  public async Approve(
    @Param('id') id: string,
    @Body() request: DecideApprovalRequestRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.approveApprovalRequestUseCase.Execute({ Id: id, ...request }, context);
  }

  @Post(':id/reject')
  @RequirePermission(ActionCode.Approve, ObjectType.ApprovalRequest)
  public async Reject(
    @Param('id') id: string,
    @Body() request: DecideApprovalRequestRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.rejectApprovalRequestUseCase.Execute({ Id: id, ...request }, context);
  }
}
