import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import {
  CancelReplenishmentTaskUseCase,
  ConfirmReplenishmentTaskUseCase,
  GetReplenishmentTaskUseCase,
  ListReplenishmentTasksUseCase,
  RecordInventoryReconciliationFailureUseCase,
  ReleaseReplenishmentTaskUseCase,
} from '@modules/InventoryExecution/Application/UseCases/ReplenishmentTaskUseCases';
import { ListReplenishmentTasksQuery } from '@modules/InventoryExecution/Presentation/Requests/ListReplenishmentTasksQuery';
import { RecordInventoryReconciliationFailureRequest } from '@modules/InventoryExecution/Presentation/Requests/RecordInventoryReconciliationFailureRequest';
import { ReleaseReplenishmentTaskRequest } from '@modules/InventoryExecution/Presentation/Requests/ReleaseReplenishmentTaskRequest';
import { ReplenishmentReasonedRequest } from '@modules/InventoryExecution/Presentation/Requests/ReplenishmentReasonedRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('replenishment')
export class ReplenishmentTaskController {
  constructor(
    private readonly releaseReplenishmentTaskUseCase: ReleaseReplenishmentTaskUseCase,
    private readonly listReplenishmentTasksUseCase: ListReplenishmentTasksUseCase,
    private readonly getReplenishmentTaskUseCase: GetReplenishmentTaskUseCase,
    private readonly confirmReplenishmentTaskUseCase: ConfirmReplenishmentTaskUseCase,
    private readonly cancelReplenishmentTaskUseCase: CancelReplenishmentTaskUseCase,
    private readonly recordInventoryReconciliationFailureUseCase: RecordInventoryReconciliationFailureUseCase,
  ) {}

  @Post('tasks/release')
  @RequirePermission(ActionCode.Create, ObjectType.ReplenishmentTask)
  public async Release(@Body() request: ReleaseReplenishmentTaskRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.releaseReplenishmentTaskUseCase.Execute(request, context);
  }

  @Get('tasks')
  @RequirePermission(ActionCode.Read, ObjectType.ReplenishmentTask, {
    WarehouseId: { In: 'query', Key: 'WarehouseId' },
    OwnerId: { In: 'query', Key: 'OwnerId' },
  })
  public async List(@Query() query: ListReplenishmentTasksQuery, @CurrentAuditContext() context: AuditContext) {
    return await this.listReplenishmentTasksUseCase.Execute(query, context);
  }

  @Get('tasks/:id')
  @RequirePermission(ActionCode.Read, ObjectType.ReplenishmentTask)
  public async GetById(@Param('id') id: string, @CurrentAuditContext() context: AuditContext) {
    return await this.getReplenishmentTaskUseCase.Execute(id, context);
  }

  @Post('tasks/:id/confirm')
  @RequirePermission(ActionCode.Update, ObjectType.ReplenishmentTask)
  public async Confirm(
    @Param('id') id: string,
    @Body() request: ReplenishmentReasonedRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.confirmReplenishmentTaskUseCase.Execute({ TaskId: id, ...request }, context);
  }

  @Post('tasks/:id/cancel')
  @RequirePermission(ActionCode.DeleteCancel, ObjectType.ReplenishmentTask)
  public async Cancel(
    @Param('id') id: string,
    @Body() request: ReplenishmentReasonedRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.cancelReplenishmentTaskUseCase.Execute({ TaskId: id, ...request }, context);
  }

  @Post('reconciliation-failures')
  @RequirePermission(ActionCode.Update, ObjectType.ReconciliationRun)
  public async RecordReconciliationFailure(
    @Body() request: RecordInventoryReconciliationFailureRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.recordInventoryReconciliationFailureUseCase.Execute(request, context);
  }
}
