import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import {
  AssignDockUseCase,
  AssignTruckUseCase,
  GetShippingStagingUseCase,
  ListShippingStagingUseCase,
  StagePackageUseCase,
} from '@modules/Shipping/Application/UseCases/ShippingStagingUseCases';
import {
  AssignDockRequest,
  AssignTruckRequest,
  ListShippingStagingQuery,
  StagePackageRequest,
} from '@modules/Shipping/Presentation/Requests/ShippingStagingRequests';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('shipping/staging')
export class ShippingStagingController {
  constructor(
    private readonly listShippingStagingUseCase: ListShippingStagingUseCase,
    private readonly getShippingStagingUseCase: GetShippingStagingUseCase,
    private readonly stagePackageUseCase: StagePackageUseCase,
    private readonly assignDockUseCase: AssignDockUseCase,
    private readonly assignTruckUseCase: AssignTruckUseCase,
  ) {}

  @Get('packages')
  @RequirePermission(ActionCode.Read, ObjectType.Shipment, {
    WarehouseId: { In: 'query', Key: 'WarehouseId' },
    OwnerId: { In: 'query', Key: 'OwnerId' },
  })
  public async List(@Query() query: ListShippingStagingQuery, @CurrentAuditContext() context: AuditContext) {
    return this.listShippingStagingUseCase.Execute(query, context.ActorUserId);
  }

  @Get('packages/:id')
  @RequirePermission(ActionCode.Read, ObjectType.Shipment)
  public async Get(@Param('id') id: string, @CurrentAuditContext() context: AuditContext) {
    return this.getShippingStagingUseCase.Execute(id, context.ActorUserId);
  }

  @Post('packages')
  @RequirePermission(ActionCode.Create, ObjectType.Shipment)
  public async Stage(@Body() request: StagePackageRequest, @CurrentAuditContext() context: AuditContext) {
    return this.stagePackageUseCase.Execute(request, context);
  }

  @Post('packages/:id/dock')
  @RequirePermission(ActionCode.Update, ObjectType.Shipment)
  public async AssignDock(
    @Param('id') id: string,
    @Body() request: AssignDockRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.assignDockUseCase.Execute(id, request, context);
  }

  @Post('packages/:id/truck')
  @RequirePermission(ActionCode.Update, ObjectType.Shipment)
  public async AssignTruck(
    @Param('id') id: string,
    @Body() request: AssignTruckRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.assignTruckUseCase.Execute(id, request, context);
  }
}
