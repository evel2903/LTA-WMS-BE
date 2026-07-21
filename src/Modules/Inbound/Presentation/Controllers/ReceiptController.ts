import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { CaptureInboundDiscrepancyUseCase } from '@modules/Inbound/Application/UseCases/CaptureInboundDiscrepancyUseCase';
import { CreateManualReceiptUseCase } from '@modules/Inbound/Application/UseCases/CreateManualReceiptUseCase';
import { ConfirmInboundLpnUseCase } from '@modules/Inbound/Application/UseCases/ConfirmInboundLpnUseCase';
import { ConfirmReceiptLineUseCase } from '@modules/Inbound/Application/UseCases/ConfirmReceiptLineUseCase';
import { EvaluateQcTaskUseCase } from '@modules/Inbound/Application/UseCases/EvaluateQcTaskUseCase';
import { GetReceiptOperationalStateUseCase } from '@modules/Inbound/Application/UseCases/GetReceiptOperationalStateUseCase';
import { GetReceiptUseCase } from '@modules/Inbound/Application/UseCases/GetReceiptUseCase';
import { ListReceiptsUseCase } from '@modules/Inbound/Application/UseCases/ListReceiptsUseCase';
import { ReleaseInboundToPutawayUseCase } from '@modules/Inbound/Application/UseCases/ReleaseInboundToPutawayUseCase';
import { CaptureInboundDiscrepancyRequest } from '@modules/Inbound/Presentation/Requests/CaptureInboundDiscrepancyRequest';
import { ConfirmInboundLpnRequest } from '@modules/Inbound/Presentation/Requests/ConfirmInboundLpnRequest';
import { ConfirmReceiptLineRequest } from '@modules/Inbound/Presentation/Requests/ConfirmReceiptLineRequest';
import { CreateManualReceiptRequest } from '@modules/Inbound/Presentation/Requests/CreateManualReceiptRequest';
import { EvaluateQcTaskRequest } from '@modules/Inbound/Presentation/Requests/EvaluateQcTaskRequest';
import { ReleaseInboundToPutawayRequest } from '@modules/Inbound/Presentation/Requests/ReleaseInboundToPutawayRequest';
import { ListReceiptsQuery } from '@modules/Inbound/Presentation/Requests/ListReceiptsQuery';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('receipts')
export class ReceiptController {
  constructor(
    private readonly createManualReceiptUseCase: CreateManualReceiptUseCase,
    private readonly listReceiptsUseCase: ListReceiptsUseCase,
    private readonly getReceiptUseCase: GetReceiptUseCase,
    private readonly getReceiptOperationalStateUseCase: GetReceiptOperationalStateUseCase,
    private readonly confirmReceiptLineUseCase: ConfirmReceiptLineUseCase,
    private readonly confirmInboundLpnUseCase: ConfirmInboundLpnUseCase,
    private readonly releaseInboundToPutawayUseCase: ReleaseInboundToPutawayUseCase,
    private readonly captureInboundDiscrepancyUseCase: CaptureInboundDiscrepancyUseCase,
    private readonly evaluateQcTaskUseCase: EvaluateQcTaskUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Receipt, {
    WarehouseId: { In: 'body', Key: 'WarehouseId' },
    OwnerId: { In: 'body', Key: 'OwnerId' },
  })
  public async Create(@Body() request: CreateManualReceiptRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createManualReceiptUseCase.Execute(request, context);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Receipt, {
    WarehouseId: { In: 'query', Key: 'WarehouseId' },
    OwnerId: { In: 'query', Key: 'OwnerId' },
  })
  public async List(@Query() query: ListReceiptsQuery, @CurrentAuditContext() context: AuditContext) {
    return await this.listReceiptsUseCase.Execute({ ...query, ActorUserId: context.ActorUserId });
  }

  @Get(':receiptId/operational-state')
  @RequirePermission(ActionCode.Read, ObjectType.Receipt)
  public async GetOperationalState(
    @Param('receiptId') receiptId: string,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.getReceiptOperationalStateUseCase.Execute(receiptId, context.ActorUserId);
  }

  @Get(':receiptId')
  @RequirePermission(ActionCode.Read, ObjectType.Receipt)
  public async GetById(@Param('receiptId') receiptId: string, @CurrentAuditContext() context: AuditContext) {
    return await this.getReceiptUseCase.Execute(receiptId, context.ActorUserId);
  }

  @Post(':receiptId/lines')
  @RequirePermission(ActionCode.Update, ObjectType.Receipt)
  public async ConfirmReceiptLine(
    @Param('receiptId') receiptId: string,
    @Body() request: ConfirmReceiptLineRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.confirmReceiptLineUseCase.Execute({ ReceiptId: receiptId, ...request }, context);
  }

  @Post(':receiptId/lines/:receiptLineId/lpn')
  @RequirePermission(ActionCode.Update, ObjectType.Receipt)
  public async ConfirmInboundLpn(
    @Param('receiptId') receiptId: string,
    @Param('receiptLineId') receiptLineId: string,
    @Body() request: ConfirmInboundLpnRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.confirmInboundLpnUseCase.Execute(
      { ReceiptId: receiptId, ReceiptLineId: receiptLineId, ...request },
      context,
    );
  }

  @Post(':receiptId/lines/:receiptLineId/release-to-putaway')
  @RequirePermission(ActionCode.Update, ObjectType.Receipt)
  public async ReleaseInboundToPutaway(
    @Param('receiptId') receiptId: string,
    @Param('receiptLineId') receiptLineId: string,
    @Body() request: ReleaseInboundToPutawayRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.releaseInboundToPutawayUseCase.Execute(
      { ReceiptId: receiptId, ReceiptLineId: receiptLineId, ...request },
      context,
    );
  }

  @Post(':receiptId/discrepancies')
  @RequirePermission(ActionCode.Update, ObjectType.Receipt)
  public async CaptureDiscrepancy(
    @Param('receiptId') receiptId: string,
    @Body() request: CaptureInboundDiscrepancyRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.captureInboundDiscrepancyUseCase.Execute({ ReceiptId: receiptId, ...request }, context);
  }

  @Post(':receiptId/qc-tasks')
  @RequirePermission(ActionCode.Create, ObjectType.QcTask)
  public async EvaluateQcTask(
    @Param('receiptId') receiptId: string,
    @Body() request: EvaluateQcTaskRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.evaluateQcTaskUseCase.Execute({ ReceiptId: receiptId, ...request }, context);
  }
}
