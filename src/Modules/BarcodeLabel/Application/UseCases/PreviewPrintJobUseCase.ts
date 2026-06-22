import { randomUUID } from 'crypto';
import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { PreviewPrintJobDto } from '@modules/BarcodeLabel/Application/DTOs/PreviewPrintJobDto';
import { PrintJobDto } from '@modules/BarcodeLabel/Application/DTOs/PrintJobDto';
import { IBarcodeLabelRepository } from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { BarcodeLabelDtoMapper } from '@modules/BarcodeLabel/Application/Mappers/BarcodeLabelDtoMapper';
import { PrintJobEntity } from '@modules/BarcodeLabel/Domain/Entities/PrintJobEntity';
import { PrintJobStatus } from '@modules/BarcodeLabel/Domain/Enums/PrintJobStatus';

export class PreviewPrintJobUseCase {
  constructor(
    private readonly labels: IBarcodeLabelRepository,
    private readonly audited?: AuditedTransaction,
  ) {}

  public async Execute(request: PreviewPrintJobDto, context: AuditContext = SystemAuditContext): Promise<PrintJobDto> {
    const template = await this.labels.FindTemplateById(request.TemplateId);
    if (!template) throw new NotFoundException('Label template not found');
    const version = request.TemplateVersionId
      ? await this.labels.FindVersionById(request.TemplateVersionId)
      : template.ActiveVersionId
        ? await this.labels.FindVersionById(template.ActiveVersionId)
        : await this.labels.FindActiveVersion(template.Id);
    if (!version) throw new NotFoundException('Label template version not found');
    if (version.TemplateId !== template.Id) {
      throw new BusinessRuleException('Label template version does not belong to template', {
        TemplateId: template.Id,
        TemplateVersionId: version.Id,
      });
    }

    const missing = version.RequiredFields.filter((field) => !this.HasPayloadValue(request.PayloadJson, field));
    if (missing.length > 0) {
      throw new BusinessRuleException('Label payload is missing required fields', { MissingFields: missing });
    }

    const now = new Date();
    const printJob = new PrintJobEntity({
      Id: randomUUID(),
      JobCode: `PJ-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      TemplateId: template.Id,
      TemplateVersionId: version.Id,
      BusinessObjectType: request.BusinessObjectType,
      BusinessObjectId: request.BusinessObjectId,
      BusinessObjectCode: request.BusinessObjectCode ?? null,
      WarehouseId: request.WarehouseId ?? null,
      OwnerId: request.OwnerId ?? null,
      PayloadJson: request.PayloadJson,
      PreviewContent: this.Render(version.TemplateBody, request.PayloadJson),
      Status: PrintJobStatus.Previewed,
      RequestedBy: context.ActorUserId,
      RequestedAt: now,
      CompletedAt: now,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: context.ActorUserId,
      UpdatedBy: context.ActorUserId,
    });

    if (!this.audited) {
      return BarcodeLabelDtoMapper.ToPrintJobDto(await this.labels.CreatePrintJob(printJob));
    }

    return this.audited.Run(async (manager) => {
      const created = await this.labels.CreatePrintJob(printJob, manager);
      return {
        result: BarcodeLabelDtoMapper.ToPrintJobDto(created),
        entry: MergeAuditContext(context, {
          Action: ActionCode.Create,
          ObjectType: ObjectType.PrintJob,
          ObjectId: created.Id,
          ObjectCode: created.JobCode,
          AfterJson: BarcodeLabelDtoMapper.ToPrintJobDto(created) as unknown as Record<string, unknown>,
          WarehouseId: created.WarehouseId,
          OwnerId: created.OwnerId,
          ReferenceType: created.BusinessObjectType,
          ReferenceId: created.BusinessObjectId,
        }),
      };
    });
  }

  private HasPayloadValue(payload: Record<string, unknown>, field: string): boolean {
    const value = payload?.[field];
    return value !== undefined && value !== null && `${value}`.trim().length > 0;
  }

  private Render(templateBody: string, payload: Record<string, unknown>): string {
    return templateBody.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
      const value = payload[key];
      return value === undefined || value === null ? '' : String(value);
    });
  }
}
