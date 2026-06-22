import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import {
  IBarcodeLabelRepository,
  LabelTemplateListFilter,
  PrintJobListFilter,
} from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { LabelTemplateEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateEntity';
import { LabelTemplateVersionEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateVersionEntity';
import { PrintJobEntity } from '@modules/BarcodeLabel/Domain/Entities/PrintJobEntity';
import { ReprintRequestEntity } from '@modules/BarcodeLabel/Domain/Entities/ReprintRequestEntity';
import { LabelTemplateStatus } from '@modules/BarcodeLabel/Domain/Enums/LabelTemplateStatus';
import { BarcodeLabelOrmMapper } from '@modules/BarcodeLabel/Infrastructure/Mappers/BarcodeLabelOrmMapper';
import { LabelTemplateOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/LabelTemplateOrmEntity';
import { LabelTemplateVersionOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/LabelTemplateVersionOrmEntity';
import { PrintJobOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/PrintJobOrmEntity';
import { ReprintRequestOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/ReprintRequestOrmEntity';

@Injectable()
export class BarcodeLabelRepository implements IBarcodeLabelRepository {
  constructor(
    @InjectRepository(LabelTemplateOrmEntity)
    private readonly templates: Repository<LabelTemplateOrmEntity>,
    @InjectRepository(LabelTemplateVersionOrmEntity)
    private readonly versions: Repository<LabelTemplateVersionOrmEntity>,
    @InjectRepository(PrintJobOrmEntity)
    private readonly printJobs: Repository<PrintJobOrmEntity>,
    @InjectRepository(ReprintRequestOrmEntity)
    private readonly reprintRequests: Repository<ReprintRequestOrmEntity>,
  ) {}

  public async FindTemplateByCode(templateCode: string): Promise<LabelTemplateEntity | null> {
    const entity = await this.templates.findOne({ where: { TemplateCode: templateCode } });
    return entity ? BarcodeLabelOrmMapper.ToTemplateDomain(entity) : null;
  }

  public async FindTemplateById(id: string): Promise<LabelTemplateEntity | null> {
    const entity = await this.templates.findOne({ where: { Id: id } });
    return entity ? BarcodeLabelOrmMapper.ToTemplateDomain(entity) : null;
  }

  public async FindVersionById(id: string): Promise<LabelTemplateVersionEntity | null> {
    const entity = await this.versions.findOne({ where: { Id: id } });
    return entity ? BarcodeLabelOrmMapper.ToVersionDomain(entity) : null;
  }

  public async FindActiveVersion(templateId: string): Promise<LabelTemplateVersionEntity | null> {
    const entity = await this.versions.findOne({
      where: { TemplateId: templateId, Status: LabelTemplateStatus.Active },
      order: { VersionNo: 'DESC' },
    });
    return entity ? BarcodeLabelOrmMapper.ToVersionDomain(entity) : null;
  }

  public async CountTemplateVersions(templateId: string): Promise<number> {
    return await this.versions.count({ where: { TemplateId: templateId } });
  }

  public async FindPrintJobById(id: string): Promise<PrintJobEntity | null> {
    const entity = await this.printJobs.findOne({ where: { Id: id } });
    return entity ? BarcodeLabelOrmMapper.ToPrintJobDomain(entity) : null;
  }

  public async FindPrintJobByIdForUpdate(id: string, manager: EntityManager): Promise<PrintJobEntity | null> {
    const entity = await manager.getRepository(PrintJobOrmEntity).findOne({
      where: { Id: id },
      lock: { mode: 'pessimistic_write' },
    });
    return entity ? BarcodeLabelOrmMapper.ToPrintJobDomain(entity) : null;
  }

  public async CreateTemplate(template: LabelTemplateEntity, manager?: EntityManager): Promise<LabelTemplateEntity> {
    const repo = manager ? manager.getRepository(LabelTemplateOrmEntity) : this.templates;
    try {
      const saved = await repo.save(BarcodeLabelOrmMapper.ToTemplateOrm(template));
      return BarcodeLabelOrmMapper.ToTemplateDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async UpdateTemplate(template: LabelTemplateEntity, manager?: EntityManager): Promise<LabelTemplateEntity> {
    const repo = manager ? manager.getRepository(LabelTemplateOrmEntity) : this.templates;
    try {
      const saved = await repo.save(BarcodeLabelOrmMapper.ToTemplateOrm(template));
      return BarcodeLabelOrmMapper.ToTemplateDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async CreateTemplateVersion(
    version: LabelTemplateVersionEntity,
    manager?: EntityManager,
  ): Promise<LabelTemplateVersionEntity> {
    const repo = manager ? manager.getRepository(LabelTemplateVersionOrmEntity) : this.versions;
    const saved = await repo.save(BarcodeLabelOrmMapper.ToVersionOrm(version));
    return BarcodeLabelOrmMapper.ToVersionDomain(saved);
  }

  public async CreatePrintJob(printJob: PrintJobEntity, manager?: EntityManager): Promise<PrintJobEntity> {
    const repo = manager ? manager.getRepository(PrintJobOrmEntity) : this.printJobs;
    try {
      const saved = await repo.save(BarcodeLabelOrmMapper.ToPrintJobOrm(printJob));
      return BarcodeLabelOrmMapper.ToPrintJobDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async UpdatePrintJob(printJob: PrintJobEntity, manager?: EntityManager): Promise<PrintJobEntity> {
    const repo = manager ? manager.getRepository(PrintJobOrmEntity) : this.printJobs;
    try {
      const saved = await repo.save(BarcodeLabelOrmMapper.ToPrintJobOrm(printJob));
      return BarcodeLabelOrmMapper.ToPrintJobDomain(saved);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async CreateReprintRequest(
    request: ReprintRequestEntity,
    manager?: EntityManager,
  ): Promise<ReprintRequestEntity> {
    const repo = manager ? manager.getRepository(ReprintRequestOrmEntity) : this.reprintRequests;
    const saved = await repo.save(BarcodeLabelOrmMapper.ToReprintOrm(request));
    return BarcodeLabelOrmMapper.ToReprintDomain(saved);
  }

  public async ListTemplates(
    skip: number,
    take: number,
    filter: LabelTemplateListFilter = {},
  ): Promise<{ Items: LabelTemplateEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<LabelTemplateOrmEntity> = {};
    if (filter.TemplateCode) where.TemplateCode = filter.TemplateCode;
    if (filter.LabelType) where.LabelType = filter.LabelType;
    if (filter.Status) where.Status = filter.Status;
    const [items, total] = await this.templates.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });
    return { Items: items.map(BarcodeLabelOrmMapper.ToTemplateDomain), TotalItems: total };
  }

  public async ListPrintJobs(
    skip: number,
    take: number,
    filter: PrintJobListFilter = {},
  ): Promise<{ Items: PrintJobEntity[]; TotalItems: number }> {
    const where: FindOptionsWhere<PrintJobOrmEntity> = {};
    if (filter.TemplateId) where.TemplateId = filter.TemplateId;
    if (filter.BusinessObjectType) where.BusinessObjectType = filter.BusinessObjectType;
    if (filter.BusinessObjectId) where.BusinessObjectId = filter.BusinessObjectId;
    if (filter.Status) where.Status = filter.Status;
    const [items, total] = await this.printJobs.findAndCount({
      where,
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });
    return { Items: items.map(BarcodeLabelOrmMapper.ToPrintJobDomain), TotalItems: total };
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Barcode label unique constraint violated');
    }
  }
}
