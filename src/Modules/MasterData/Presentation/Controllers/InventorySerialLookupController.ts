import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { ListInventorySerialLookupUseCase } from '@modules/MasterData/Application/UseCases/ListInventorySerialLookupUseCase';
import { ListInventorySerialLookupQuery } from '@modules/MasterData/Presentation/Requests/ListInventorySerialLookupQuery';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('inventory-balances')
export class InventorySerialLookupController {
  constructor(private readonly listInventorySerialLookupUseCase: ListInventorySerialLookupUseCase) {}

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.InventoryMovement, {
    WarehouseId: { In: 'query', Key: 'WarehouseId' },
    OwnerId: { In: 'query', Key: 'OwnerId' },
  })
  public async List(@Query() query: ListInventorySerialLookupQuery) {
    return await this.listInventorySerialLookupUseCase.Execute(query);
  }
}
