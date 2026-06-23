import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { GetPrintJobUseCase } from '@modules/BarcodeLabel/Application/UseCases/GetPrintJobUseCase';
import { ListPrintJobsUseCase } from '@modules/BarcodeLabel/Application/UseCases/ListPrintJobsUseCase';
import { PreviewPrintJobUseCase } from '@modules/BarcodeLabel/Application/UseCases/PreviewPrintJobUseCase';
import { ReprintPrintJobUseCase } from '@modules/BarcodeLabel/Application/UseCases/ReprintPrintJobUseCase';
import { ListPrintJobsQuery } from '@modules/BarcodeLabel/Presentation/Requests/ListPrintJobsQuery';
import { PreviewPrintJobRequest } from '@modules/BarcodeLabel/Presentation/Requests/PreviewPrintJobRequest';
import { ReprintPrintJobRequest } from '@modules/BarcodeLabel/Presentation/Requests/ReprintPrintJobRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('print-jobs')
export class PrintJobController {
  constructor(
    private readonly previewPrintJobUseCase: PreviewPrintJobUseCase,
    private readonly listPrintJobsUseCase: ListPrintJobsUseCase,
    private readonly getPrintJobUseCase: GetPrintJobUseCase,
    private readonly reprintPrintJobUseCase: ReprintPrintJobUseCase,
  ) {}

  @Post('preview')
  @RequirePermission(ActionCode.Create, ObjectType.PrintJob)
  public async Preview(@Body() request: PreviewPrintJobRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.previewPrintJobUseCase.Execute(request, context);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.PrintJob)
  public async List(@Query() query: ListPrintJobsQuery, @CurrentAuditContext() context: AuditContext) {
    return await this.listPrintJobsUseCase.Execute({ ...query, ActorUserId: context.ActorUserId });
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.PrintJob)
  public async GetById(@Param('id') id: string, @CurrentAuditContext() context: AuditContext) {
    return await this.getPrintJobUseCase.Execute(id, context);
  }

  @Post(':id/reprint')
  @RequirePermission(ActionCode.Reprint, ObjectType.PrintJob)
  public async Reprint(
    @Param('id') id: string,
    @Body() request: ReprintPrintJobRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.reprintPrintJobUseCase.Execute({ PrintJobId: id, ...request }, context);
  }
}
