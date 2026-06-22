import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { CreateLabelTemplateDto } from '@modules/BarcodeLabel/Application/DTOs/CreateLabelTemplateDto';
import { LabelTemplateDto } from '@modules/BarcodeLabel/Application/DTOs/LabelTemplateDto';
import { IBarcodeLabelRepository } from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { BarcodeLabelDtoMapper } from '@modules/BarcodeLabel/Application/Mappers/BarcodeLabelDtoMapper';
import { LabelTemplateEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateEntity';
import { LabelTemplateVersionEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateVersionEntity';
import { LabelTemplateStatus } from '@modules/BarcodeLabel/Domain/Enums/LabelTemplateStatus';

export class CreateLabelTemplateUseCase {
  constructor(
    private readonly labels: IBarcodeLabelRepository,
    private readonly audited?: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreateLabelTemplateDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<LabelTemplateDto> {
    this.AssertTemplate(request.TemplateCode, request.TemplateName, request.RequiredFields, request.TemplateBody);
    const duplicate = await this.labels.FindTemplateByCode(request.TemplateCode);
    if (duplicate) {
      throw new ConflictException('Label template code already exists');
    }

    const now = new Date();
    const templateId = randomUUID();
    const versionId = randomUUID();
    const template = new LabelTemplateEntity({
      Id: templateId,
      TemplateCode: request.TemplateCode,
      TemplateName: request.TemplateName,
      LabelType: request.LabelType,
      Status: request.Status ?? LabelTemplateStatus.Active,
      RequiredFields: this.NormalizeFields(request.RequiredFields),
      TemplateBody: request.TemplateBody,
      ActiveVersionId: versionId,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: context.ActorUserId,
      UpdatedBy: context.ActorUserId,
    });
    const version = new LabelTemplateVersionEntity({
      Id: versionId,
      TemplateId: templateId,
      VersionNo: 1,
      TemplateBody: template.TemplateBody,
      RequiredFields: template.RequiredFields,
      Status: LabelTemplateStatus.Active,
      CreatedAt: now,
      CreatedBy: context.ActorUserId,
    });

    if (!this.audited) {
      const created = await this.labels.CreateTemplate(template);
      await this.labels.CreateTemplateVersion(version);
      return BarcodeLabelDtoMapper.ToTemplateDto(created);
    }

    return this.audited.Run(async (manager) => {
      const created = await this.labels.CreateTemplate(template, manager);
      await this.labels.CreateTemplateVersion(version, manager);
      return {
        result: BarcodeLabelDtoMapper.ToTemplateDto(created),
        entry: MergeAuditContext(context, {
          Action: ActionCode.Create,
          ObjectType: ObjectType.LabelTemplate,
          ObjectId: created.Id,
          ObjectCode: created.TemplateCode,
          AfterJson: BarcodeLabelDtoMapper.ToTemplateDto(created) as unknown as Record<string, unknown>,
        }),
      };
    });
  }

  private AssertTemplate(
    templateCode: string,
    templateName: string,
    requiredFields: string[],
    templateBody: string,
  ): void {
    if (!templateCode?.trim() || !templateName?.trim() || !templateBody?.trim()) {
      throw new BusinessRuleException('Label template requires code, name and template body');
    }
    const fields = this.NormalizeFields(requiredFields);
    if (fields.length === 0) {
      throw new BusinessRuleException('Label template requires at least one required payload field');
    }
  }

  private NormalizeFields(fields: string[]): string[] {
    return [...new Set((fields ?? []).map((field) => field.trim()).filter(Boolean))];
  }
}
