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
import { CreateLabelTemplateVersionDto } from '@modules/BarcodeLabel/Application/DTOs/CreateLabelTemplateDto';
import { LabelTemplateDto } from '@modules/BarcodeLabel/Application/DTOs/LabelTemplateDto';
import { IBarcodeLabelRepository } from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { BarcodeLabelDtoMapper } from '@modules/BarcodeLabel/Application/Mappers/BarcodeLabelDtoMapper';
import { LabelTemplateVersionEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateVersionEntity';
import { LabelTemplateStatus } from '@modules/BarcodeLabel/Domain/Enums/LabelTemplateStatus';

export class CreateLabelTemplateVersionUseCase {
  constructor(
    private readonly labels: IBarcodeLabelRepository,
    private readonly audited?: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreateLabelTemplateVersionDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<LabelTemplateDto> {
    const template = await this.labels.FindTemplateById(request.TemplateId);
    if (!template) {
      throw new NotFoundException('Label template not found');
    }
    const fields = [...new Set((request.RequiredFields ?? []).map((field) => field.trim()).filter(Boolean))];
    if (fields.length === 0 || !request.TemplateBody?.trim()) {
      throw new BusinessRuleException('Template version requires required fields and template body');
    }
    const versionNo = (await this.labels.CountTemplateVersions(template.Id)) + 1;
    const now = new Date();
    const version = new LabelTemplateVersionEntity({
      Id: randomUUID(),
      TemplateId: template.Id,
      VersionNo: versionNo,
      TemplateBody: request.TemplateBody,
      RequiredFields: fields,
      Status: LabelTemplateStatus.Active,
      CreatedAt: now,
      CreatedBy: context.ActorUserId,
    });
    template.TemplateBody = request.TemplateBody;
    template.RequiredFields = fields;
    template.ActiveVersionId = version.Id;
    template.UpdatedAt = now;
    template.UpdatedBy = context.ActorUserId;

    if (!this.audited) {
      await this.labels.CreateTemplateVersion(version);
      return BarcodeLabelDtoMapper.ToTemplateDto(await this.labels.UpdateTemplate(template));
    }

    return this.audited.Run(async (manager) => {
      await this.labels.CreateTemplateVersion(version, manager);
      const updated = await this.labels.UpdateTemplate(template, manager);
      return {
        result: BarcodeLabelDtoMapper.ToTemplateDto(updated),
        entry: MergeAuditContext(context, {
          Action: ActionCode.Update,
          ObjectType: ObjectType.LabelTemplate,
          ObjectId: updated.Id,
          ObjectCode: updated.TemplateCode,
          AfterJson: BarcodeLabelDtoMapper.ToTemplateDto(updated) as unknown as Record<string, unknown>,
        }),
      };
    });
  }
}
