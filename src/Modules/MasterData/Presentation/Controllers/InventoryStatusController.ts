import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { GetInventoryStatusUseCase } from '@modules/MasterData/Application/UseCases/GetInventoryStatusUseCase';
import { ListInventoryStatusesUseCase } from '@modules/MasterData/Application/UseCases/ListInventoryStatusesUseCase';
import { UpdateInventoryStatusUseCase } from '@modules/MasterData/Application/UseCases/UpdateInventoryStatusUseCase';
import { ListInventoryStatusesQuery } from '@modules/MasterData/Presentation/Requests/ListInventoryStatusesQuery';
import { UpdateInventoryStatusRequest } from '@modules/MasterData/Presentation/Requests/UpdateInventoryStatusRequest';

/**
 * C14: expose the seeded inventory-status catalog (A5) — read (list/get) + controlled
 * update of behavior flags (audited, reason-required via A6). No create/delete.
 */
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('inventory-statuses')
export class InventoryStatusController {
  constructor(
    private readonly listInventoryStatusesUseCase: ListInventoryStatusesUseCase,
    private readonly getInventoryStatusUseCase: GetInventoryStatusUseCase,
    private readonly updateInventoryStatusUseCase: UpdateInventoryStatusUseCase,
  ) {}

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.InventoryStatus)
  public async List(@Query() query: ListInventoryStatusesQuery) {
    return await this.listInventoryStatusesUseCase.Execute(query);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.InventoryStatus)
  public async GetById(@Param('id') id: string) {
    return await this.getInventoryStatusUseCase.Execute(id);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.InventoryStatus)
  public async Update(
    @Param('id') id: string,
    @Body() request: UpdateInventoryStatusRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.updateInventoryStatusUseCase.Execute({ Id: id, ...request }, context);
  }
}
