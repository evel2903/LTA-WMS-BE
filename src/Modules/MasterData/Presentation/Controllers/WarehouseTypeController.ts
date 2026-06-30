import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { CreateWarehouseTypeUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseTypeUseCase';
import { GetWarehouseTypeUseCase } from '@modules/MasterData/Application/UseCases/GetWarehouseTypeUseCase';
import { ListWarehouseTypesUseCase } from '@modules/MasterData/Application/UseCases/ListWarehouseTypesUseCase';
import { UpdateWarehouseTypeUseCase } from '@modules/MasterData/Application/UseCases/UpdateWarehouseTypeUseCase';
import { CreateWarehouseTypeRequest } from '@modules/MasterData/Presentation/Requests/CreateWarehouseTypeRequest';
import { ListWarehouseTypesQuery } from '@modules/MasterData/Presentation/Requests/ListWarehouseTypesQuery';
import { UpdateWarehouseTypeRequest } from '@modules/MasterData/Presentation/Requests/UpdateWarehouseTypeRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('warehouse-types')
export class WarehouseTypeController {
  constructor(
    private readonly createWarehouseTypeUseCase: CreateWarehouseTypeUseCase,
    private readonly getWarehouseTypeUseCase: GetWarehouseTypeUseCase,
    private readonly listWarehouseTypesUseCase: ListWarehouseTypesUseCase,
    private readonly updateWarehouseTypeUseCase: UpdateWarehouseTypeUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Warehouse)
  public async Create(@Body() request: CreateWarehouseTypeRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createWarehouseTypeUseCase.Execute(request, context);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Warehouse)
  public async List(@Query() query: ListWarehouseTypesQuery) {
    return await this.listWarehouseTypesUseCase.Execute(query);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.Warehouse)
  public async GetById(@Param('id') id: string) {
    return await this.getWarehouseTypeUseCase.Execute(id);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.Warehouse)
  public async Update(
    @Param('id') id: string,
    @Body() request: UpdateWarehouseTypeRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.updateWarehouseTypeUseCase.Execute({ Id: id, ...request }, context);
  }
}
