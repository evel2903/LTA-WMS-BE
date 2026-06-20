import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CreateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseUseCase';
import { GetWarehouseByIdUseCase } from '@modules/MasterData/Application/UseCases/GetWarehouseByIdUseCase';
import { ListWarehousesUseCase } from '@modules/MasterData/Application/UseCases/ListWarehousesUseCase';
import { UpdateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/UpdateWarehouseUseCase';
import { CreateWarehouseRequest } from '@modules/MasterData/Presentation/Requests/CreateWarehouseRequest';
import { ListWarehousesQuery } from '@modules/MasterData/Presentation/Requests/ListWarehousesQuery';
import { UpdateWarehouseRequest } from '@modules/MasterData/Presentation/Requests/UpdateWarehouseRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('warehouses')
export class WarehouseController {
  constructor(
    private readonly createWarehouseUseCase: CreateWarehouseUseCase,
    private readonly getWarehouseByIdUseCase: GetWarehouseByIdUseCase,
    private readonly listWarehousesUseCase: ListWarehousesUseCase,
    private readonly updateWarehouseUseCase: UpdateWarehouseUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Warehouse)
  public async Create(@Body() request: CreateWarehouseRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createWarehouseUseCase.Execute(request, context);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.Warehouse)
  public async GetById(@Param('id') id: string) {
    return await this.getWarehouseByIdUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Warehouse)
  public async List(@Query() query: ListWarehousesQuery) {
    return await this.listWarehousesUseCase.Execute(query);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.Warehouse)
  public async Update(
    @Param('id') id: string,
    @Body() request: UpdateWarehouseRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.updateWarehouseUseCase.Execute({ Id: id, ...request }, context);
  }
}
