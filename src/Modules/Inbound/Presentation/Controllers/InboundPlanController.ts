import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { BusinessRuleException } from '@common/Exceptions/AppException';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { CancelInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/CancelInboundPlanUseCase';
import { ConfirmInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/ConfirmInboundPlanUseCase';
import { CreateInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/CreateInboundPlanUseCase';
import { ImportInboundPlanLinesUseCase } from '@modules/Inbound/Application/UseCases/ImportInboundPlanLinesUseCase';
import { GetInboundOperationalStateUseCase } from '@modules/Inbound/Application/UseCases/GetInboundOperationalStateUseCase';
import { GetInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/GetInboundPlanUseCase';
import { ListInboundPlansUseCase } from '@modules/Inbound/Application/UseCases/ListInboundPlansUseCase';
import { RecordGateInUseCase } from '@modules/Inbound/Application/UseCases/RecordGateInUseCase';
import { StartReceivingSessionUseCase } from '@modules/Inbound/Application/UseCases/StartReceivingSessionUseCase';
import { UpdateInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/UpdateInboundPlanUseCase';
import { ValidateReceivingReadinessUseCase } from '@modules/Inbound/Application/UseCases/ValidateReceivingReadinessUseCase';
import { CancelInboundPlanRequest } from '@modules/Inbound/Presentation/Requests/CancelInboundPlanRequest';
import { ConfirmInboundPlanRequest } from '@modules/Inbound/Presentation/Requests/ConfirmInboundPlanRequest';
import { CreateInboundPlanRequest } from '@modules/Inbound/Presentation/Requests/CreateInboundPlanRequest';
import { ImportInboundPlanLinesQuery } from '@modules/Inbound/Presentation/Requests/ImportInboundPlanLinesQuery';
import { ListInboundPlansQuery } from '@modules/Inbound/Presentation/Requests/ListInboundPlansQuery';
import { RecordGateInRequest } from '@modules/Inbound/Presentation/Requests/RecordGateInRequest';
import { StartReceivingSessionRequest } from '@modules/Inbound/Presentation/Requests/StartReceivingSessionRequest';
import { UpdateInboundPlanRequest } from '@modules/Inbound/Presentation/Requests/UpdateInboundPlanRequest';
import { ValidateReceivingReadinessRequest } from '@modules/Inbound/Presentation/Requests/ValidateReceivingReadinessRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('inbound-plans')
export class InboundPlanController {
  constructor(
    private readonly createInboundPlanUseCase: CreateInboundPlanUseCase,
    private readonly getInboundPlanUseCase: GetInboundPlanUseCase,
    private readonly getInboundOperationalStateUseCase: GetInboundOperationalStateUseCase,
    private readonly listInboundPlansUseCase: ListInboundPlansUseCase,
    private readonly recordGateInUseCase: RecordGateInUseCase,
    private readonly validateReceivingReadinessUseCase: ValidateReceivingReadinessUseCase,
    private readonly startReceivingSessionUseCase: StartReceivingSessionUseCase,
    private readonly importInboundPlanLinesUseCase: ImportInboundPlanLinesUseCase,
    private readonly updateInboundPlanUseCase: UpdateInboundPlanUseCase,
    private readonly confirmInboundPlanUseCase: ConfirmInboundPlanUseCase,
    private readonly cancelInboundPlanUseCase: CancelInboundPlanUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.InboundPlan, {
    WarehouseId: { In: 'body', Key: 'WarehouseId' },
    OwnerId: { In: 'body', Key: 'OwnerId' },
  })
  public async Create(@Body() request: CreateInboundPlanRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createInboundPlanUseCase.Execute(request, context);
  }

  // Tải file .xlsx mẫu để điền dòng hàng. Khai báo TRƯỚC @Get(':id') để không bị bắt nhầm là :id.
  // Trả nhị phân qua @Res (bypass ResponseInterceptor — không bọc envelope { Success, Data }).
  @Get('line-import-template')
  @RequirePermission(ActionCode.Read, ObjectType.InboundPlan)
  public async LineImportTemplate(@Res() res: Response): Promise<void> {
    const buffer = await this.importInboundPlanLinesUseCase.BuildTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="inbound-line-template.xlsx"',
      'Content-Length': String(buffer.length),
    });
    res.send(buffer);
  }

  // Import dòng từ file Excel (multipart 'file'). Scope WarehouseId/OwnerId qua QUERY vì guard
  // chạy TRƯỚC FileInterceptor (req.body multipart rỗng khi PermissionGuard đọc scope).
  // preview=true → chỉ validate (per-row errors), không tạo. Ngược lại → tạo plan atomic.
  @Post('import')
  @RequirePermission(ActionCode.Create, ObjectType.InboundPlan, {
    WarehouseId: { In: 'query', Key: 'WarehouseId' },
    OwnerId: { In: 'query', Key: 'OwnerId' },
  })
  @UseInterceptors(FileInterceptor('file'))
  public async ImportLines(
    @UploadedFile() file: Express.Multer.File,
    @Query() query: ImportInboundPlanLinesQuery,
    @CurrentAuditContext() context: AuditContext,
  ) {
    if (!file) {
      throw new BusinessRuleException('Thiếu file Excel để import.');
    }
    const fileName = file.originalname ?? 'import.xlsx';
    if (!fileName.toLowerCase().endsWith('.xlsx')) {
      throw new BusinessRuleException('Chỉ hỗ trợ file Excel (.xlsx).');
    }
    if (query.Preview === 'true') {
      return await this.importInboundPlanLinesUseCase.Preview(file.buffer, fileName);
    }
    return await this.importInboundPlanLinesUseCase.Commit(
      file.buffer,
      fileName,
      {
        SourceSystem: query.SourceSystem ?? '',
        SourceDocumentType: query.SourceDocumentType,
        SourceDocumentNumber: query.SourceDocumentNumber ?? '',
        SupplierId: query.SupplierId ?? '',
        OwnerId: query.OwnerId ?? '',
        WarehouseId: query.WarehouseId ?? '',
        WarehouseProfileId: query.WarehouseProfileId ?? null,
        ExpectedArrivalAt: query.ExpectedArrivalAt ?? null,
      },
      context,
    );
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.InboundPlan, {
    WarehouseId: { In: 'query', Key: 'WarehouseId' },
    OwnerId: { In: 'query', Key: 'OwnerId' },
  })
  public async List(@Query() query: ListInboundPlansQuery, @CurrentAuditContext() context: AuditContext) {
    return await this.listInboundPlansUseCase.Execute({ ...query, ActorUserId: context.ActorUserId });
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.InboundPlan)
  public async GetById(@Param('id') id: string, @CurrentAuditContext() context: AuditContext) {
    return await this.getInboundPlanUseCase.Execute(id, context.ActorUserId);
  }

  // IFB-24: row-level scope (WarehouseId/OwnerId) is checked INSIDE the use case
  // via AssertInboundPlanPermission, against the plan actually fetched by :id --
  // mirrors RecordGateIn's own pattern below, not Create's request-body scope.
  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.InboundPlan)
  public async Update(
    @Param('id') id: string,
    @Body() request: UpdateInboundPlanRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.updateInboundPlanUseCase.Execute({ Id: id, ...request }, context);
  }

  @Post(':id/confirm')
  @RequirePermission(ActionCode.Update, ObjectType.InboundPlan)
  public async Confirm(
    @Param('id') id: string,
    @Body() _request: ConfirmInboundPlanRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.confirmInboundPlanUseCase.Execute({ Id: id }, context);
  }

  @Post(':id/cancel')
  @RequirePermission(ActionCode.DeleteCancel, ObjectType.InboundPlan)
  public async Cancel(
    @Param('id') id: string,
    @Body() _request: CancelInboundPlanRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.cancelInboundPlanUseCase.Execute({ Id: id }, context);
  }

  @Get(':id/operational-state')
  @RequirePermission(ActionCode.Read, ObjectType.InboundPlan)
  public async GetOperationalState(@Param('id') id: string, @CurrentAuditContext() context: AuditContext) {
    return await this.getInboundOperationalStateUseCase.Execute(id, context.ActorUserId);
  }

  @Post(':id/gate-in')
  @RequirePermission(ActionCode.Update, ObjectType.InboundPlan)
  public async RecordGateIn(
    @Param('id') id: string,
    @Body() request: RecordGateInRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.recordGateInUseCase.Execute({ Id: id, ...request }, context);
  }

  @Post(':id/receiving-readiness')
  @RequirePermission(ActionCode.Read, ObjectType.InboundPlan)
  public async ValidateReadiness(
    @Param('id') id: string,
    @Body() request: ValidateReceivingReadinessRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.validateReceivingReadinessUseCase.Execute({ Id: id, ...request }, context);
  }

  @Post(':id/receiving-sessions')
  @RequirePermission(ActionCode.Create, ObjectType.Receipt)
  public async StartReceivingSession(
    @Param('id') id: string,
    @Body() request: StartReceivingSessionRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.startReceivingSessionUseCase.Execute({ InboundPlanId: id, ...request }, context);
  }
}
