import { EntityManager } from 'typeorm';
import { LabelTemplateEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateEntity';
import { LabelTemplateVersionEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateVersionEntity';
import { PrintJobEntity } from '@modules/BarcodeLabel/Domain/Entities/PrintJobEntity';
import { ReprintRequestEntity } from '@modules/BarcodeLabel/Domain/Entities/ReprintRequestEntity';
import { LabelTemplateStatus } from '@modules/BarcodeLabel/Domain/Enums/LabelTemplateStatus';
import { PrintJobStatus } from '@modules/BarcodeLabel/Domain/Enums/PrintJobStatus';

export const BARCODE_LABEL_REPOSITORY = Symbol('IBarcodeLabelRepository');

export interface LabelTemplateListFilter {
  TemplateCode?: string;
  LabelType?: string;
  Status?: LabelTemplateStatus;
}

export interface PrintJobListFilter {
  TemplateId?: string;
  BusinessObjectType?: string;
  BusinessObjectId?: string;
  Status?: PrintJobStatus;
}

export interface IBarcodeLabelRepository {
  FindTemplateByCode(templateCode: string): Promise<LabelTemplateEntity | null>;
  FindTemplateById(id: string): Promise<LabelTemplateEntity | null>;
  FindVersionById(id: string): Promise<LabelTemplateVersionEntity | null>;
  FindActiveVersion(templateId: string): Promise<LabelTemplateVersionEntity | null>;
  CountTemplateVersions(templateId: string): Promise<number>;
  FindPrintJobById(id: string): Promise<PrintJobEntity | null>;
  FindPrintJobByIdForUpdate(id: string, manager: EntityManager): Promise<PrintJobEntity | null>;
  CreateTemplate(template: LabelTemplateEntity, manager?: EntityManager): Promise<LabelTemplateEntity>;
  UpdateTemplate(template: LabelTemplateEntity, manager?: EntityManager): Promise<LabelTemplateEntity>;
  CreateTemplateVersion(
    version: LabelTemplateVersionEntity,
    manager?: EntityManager,
  ): Promise<LabelTemplateVersionEntity>;
  CreatePrintJob(printJob: PrintJobEntity, manager?: EntityManager): Promise<PrintJobEntity>;
  UpdatePrintJob(printJob: PrintJobEntity, manager?: EntityManager): Promise<PrintJobEntity>;
  CreateReprintRequest(request: ReprintRequestEntity, manager?: EntityManager): Promise<ReprintRequestEntity>;
  ListTemplates(
    skip: number,
    take: number,
    filter?: LabelTemplateListFilter,
  ): Promise<{ Items: LabelTemplateEntity[]; TotalItems: number }>;
  ListPrintJobs(
    skip: number,
    take: number,
    filter?: PrintJobListFilter,
  ): Promise<{ Items: PrintJobEntity[]; TotalItems: number }>;
}
