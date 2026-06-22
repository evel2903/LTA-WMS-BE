import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { CreateInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/CreateInboundPlanUseCase';
import { GetInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/GetInboundPlanUseCase';
import { ListInboundPlansUseCase } from '@modules/Inbound/Application/UseCases/ListInboundPlansUseCase';
import { RecordGateInUseCase } from '@modules/Inbound/Application/UseCases/RecordGateInUseCase';
import { ValidateReceivingReadinessUseCase } from '@modules/Inbound/Application/UseCases/ValidateReceivingReadinessUseCase';
import { CreateInboundPlanRequest } from '@modules/Inbound/Presentation/Requests/CreateInboundPlanRequest';
import { ListInboundPlansQuery } from '@modules/Inbound/Presentation/Requests/ListInboundPlansQuery';
import { RecordGateInRequest } from '@modules/Inbound/Presentation/Requests/RecordGateInRequest';
import { ValidateReceivingReadinessRequest } from '@modules/Inbound/Presentation/Requests/ValidateReceivingReadinessRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('inbound-plans')
export class InboundPlanController {
  constructor(
    private readonly createInboundPlanUseCase: CreateInboundPlanUseCase,
    private readonly getInboundPlanUseCase: GetInboundPlanUseCase,
    private readonly listInboundPlansUseCase: ListInboundPlansUseCase,
    private readonly recordGateInUseCase: RecordGateInUseCase,
    private readonly validateReceivingReadinessUseCase: ValidateReceivingReadinessUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.InboundPlan, {
    WarehouseId: { In: 'body', Key: 'WarehouseId' },
    OwnerId: { In: 'body', Key: 'OwnerId' },
  })
  public async Create(@Body() request: CreateInboundPlanRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createInboundPlanUseCase.Execute(request, context);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.InboundPlan, {
    WarehouseId: { In: 'query', Key: 'WarehouseId' },
    OwnerId: { In: 'query', Key: 'OwnerId' },
  })
  public async List(@Query() query: ListInboundPlansQuery, @CurrentAuditContext() context: AuditContext) {
    return await this.listInboundPlansUseCase.Execute({ ...query, ActorUserId: context.ActorUserId });
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.InboundPlan)
  public async GetById(@Param('id') id: string, @CurrentAuditContext() context: AuditContext) {
    return await this.getInboundPlanUseCase.Execute(id, context.ActorUserId);
  }

  @Post(':id/gate-in')
  @RequirePermission(ActionCode.Update, ObjectType.InboundPlan)
  public async RecordGateIn(
    @Param('id') id: string,
    @Body() request: RecordGateInRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.recordGateInUseCase.Execute({ Id: id, ...request }, context);
  }

  @Post(':id/receiving-readiness')
  @RequirePermission(ActionCode.Read, ObjectType.InboundPlan)
  public async ValidateReadiness(
    @Param('id') id: string,
    @Body() request: ValidateReceivingReadinessRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.validateReceivingReadinessUseCase.Execute({ Id: id, ...request }, context);
  }
}
