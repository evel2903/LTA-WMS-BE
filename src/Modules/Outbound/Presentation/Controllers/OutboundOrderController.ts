import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import {
  AllocateOutboundOrderUseCase,
  GetAllocationUseCase,
  ListAllocationsUseCase,
} from '@modules/Outbound/Application/UseCases/AllocationUseCases';
import {
  CancelOutboundOrderUseCase,
  GetOutboundOrderUseCase,
  HoldOutboundOrderUseCase,
  ImportOutboundOrderUseCase,
  ListOutboundOrdersUseCase,
  RejectOutboundOrderUseCase,
  ValidateOutboundOrderUseCase,
} from '@modules/Outbound/Application/UseCases/OutboundOrderUseCases';
import { AllocateOutboundOrderRequest } from '@modules/Outbound/Presentation/Requests/AllocateOutboundOrderRequest';
import { ImportOutboundOrderRequest } from '@modules/Outbound/Presentation/Requests/ImportOutboundOrderRequest';
import { ListAllocationsQuery } from '@modules/Outbound/Presentation/Requests/ListAllocationsQuery';
import { ListOutboundOrdersQuery } from '@modules/Outbound/Presentation/Requests/ListOutboundOrdersQuery';
import { ReasonOutboundOrderRequest } from '@modules/Outbound/Presentation/Requests/ReasonOutboundOrderRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('outbound-orders')
export class OutboundOrderController {
  constructor(
    private readonly importOutboundOrderUseCase: ImportOutboundOrderUseCase,
    private readonly listOutboundOrdersUseCase: ListOutboundOrdersUseCase,
    private readonly getOutboundOrderUseCase: GetOutboundOrderUseCase,
    private readonly validateOutboundOrderUseCase: ValidateOutboundOrderUseCase,
    private readonly holdOutboundOrderUseCase: HoldOutboundOrderUseCase,
    private readonly rejectOutboundOrderUseCase: RejectOutboundOrderUseCase,
    private readonly cancelOutboundOrderUseCase: CancelOutboundOrderUseCase,
    private readonly allocateOutboundOrderUseCase: AllocateOutboundOrderUseCase,
    private readonly listAllocationsUseCase: ListAllocationsUseCase,
    private readonly getAllocationUseCase: GetAllocationUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.OutboundOrder, {
    WarehouseId: { In: 'body', Key: 'WarehouseId' },
    OwnerId: { In: 'body', Key: 'OwnerId' },
  })
  public async Import(@Body() request: ImportOutboundOrderRequest, @CurrentAuditContext() context: AuditContext) {
    return this.importOutboundOrderUseCase.Execute(request, context);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.OutboundOrder, {
    WarehouseId: { In: 'query', Key: 'WarehouseId' },
    OwnerId: { In: 'query', Key: 'OwnerId' },
  })
  public async List(@Query() query: ListOutboundOrdersQuery, @CurrentAuditContext() context: AuditContext) {
    return this.listOutboundOrdersUseCase.Execute(query, context.ActorUserId);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.OutboundOrder)
  public async GetById(@Param('id') id: string, @CurrentAuditContext() context: AuditContext) {
    return this.getOutboundOrderUseCase.Execute(id, context.ActorUserId);
  }

  @Post(':id/validate')
  @RequirePermission(ActionCode.Update, ObjectType.OutboundOrder)
  public async Validate(@Param('id') id: string, @CurrentAuditContext() context: AuditContext) {
    return this.validateOutboundOrderUseCase.Execute(id, context);
  }

  @Post(':id/hold')
  @RequirePermission(ActionCode.Update, ObjectType.OutboundOrder)
  public async Hold(
    @Param('id') id: string,
    @Body() request: ReasonOutboundOrderRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.holdOutboundOrderUseCase.Execute({ Id: id, ...request }, context);
  }

  @Post(':id/reject')
  @RequirePermission(ActionCode.Update, ObjectType.OutboundOrder)
  public async Reject(
    @Param('id') id: string,
    @Body() request: ReasonOutboundOrderRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.rejectOutboundOrderUseCase.Execute({ Id: id, ...request }, context);
  }

  @Post(':id/cancel')
  @RequirePermission(ActionCode.DeleteCancel, ObjectType.OutboundOrder)
  public async Cancel(
    @Param('id') id: string,
    @Body() request: ReasonOutboundOrderRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.cancelOutboundOrderUseCase.Execute({ Id: id, ...request }, context);
  }

  @Post(':id/allocate')
  @RequirePermission(ActionCode.Create, ObjectType.Allocation)
  public async Allocate(
    @Param('id') id: string,
    @Body() request: AllocateOutboundOrderRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.allocateOutboundOrderUseCase.Execute({ OutboundOrderId: id, ...request }, context);
  }

  @Get(':id/allocations')
  @RequirePermission(ActionCode.Read, ObjectType.Allocation)
  public async ListAllocations(
    @Param('id') id: string,
    @Query() query: ListAllocationsQuery,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.listAllocationsUseCase.Execute({ OutboundOrderId: id, ...query }, context.ActorUserId);
  }

  @Get('allocations/:allocationId')
  @RequirePermission(ActionCode.Read, ObjectType.Allocation)
  public async GetAllocation(
    @Param('allocationId') allocationId: string,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.getAllocationUseCase.Execute(allocationId, context.ActorUserId);
  }
}
