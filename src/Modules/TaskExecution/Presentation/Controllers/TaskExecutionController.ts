import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ClaimMobileTaskUseCase } from '@modules/TaskExecution/Application/UseCases/ClaimMobileTaskUseCase';
import { GetMobileTaskUseCase } from '@modules/TaskExecution/Application/UseCases/GetMobileTaskUseCase';
import { ListMobileTasksUseCase } from '@modules/TaskExecution/Application/UseCases/ListMobileTasksUseCase';
import { RecordMobileScanUseCase } from '@modules/TaskExecution/Application/UseCases/RecordMobileScanUseCase';
import { ReleaseMobileTaskUseCase } from '@modules/TaskExecution/Application/UseCases/ReleaseMobileTaskUseCase';
import { ClaimMobileTaskRequest } from '@modules/TaskExecution/Presentation/Requests/ClaimMobileTaskRequest';
import { ListMobileTasksQuery } from '@modules/TaskExecution/Presentation/Requests/ListMobileTasksQuery';
import { RecordMobileScanRequest } from '@modules/TaskExecution/Presentation/Requests/RecordMobileScanRequest';
import { ReleaseMobileTaskRequest } from '@modules/TaskExecution/Presentation/Requests/ReleaseMobileTaskRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('mobile/tasks')
export class TaskExecutionController {
  constructor(
    private readonly listMobileTasksUseCase: ListMobileTasksUseCase,
    private readonly getMobileTaskUseCase: GetMobileTaskUseCase,
    private readonly claimMobileTaskUseCase: ClaimMobileTaskUseCase,
    private readonly releaseMobileTaskUseCase: ReleaseMobileTaskUseCase,
    private readonly recordMobileScanUseCase: RecordMobileScanUseCase,
  ) {}

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.MobileTask, {
    WarehouseId: { In: 'query', Key: 'WarehouseId' },
  })
  public async List(@Query() query: ListMobileTasksQuery, @CurrentAuditContext() context: AuditContext) {
    return await this.listMobileTasksUseCase.Execute({ ...query, ActorUserId: context.ActorUserId });
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.MobileTask)
  public async GetById(@Param('id') id: string, @CurrentAuditContext() context: AuditContext) {
    return await this.getMobileTaskUseCase.Execute(id, context.ActorUserId);
  }

  @Post(':id/claim')
  @RequirePermission(ActionCode.Update, ObjectType.MobileTask)
  public async Claim(
    @Param('id') id: string,
    @Body() request: ClaimMobileTaskRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.claimMobileTaskUseCase.Execute({ Id: id, ...request }, context);
  }

  @Post(':id/release')
  @RequirePermission(ActionCode.Update, ObjectType.MobileTask)
  public async Release(
    @Param('id') id: string,
    @Body() _request: ReleaseMobileTaskRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.releaseMobileTaskUseCase.Execute({ Id: id }, context);
  }

  @Post(':id/scans')
  @RequirePermission(ActionCode.Update, ObjectType.MobileTask)
  public async RecordScan(
    @Param('id') id: string,
    @Body() request: RecordMobileScanRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.recordMobileScanUseCase.Execute({ TaskId: id, ...request }, context);
  }
}
