import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { InventoryControlUseCase } from '@modules/InventoryExecution/Application/UseCases/InventoryControlUseCase';
import { ChangeInventoryStatusRequest } from '@modules/InventoryExecution/Presentation/Requests/ChangeInventoryStatusRequest';
import { CorrectSerialNumberRequest } from '@modules/InventoryExecution/Presentation/Requests/CorrectSerialNumberRequest';
import { MoveInventoryInternalRequest } from '@modules/InventoryExecution/Presentation/Requests/MoveInventoryInternalRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('inventory-control')
export class InventoryControlController {
  constructor(private readonly inventoryControlUseCase: InventoryControlUseCase) {}

  @Post('status-changes')
  @RequirePermission(ActionCode.Adjust, ObjectType.InventoryMovement)
  public async ChangeStatus(
    @Body() request: ChangeInventoryStatusRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.inventoryControlUseCase.ChangeStatus(request, context);
  }

  @Post('movements')
  @RequirePermission(ActionCode.Adjust, ObjectType.InventoryMovement)
  public async MoveInternal(
    @Body() request: MoveInventoryInternalRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.inventoryControlUseCase.MoveInternal(request, context);
  }

  @Post('serial-corrections')
  @RequirePermission(ActionCode.Adjust, ObjectType.InventoryMovement)
  public async CorrectSerialNumber(
    @Body() request: CorrectSerialNumberRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.inventoryControlUseCase.CorrectSerialNumber(request, context);
  }
}
