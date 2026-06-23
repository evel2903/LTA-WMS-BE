import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ConfirmPutawayTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/ConfirmPutawayTaskUseCase';
import { GetPutawayTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/GetPutawayTaskUseCase';
import { ListPutawayTasksUseCase } from '@modules/InventoryExecution/Application/UseCases/ListPutawayTasksUseCase';
import { ReleasePutawayTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/ReleasePutawayTaskUseCase';
import { ConfirmPutawayTaskRequest } from '@modules/InventoryExecution/Presentation/Requests/ConfirmPutawayTaskRequest';
import { ListPutawayTasksQuery } from '@modules/InventoryExecution/Presentation/Requests/ListPutawayTasksQuery';
import { ReleasePutawayTaskRequest } from '@modules/InventoryExecution/Presentation/Requests/ReleasePutawayTaskRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('putaway/tasks')
export class PutawayTaskController {
  constructor(
    private readonly listPutawayTasksUseCase: ListPutawayTasksUseCase,
    private readonly getPutawayTaskUseCase: GetPutawayTaskUseCase,
    private readonly releasePutawayTaskUseCase: ReleasePutawayTaskUseCase,
    private readonly confirmPutawayTaskUseCase: ConfirmPutawayTaskUseCase,
  ) {}

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.PutawayTask, {
    WarehouseId: { In: 'query', Key: 'WarehouseId' },
    OwnerId: { In: 'query', Key: 'OwnerId' },
  })
  public async List(@Query() query: ListPutawayTasksQuery, @CurrentAuditContext() context: AuditContext) {
    return await this.listPutawayTasksUseCase.Execute({ ...query, ActorUserId: context.ActorUserId });
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.PutawayTask)
  public async GetById(@Param('id') id: string, @CurrentAuditContext() context: AuditContext) {
    return await this.getPutawayTaskUseCase.Execute(id, context.ActorUserId);
  }

  @Post('release')
  @RequirePermission(ActionCode.Create, ObjectType.PutawayTask)
  public async Release(@Body() request: ReleasePutawayTaskRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.releasePutawayTaskUseCase.Execute(request, context);
  }

  @Post(':id/confirm')
  @RequirePermission(ActionCode.Update, ObjectType.PutawayTask)
  public async Confirm(
    @Param('id') id: string,
    @Body() request: ConfirmPutawayTaskRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.confirmPutawayTaskUseCase.Execute(id, request, context);
  }
}
