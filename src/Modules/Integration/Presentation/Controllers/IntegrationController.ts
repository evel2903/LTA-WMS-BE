import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { ImportIntegrationBatchUseCase } from '@modules/Integration/Application/UseCases/ImportIntegrationBatchUseCase';
import { ListImportBatchesUseCase } from '@modules/Integration/Application/UseCases/ListImportBatchesUseCase';
import { ListOutboxMessagesUseCase } from '@modules/Integration/Application/UseCases/ListOutboxMessagesUseCase';
import { RecordOutboxEventUseCase } from '@modules/Integration/Application/UseCases/RecordOutboxEventUseCase';
import { ImportIntegrationBatchRequest } from '@modules/Integration/Presentation/Requests/ImportIntegrationBatchRequest';
import { IntegrationEnvelopeRequest } from '@modules/Integration/Presentation/Requests/IntegrationEnvelopeRequest';
import { ListIntegrationQuery } from '@modules/Integration/Presentation/Requests/ListIntegrationQuery';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('integration')
export class IntegrationController {
  constructor(
    private readonly importIntegrationBatchUseCase: ImportIntegrationBatchUseCase,
    private readonly listImportBatchesUseCase: ListImportBatchesUseCase,
    private readonly listOutboxMessagesUseCase: ListOutboxMessagesUseCase,
    private readonly recordOutboxEventUseCase: RecordOutboxEventUseCase,
  ) {}

  @Post('imports')
  @RequirePermission(ActionCode.Create, ObjectType.IntegrationMessage)
  public async Import(@Body() request: ImportIntegrationBatchRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.importIntegrationBatchUseCase.Execute(request, context);
  }

  @Get('imports')
  @RequirePermission(ActionCode.Read, ObjectType.IntegrationMessage)
  public async ListImports(@Query() query: ListIntegrationQuery) {
    return await this.listImportBatchesUseCase.Execute(query);
  }

  @Post('events')
  @RequirePermission(ActionCode.Create, ObjectType.IntegrationMessage)
  public async RecordEvent(@Body() request: IntegrationEnvelopeRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.recordOutboxEventUseCase.Execute(request, context);
  }

  @Get('events')
  @RequirePermission(ActionCode.Read, ObjectType.IntegrationMessage)
  public async ListEvents(@Query() query: ListIntegrationQuery) {
    return await this.listOutboxMessagesUseCase.Execute(query);
  }
}
