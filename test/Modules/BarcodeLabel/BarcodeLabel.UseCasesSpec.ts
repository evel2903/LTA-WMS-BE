import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { CreateLabelTemplateUseCase } from '@modules/BarcodeLabel/Application/UseCases/CreateLabelTemplateUseCase';
import { CreateLabelTemplateVersionUseCase } from '@modules/BarcodeLabel/Application/UseCases/CreateLabelTemplateVersionUseCase';
import { ListLabelTemplatesUseCase } from '@modules/BarcodeLabel/Application/UseCases/ListLabelTemplatesUseCase';
import { ListPrintJobsUseCase } from '@modules/BarcodeLabel/Application/UseCases/ListPrintJobsUseCase';
import { PreviewPrintJobUseCase } from '@modules/BarcodeLabel/Application/UseCases/PreviewPrintJobUseCase';
import { ReprintPrintJobUseCase } from '@modules/BarcodeLabel/Application/UseCases/ReprintPrintJobUseCase';
import { IBarcodeLabelRepository } from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { LabelTemplateEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateEntity';
import { LabelTemplateVersionEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateVersionEntity';
import { PrintJobEntity } from '@modules/BarcodeLabel/Domain/Entities/PrintJobEntity';
import { ReprintRequestEntity } from '@modules/BarcodeLabel/Domain/Entities/ReprintRequestEntity';
import { PrintJobStatus } from '@modules/BarcodeLabel/Domain/Enums/PrintJobStatus';

class InMemoryBarcodeLabelRepository implements IBarcodeLabelRepository {
  public templates: LabelTemplateEntity[] = [];
  public versions: LabelTemplateVersionEntity[] = [];
  public printJobs: PrintJobEntity[] = [];
  public reprintRequests: ReprintRequestEntity[] = [];

  public async FindTemplateByCode(templateCode: string): Promise<LabelTemplateEntity | null> {
    return this.templates.find((item) => item.TemplateCode === templateCode) ?? null;
  }

  public async FindTemplateById(id: string): Promise<LabelTemplateEntity | null> {
    return this.templates.find((item) => item.Id === id) ?? null;
  }

  public async FindVersionById(id: string): Promise<LabelTemplateVersionEntity | null> {
    return this.versions.find((item) => item.Id === id) ?? null;
  }

  public async FindActiveVersion(templateId: string): Promise<LabelTemplateVersionEntity | null> {
    return this.versions.find((item) => item.TemplateId === templateId) ?? null;
  }

  public async CountTemplateVersions(templateId: string): Promise<number> {
    return this.versions.filter((item) => item.TemplateId === templateId).length;
  }

  public async FindPrintJobById(id: string): Promise<PrintJobEntity | null> {
    return this.printJobs.find((item) => item.Id === id) ?? null;
  }

  public async FindPrintJobByIdForUpdate(id: string): Promise<PrintJobEntity | null> {
    return this.FindPrintJobById(id);
  }

  public async CreateTemplate(template: LabelTemplateEntity): Promise<LabelTemplateEntity> {
    this.templates.push(template);
    return template;
  }

  public async CreateTemplateVersion(version: LabelTemplateVersionEntity): Promise<LabelTemplateVersionEntity> {
    this.versions.push(version);
    return version;
  }

  public async UpdateTemplate(template: LabelTemplateEntity): Promise<LabelTemplateEntity> {
    this.templates = this.templates.map((item) => (item.Id === template.Id ? template : item));
    return template;
  }

  public async CreatePrintJob(printJob: PrintJobEntity): Promise<PrintJobEntity> {
    this.printJobs.push(printJob);
    return printJob;
  }

  public async UpdatePrintJob(printJob: PrintJobEntity): Promise<PrintJobEntity> {
    this.printJobs = this.printJobs.map((item) => (item.Id === printJob.Id ? printJob : item));
    return printJob;
  }

  public async CreateReprintRequest(request: ReprintRequestEntity): Promise<ReprintRequestEntity> {
    this.reprintRequests.push(request);
    return request;
  }

  public async ListTemplates(): Promise<{ Items: LabelTemplateEntity[]; TotalItems: number }> {
    return { Items: this.templates, TotalItems: this.templates.length };
  }

  public async ListPrintJobs(): Promise<{ Items: PrintJobEntity[]; TotalItems: number }> {
    return { Items: this.printJobs, TotalItems: this.printJobs.length };
  }
}

class FakeAuditedTransaction {
  public entries: Array<{ Action: ActionCode; ObjectType: ObjectType; Result?: AuditResult }> = [];

  public async Run<T>(work: (manager: unknown) => Promise<{ result: T; entry: AuditEntry }>): Promise<T> {
    const { result, entry } = await work(undefined);
    this.entries.push(entry);
    return result;
  }
}

describe('BarcodeLabel use cases', () => {
  const context = { ...SystemAuditContext, ActorUserId: 'user-1', CorrelationId: 'corr-1' };

  it('creates a label template with an active version and audit evidence', async () => {
    const repo = new InMemoryBarcodeLabelRepository();
    const audited = new FakeAuditedTransaction();
    const useCase = new CreateLabelTemplateUseCase(repo, audited as unknown as AuditedTransaction);

    const created = await useCase.Execute(
      {
        TemplateCode: 'LPN-STD',
        TemplateName: 'LPN Standard',
        LabelType: 'LPN',
        RequiredFields: ['BarcodeValue', 'OwnerCode'],
        TemplateBody: 'LPN {{BarcodeValue}} {{OwnerCode}}',
      },
      context,
    );

    expect(created.TemplateCode).toBe('LPN-STD');
    expect(created.ActiveVersionId).toBeTruthy();
    expect(repo.versions).toHaveLength(1);
    expect(audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Action: ActionCode.Create, ObjectType: ObjectType.LabelTemplate }),
      ]),
    );
  });

  it('rejects duplicate label template code', async () => {
    const repo = new InMemoryBarcodeLabelRepository();
    const useCase = new CreateLabelTemplateUseCase(repo);

    await useCase.Execute({
      TemplateCode: 'PKG-STD',
      TemplateName: 'Package Standard',
      LabelType: 'Package',
      RequiredFields: ['BarcodeValue'],
      TemplateBody: '{{BarcodeValue}}',
    });

    await expect(
      useCase.Execute({
        TemplateCode: 'PKG-STD',
        TemplateName: 'Package Duplicate',
        LabelType: 'Package',
        RequiredFields: ['BarcodeValue'],
        TemplateBody: '{{BarcodeValue}}',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('adds a new template version without overwriting version history', async () => {
    const repo = new InMemoryBarcodeLabelRepository();
    const template = await new CreateLabelTemplateUseCase(repo).Execute({
      TemplateCode: 'LPN-STD',
      TemplateName: 'LPN Standard',
      LabelType: 'LPN',
      RequiredFields: ['BarcodeValue'],
      TemplateBody: 'LPN {{BarcodeValue}}',
    });

    const updated = await new CreateLabelTemplateVersionUseCase(repo).Execute(
      {
        TemplateId: template.Id,
        RequiredFields: ['BarcodeValue', 'OwnerCode'],
        TemplateBody: 'LPN {{BarcodeValue}} {{OwnerCode}}',
      },
      context,
    );

    expect(repo.versions).toHaveLength(2);
    expect(repo.versions.map((version) => version.VersionNo)).toEqual([1, 2]);
    expect(updated.ActiveVersionId).toBe(repo.versions[1]?.Id);
    expect(updated.RequiredFields).toEqual(['BarcodeValue', 'OwnerCode']);
  });

  it('creates a preview print job from complete payload', async () => {
    const repo = new InMemoryBarcodeLabelRepository();
    const templateUseCase = new CreateLabelTemplateUseCase(repo);
    const previewUseCase = new PreviewPrintJobUseCase(repo);
    const template = await templateUseCase.Execute({
      TemplateCode: 'LPN-STD',
      TemplateName: 'LPN Standard',
      LabelType: 'LPN',
      RequiredFields: ['BarcodeValue', 'OwnerCode'],
      TemplateBody: 'LPN {{BarcodeValue}} {{OwnerCode}}',
    });

    const preview = await previewUseCase.Execute(
      {
        TemplateId: template.Id,
        BusinessObjectType: 'LPN',
        BusinessObjectId: 'lpn-1',
        BusinessObjectCode: 'LPN0001',
        WarehouseId: 'wh-1',
        OwnerId: 'owner-1',
        PayloadJson: { BarcodeValue: 'SSCC-1', OwnerCode: 'OWN' },
      },
      context,
    );

    expect(preview.Status).toBe(PrintJobStatus.Previewed);
    expect(preview.TemplateVersionId).toBe(template.ActiveVersionId);
    expect(preview.PreviewContent).toContain('SSCC-1');
    expect(repo.printJobs).toHaveLength(1);
  });

  it('uses the active template version after version updates', async () => {
    const repo = new InMemoryBarcodeLabelRepository();
    const template = await new CreateLabelTemplateUseCase(repo).Execute({
      TemplateCode: 'LPN-STD',
      TemplateName: 'LPN Standard',
      LabelType: 'LPN',
      RequiredFields: ['BarcodeValue'],
      TemplateBody: 'OLD {{BarcodeValue}}',
    });
    const updated = await new CreateLabelTemplateVersionUseCase(repo).Execute({
      TemplateId: template.Id,
      RequiredFields: ['BarcodeValue', 'OwnerCode'],
      TemplateBody: 'NEW {{BarcodeValue}} {{OwnerCode}}',
    });

    const preview = await new PreviewPrintJobUseCase(repo).Execute({
      TemplateId: updated.Id,
      BusinessObjectType: 'LPN',
      BusinessObjectId: 'lpn-1',
      PayloadJson: { BarcodeValue: 'SSCC-1', OwnerCode: 'OWN' },
    });

    expect(preview.TemplateVersionId).toBe(updated.ActiveVersionId);
    expect(preview.PreviewContent).toBe('NEW SSCC-1 OWN');
  });

  it('rejects a template version id that belongs to another template', async () => {
    const repo = new InMemoryBarcodeLabelRepository();
    const templateA = await new CreateLabelTemplateUseCase(repo).Execute({
      TemplateCode: 'LPN-A',
      TemplateName: 'LPN A',
      LabelType: 'LPN',
      RequiredFields: ['BarcodeValue'],
      TemplateBody: 'A {{BarcodeValue}}',
    });
    const templateB = await new CreateLabelTemplateUseCase(repo).Execute({
      TemplateCode: 'LPN-B',
      TemplateName: 'LPN B',
      LabelType: 'LPN',
      RequiredFields: ['BarcodeValue'],
      TemplateBody: 'B {{BarcodeValue}}',
    });

    await expect(
      new PreviewPrintJobUseCase(repo).Execute({
        TemplateId: templateA.Id,
        TemplateVersionId: templateB.ActiveVersionId,
        BusinessObjectType: 'LPN',
        BusinessObjectId: 'lpn-1',
        PayloadJson: { BarcodeValue: 'SSCC-1' },
      }),
    ).rejects.toMatchObject({
      Details: { TemplateId: templateA.Id, TemplateVersionId: templateB.ActiveVersionId },
    });
  });

  it('fails preview early for missing required payload without success state', async () => {
    const repo = new InMemoryBarcodeLabelRepository();
    const template = await new CreateLabelTemplateUseCase(repo).Execute({
      TemplateCode: 'LPN-STD',
      TemplateName: 'LPN Standard',
      LabelType: 'LPN',
      RequiredFields: ['BarcodeValue', 'OwnerCode'],
      TemplateBody: 'LPN {{BarcodeValue}} {{OwnerCode}}',
    });

    await expect(
      new PreviewPrintJobUseCase(repo).Execute(
        {
          TemplateId: template.Id,
          BusinessObjectType: 'LPN',
          BusinessObjectId: 'lpn-1',
          PayloadJson: { BarcodeValue: 'SSCC-1' },
        },
        context,
      ),
    ).rejects.toMatchObject({ Details: { MissingFields: ['OwnerCode'] } });
    expect(repo.printJobs.some((job) => job.Status === PrintJobStatus.Previewed)).toBe(false);
  });

  it('blocks reprint without a reason code', async () => {
    const repo = new InMemoryBarcodeLabelRepository();

    await expect(
      new ReprintPrintJobUseCase(repo, {} as IReasonCodeCatalog).Execute(
        { PrintJobId: 'missing', ReasonNote: 'damaged label' },
        context,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('validates reason, increments reprint count and audits successful reprint', async () => {
    const repo = new InMemoryBarcodeLabelRepository();
    const audited = new FakeAuditedTransaction();
    const reasonCatalog: IReasonCodeCatalog = {
      ValidateReason: jest.fn(async () => ({
        ReasonCodeId: 'reason-1',
        EvidenceRequired: false,
        ApprovalRequired: false,
      })),
    };
    const template = await new CreateLabelTemplateUseCase(repo).Execute({
      TemplateCode: 'PKG-STD',
      TemplateName: 'Package Standard',
      LabelType: 'Package',
      RequiredFields: ['BarcodeValue'],
      TemplateBody: '{{BarcodeValue}}',
    });
    const job = await new PreviewPrintJobUseCase(repo).Execute(
      {
        TemplateId: template.Id,
        BusinessObjectType: 'Package',
        BusinessObjectId: 'pkg-1',
        BusinessObjectCode: 'PKG0001',
        PayloadJson: { BarcodeValue: 'PKG0001' },
      },
      context,
    );

    const reprinted = await new ReprintPrintJobUseCase(
      repo,
      reasonCatalog,
      audited as unknown as AuditedTransaction,
    ).Execute({ PrintJobId: job.Id, ReasonCode: 'RC-V1-REPRINT', ReasonNote: 'Label damaged' }, context);

    expect(reprinted.ReprintCount).toBe(1);
    expect(repo.reprintRequests).toHaveLength(1);
    expect(reasonCatalog.ValidateReason).toHaveBeenCalledWith({
      ReasonCode: 'RC-V1-REPRINT',
      Action: ActionCode.Reprint,
      ObjectType: ObjectType.PrintJob,
    });
    expect(audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Action: ActionCode.Reprint, ObjectType: ObjectType.PrintJob }),
      ]),
    );
  });

  it('returns not found for reprinting unknown print job after reason is present', async () => {
    await expect(
      new ReprintPrintJobUseCase(new InMemoryBarcodeLabelRepository(), {
        ValidateReason: jest.fn(async () => ({
          ReasonCodeId: 'reason-1',
          EvidenceRequired: false,
          ApprovalRequired: false,
        })),
      }).Execute({ PrintJobId: 'missing', ReasonCode: 'RC-V1-REPRINT' }, context),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('clamps list page sizes to max 100', async () => {
    const templateRepo = { ListTemplates: jest.fn(async () => ({ Items: [], TotalItems: 0 })) };
    await new ListLabelTemplatesUseCase(templateRepo as never).Execute({ Page: 1, PageSize: 500 });
    expect(templateRepo.ListTemplates).toHaveBeenCalledWith(0, 100, {});

    const printJobRepo = { ListPrintJobs: jest.fn(async () => ({ Items: [], TotalItems: 0 })) };
    await new ListPrintJobsUseCase(printJobRepo as never).Execute({ Page: 1, PageSize: 500 });
    expect(printJobRepo.ListPrintJobs).toHaveBeenCalledWith(0, 100, {});
  });
});
