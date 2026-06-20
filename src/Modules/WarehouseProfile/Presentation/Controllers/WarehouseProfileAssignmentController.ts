import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CreateWarehouseProfileAssignmentUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileAssignmentUseCase';
import { ListWarehouseProfileAssignmentsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfileAssignmentsUseCase';
import { CreateWarehouseProfileAssignmentRequest } from '@modules/WarehouseProfile/Presentation/Requests/CreateWarehouseProfileAssignmentRequest';
import { ListWarehouseProfileAssignmentsQuery } from '@modules/WarehouseProfile/Presentation/Requests/ListWarehouseProfileAssignmentsQuery';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('warehouse-profiles/:id/assignments')
export class WarehouseProfileAssignmentController {
  constructor(
    private readonly createWarehouseProfileAssignmentUseCase: CreateWarehouseProfileAssignmentUseCase,
    private readonly listWarehouseProfileAssignmentsUseCase: ListWarehouseProfileAssignmentsUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Update, ObjectType.WarehouseProfile)
  public async Create(
    @Param('id') id: string,
    @Body() request: CreateWarehouseProfileAssignmentRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.createWarehouseProfileAssignmentUseCase.Execute({ WarehouseProfileId: id, ...request }, context);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.WarehouseProfile)
  public async List(@Param('id') id: string, @Query() query: ListWarehouseProfileAssignmentsQuery) {
    return await this.listWarehouseProfileAssignmentsUseCase.Execute(id, query);
  }
}
