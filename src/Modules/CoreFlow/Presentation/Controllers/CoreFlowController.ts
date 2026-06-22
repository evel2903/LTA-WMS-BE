import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CreateCoreFlowInstanceUseCase } from '@modules/CoreFlow/Application/UseCases/CreateCoreFlowInstanceUseCase';
import { CreateWorkflowHandoffUseCase } from '@modules/CoreFlow/Application/UseCases/CreateWorkflowHandoffUseCase';
import { GetCoreFlowInstanceUseCase } from '@modules/CoreFlow/Application/UseCases/GetCoreFlowInstanceUseCase';
import { RecordWorkflowMilestoneUseCase } from '@modules/CoreFlow/Application/UseCases/RecordWorkflowMilestoneUseCase';
import { ResolveCoreFlowInstanceUseCase } from '@modules/CoreFlow/Application/UseCases/ResolveCoreFlowInstanceUseCase';
import { SkipCoreFlowStepUseCase } from '@modules/CoreFlow/Application/UseCases/SkipCoreFlowStepUseCase';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { CreateCoreFlowInstanceRequest } from '@modules/CoreFlow/Presentation/Requests/CreateCoreFlowInstanceRequest';
import { CreateWorkflowHandoffRequest } from '@modules/CoreFlow/Presentation/Requests/CreateWorkflowHandoffRequest';
import { RecordWorkflowMilestoneRequest } from '@modules/CoreFlow/Presentation/Requests/RecordWorkflowMilestoneRequest';
import { ResolveCoreFlowInstanceQuery } from '@modules/CoreFlow/Presentation/Requests/ResolveCoreFlowInstanceQuery';
import { SkipCoreFlowStepRequest } from '@modules/CoreFlow/Presentation/Requests/SkipCoreFlowStepRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('core-flows')
export class CoreFlowController {
  constructor(
    private readonly createCoreFlowInstanceUseCase: CreateCoreFlowInstanceUseCase,
    private readonly getCoreFlowInstanceUseCase: GetCoreFlowInstanceUseCase,
    private readonly resolveCoreFlowInstanceUseCase: ResolveCoreFlowInstanceUseCase,
    private readonly recordWorkflowMilestoneUseCase: RecordWorkflowMilestoneUseCase,
    private readonly skipCoreFlowStepUseCase: SkipCoreFlowStepUseCase,
    private readonly createWorkflowHandoffUseCase: CreateWorkflowHandoffUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.CoreFlow)
  public async Create(@Body() request: CreateCoreFlowInstanceRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createCoreFlowInstanceUseCase.Execute(request, context);
  }

  @Get('resolve')
  @RequirePermission(ActionCode.Read, ObjectType.CoreFlow)
  public async Resolve(@Query() query: ResolveCoreFlowInstanceQuery) {
    return await this.resolveCoreFlowInstanceUseCase.Execute(query);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.CoreFlow)
  public async GetById(@Param('id') id: string) {
    return await this.getCoreFlowInstanceUseCase.Execute(id);
  }

  @Post(':id/milestones')
  @RequirePermission(ActionCode.Update, ObjectType.CoreFlow)
  public async RecordMilestone(
    @Param('id') id: string,
    @Body() request: RecordWorkflowMilestoneRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.recordWorkflowMilestoneUseCase.Execute({ CoreFlowInstanceId: id, ...request }, context);
  }

  @Post(':id/steps/:stepCode/skip')
  @RequirePermission(ActionCode.Update, ObjectType.CoreFlow)
  public async SkipStep(
    @Param('id') id: string,
    @Param('stepCode') stepCode: CoreFlowStepCode,
    @Body() request: SkipCoreFlowStepRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.skipCoreFlowStepUseCase.Execute(
      { CoreFlowInstanceId: id, StepCode: stepCode, ...request },
      context,
    );
  }

  @Post(':id/handoffs')
  @RequirePermission(ActionCode.Update, ObjectType.CoreFlow)
  public async Handoff(
    @Param('id') id: string,
    @Body() request: CreateWorkflowHandoffRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.createWorkflowHandoffUseCase.Execute(
      { CoreFlowInstanceId: id, ...request, Force: false },
      context,
    );
  }

  @Post(':id/handoffs/force')
  @RequirePermission(ActionCode.Override, ObjectType.CoreFlow)
  public async ForceHandoff(
    @Param('id') id: string,
    @Body() request: CreateWorkflowHandoffRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.createWorkflowHandoffUseCase.Execute(
      { CoreFlowInstanceId: id, ...request, Force: true },
      context,
    );
  }
}
