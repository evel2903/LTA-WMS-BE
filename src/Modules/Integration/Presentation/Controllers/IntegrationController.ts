import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BusinessRuleException } from '@common/Exceptions/AppException';
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
import { GetOutboxMessageUseCase } from '@modules/Integration/Application/UseCases/GetOutboxMessageUseCase';
import { RecordOutboxFailureUseCase } from '@modules/Integration/Application/UseCases/RecordOutboxFailureUseCase';
import { ResolveDeadLetterUseCase } from '@modules/Integration/Application/UseCases/ResolveDeadLetterUseCase';
import { ImportIntegrationBatchRequest } from '@modules/Integration/Presentation/Requests/ImportIntegrationBatchRequest';
import { IntegrationEnvelopeRequest } from '@modules/Integration/Presentation/Requests/IntegrationEnvelopeRequest';
import { ListIntegrationQuery } from '@modules/Integration/Presentation/Requests/ListIntegrationQuery';
import { DeadLetterActionRequest } from '@modules/Integration/Presentation/Requests/DeadLetterActionRequest';
import { RecordOutboxFailureRequest } from '@modules/Integration/Presentation/Requests/RecordOutboxFailureRequest';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { DeadLetterActionType } from '@modules/Integration/Domain/Enums/DeadLetterActionType';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('integration')
export class IntegrationController {
  private static readonly DeadLetterReadableStatuses = new Set<OutboxMessageStatus>([
    OutboxMessageStatus.DeadLetter,
    OutboxMessageStatus.ManualFixed,
    OutboxMessageStatus.Acknowledged,
    OutboxMessageStatus.Ignored,
  ]);

  constructor(
    private readonly importIntegrationBatchUseCase: ImportIntegrationBatchUseCase,
    private readonly listImportBatchesUseCase: ListImportBatchesUseCase,
    private readonly listOutboxMessagesUseCase: ListOutboxMessagesUseCase,
    private readonly recordOutboxEventUseCase: RecordOutboxEventUseCase,
    private readonly getOutboxMessageUseCase: GetOutboxMessageUseCase,
    private readonly recordOutboxFailureUseCase: RecordOutboxFailureUseCase,
    private readonly resolveDeadLetterUseCase: ResolveDeadLetterUseCase,
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

  @Get('events/:id')
  @RequirePermission(ActionCode.Read, ObjectType.IntegrationMessage)
  public async GetEvent(@Param('id') id: string) {
    return await this.getOutboxMessageUseCase.Execute(id);
  }

  @Post('events/:id/failures')
  @RequirePermission(ActionCode.Update, ObjectType.IntegrationMessage)
  public async RecordFailure(
    @Param('id') id: string,
    @Body() request: RecordOutboxFailureRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.recordOutboxFailureUseCase.Execute(id, request, context);
  }

  @Get('dead-letters')
  @RequirePermission(ActionCode.Read, ObjectType.DeadLetterMessage)
  public async ListDeadLetters(@Query() query: ListIntegrationQuery) {
    return await this.listOutboxMessagesUseCase.Execute({
      ...query,
      Status: this.ResolveDeadLetterReadableStatus(query.Status),
    });
  }

  @Get('dead-letters/:id')
  @RequirePermission(ActionCode.Read, ObjectType.DeadLetterMessage)
  public async GetDeadLetter(@Param('id') id: string) {
    return await this.getOutboxMessageUseCase.Execute(id, IntegrationController.DeadLetterReadableStatuses);
  }

  @Post('dead-letters/:id/retry')
  @RequirePermission(ActionCode.Update, ObjectType.DeadLetterMessage)
  public async RetryDeadLetter(
    @Param('id') id: string,
    @Body() request: DeadLetterActionRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.resolveDeadLetterUseCase.Execute(id, DeadLetterActionType.Retry, request, context);
  }

  @Post('dead-letters/:id/manual-fix')
  @RequirePermission(ActionCode.Update, ObjectType.DeadLetterMessage)
  public async ManualFixDeadLetter(
    @Param('id') id: string,
    @Body() request: DeadLetterActionRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.resolveDeadLetterUseCase.Execute(id, DeadLetterActionType.ManualFix, request, context);
  }

  @Post('dead-letters/:id/ack')
  @RequirePermission(ActionCode.Update, ObjectType.DeadLetterMessage)
  public async AcknowledgeDeadLetter(
    @Param('id') id: string,
    @Body() request: DeadLetterActionRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.resolveDeadLetterUseCase.Execute(id, DeadLetterActionType.Acknowledge, request, context);
  }

  @Post('dead-letters/:id/ignore')
  @RequirePermission(ActionCode.Update, ObjectType.DeadLetterMessage)
  public async IgnoreDeadLetter(
    @Param('id') id: string,
    @Body() request: DeadLetterActionRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.resolveDeadLetterUseCase.Execute(id, DeadLetterActionType.Ignore, request, context);
  }

  private ResolveDeadLetterReadableStatus(status?: string): OutboxMessageStatus {
    if (!status) return OutboxMessageStatus.DeadLetter;
    if (IntegrationController.DeadLetterReadableStatuses.has(status as OutboxMessageStatus)) {
      return status as OutboxMessageStatus;
    }
    throw new BusinessRuleException('Status is not readable through dead-letter endpoints');
  }
}
