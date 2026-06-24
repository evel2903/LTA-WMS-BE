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
  ConfirmShipmentUseCase,
  EvaluateGoodsIssueTriggerUseCase,
  GetShippingStagingUseCase,
  ListShippingStagingUseCase,
  PostGoodsIssueUseCase,
  RecordGateOutUseCase,
  ScanLoadingUseCase,
  StagePackageUseCase,
} from '@modules/Shipping/Application/UseCases/ShippingStagingUseCases';
import {
  AssignDockRequest,
  AssignTruckRequest,
  ConfirmShipmentRequest,
  EvaluateGoodsIssueTriggerRequest,
  ListShippingStagingQuery,
  PostGoodsIssueRequest,
  RecordGateOutRequest,
  ScanLoadingRequest,
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
    private readonly scanLoadingUseCase: ScanLoadingUseCase,
    private readonly confirmShipmentUseCase: ConfirmShipmentUseCase,
    private readonly recordGateOutUseCase: RecordGateOutUseCase,
    private readonly evaluateGoodsIssueTriggerUseCase: EvaluateGoodsIssueTriggerUseCase,
    private readonly postGoodsIssueUseCase: PostGoodsIssueUseCase,
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

  @Post('packages/:id/loading')
  @RequirePermission(ActionCode.Update, ObjectType.Shipment)
  public async ScanLoading(
    @Param('id') id: string,
    @Body() request: ScanLoadingRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.scanLoadingUseCase.Execute(id, request, context);
  }

  @Post('packages/:id/confirm')
  @RequirePermission(ActionCode.Update, ObjectType.Shipment)
  public async ConfirmShipment(
    @Param('id') id: string,
    @Body() request: ConfirmShipmentRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.confirmShipmentUseCase.Execute(id, request, context);
  }

  @Post('packages/:id/gate-out')
  @RequirePermission(ActionCode.Update, ObjectType.Shipment)
  public async RecordGateOut(
    @Param('id') id: string,
    @Body() request: RecordGateOutRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.recordGateOutUseCase.Execute(id, request, context);
  }

  @Post('packages/:id/goods-issue-trigger')
  @RequirePermission(ActionCode.Adjust, ObjectType.GoodsIssue)
  public async EvaluateGoodsIssueTrigger(
    @Param('id') id: string,
    @Body() request: EvaluateGoodsIssueTriggerRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.evaluateGoodsIssueTriggerUseCase.Execute(id, request, context);
  }

  @Post('packages/:id/goods-issue')
  @RequirePermission(ActionCode.Adjust, ObjectType.GoodsIssue)
  public async PostGoodsIssue(
    @Param('id') id: string,
    @Body() request: PostGoodsIssueRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.postGoodsIssueUseCase.Execute(id, request, context);
  }
}
