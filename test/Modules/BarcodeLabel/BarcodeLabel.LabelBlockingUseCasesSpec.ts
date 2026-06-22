import { NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditEntry } from '@modules/AccessControl/Application/DTOs/AuditEntry';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IBarcodeLabelRepository } from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { ValidateLabelBlockingUseCase } from '@modules/BarcodeLabel/Application/UseCases/ValidateLabelBlockingUseCase';
import { LabelTemplateEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateEntity';
import { LabelTemplateVersionEntity } from '@modules/BarcodeLabel/Domain/Entities/LabelTemplateVersionEntity';
import { PrintJobEntity } from '@modules/BarcodeLabel/Domain/Entities/PrintJobEntity';
import { ReprintRequestEntity } from '@modules/BarcodeLabel/Domain/Entities/ReprintRequestEntity';
import { LabelBlockingDecision } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingDecision';
import { LabelBlockingDownstreamAction } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingDownstreamAction';
import { LabelTemplateStatus } from '@modules/BarcodeLabel/Domain/Enums/LabelTemplateStatus';
import { PrintJobStatus } from '@modules/BarcodeLabel/Domain/Enums/PrintJobStatus';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';

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

  public async FindLatestValidPrintJobForObject(input: {
    BusinessObjectType: string;
    BusinessObjectId: string;
    WarehouseId?: string | null;
    OwnerId?: string | null;
    LabelType?: string | null;
    ValidStatuses: PrintJobStatus[];
  }): Promise<PrintJobEntity | null> {
    return (
      this.printJobs
        .filter((job) => job.BusinessObjectType === input.BusinessObjectType)
        .filter((job) => job.BusinessObjectId === input.BusinessObjectId)
        .filter((job) => {
          if (input.WarehouseId === undefined) return true;
          return input.WarehouseId === null ? job.WarehouseId === null : job.WarehouseId === input.WarehouseId;
        })
        .filter((job) => {
          if (input.OwnerId === undefined) return true;
          return input.OwnerId === null ? job.OwnerId === null : job.OwnerId === input.OwnerId;
        })
        .filter((job) => input.ValidStatuses.includes(job.Status))
        .filter((job) => {
          if (!input.LabelType) return true;
          const template = this.templates.find((item) => item.Id === job.TemplateId);
          return template?.LabelType === input.LabelType;
        })
        .sort((left, right) => right.CreatedAt.getTime() - left.CreatedAt.getTime())[0] ?? null
    );
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

class InMemoryWarehouseProfileRepository implements Partial<IWarehouseProfileRepository> {
  public profiles: WarehouseProfileEntity[] = [];

  public async FindById(id: string): Promise<WarehouseProfileEntity | null> {
    return this.profiles.find((item) => item.Id === id) ?? null;
  }
}

class FakeAuditedTransaction {
  public entries: AuditEntry[] = [];

  public async Run<T>(work: () => Promise<{ result: T; entry: AuditEntry }>): Promise<T> {
    const { result, entry } = await work();
    this.entries.push(entry);
    return result;
  }
}

function profile(labelDevicePolicy: Record<string, unknown>): WarehouseProfileEntity {
  const now = new Date('2026-06-22T00:00:00.000Z');
  return new WarehouseProfileEntity({
    Id: 'profile-1',
    ProfileCode: 'WT-01',
    ProfileName: 'Standard warehouse',
    WarehouseTypeCode: 'WT-01',
    Version: 1,
    Status: WarehouseProfileStatus.Active,
    ScopeKey: 'warehouse:warehouse-a',
    EffectiveFrom: now,
    CreatedAt: now,
    UpdatedAt: now,
    LabelDevicePolicy: labelDevicePolicy,
  });
}

function addTemplate(repo: InMemoryBarcodeLabelRepository, labelType: string): LabelTemplateEntity {
  const now = new Date('2026-06-22T00:00:00.000Z');
  const template = new LabelTemplateEntity({
    Id: `template-${labelType}`,
    TemplateCode: `${labelType}-STD`,
    TemplateName: `${labelType} Standard`,
    LabelType: labelType,
    Status: LabelTemplateStatus.Active,
    RequiredFields: ['BarcodeValue'],
    TemplateBody: '{{BarcodeValue}}',
    ActiveVersionId: `version-${labelType}`,
    CreatedAt: now,
    UpdatedAt: now,
  });
  repo.templates.push(template);
  repo.versions.push(
    new LabelTemplateVersionEntity({
      Id: `version-${labelType}`,
      TemplateId: template.Id,
      VersionNo: 1,
      TemplateBody: '{{BarcodeValue}}',
      RequiredFields: ['BarcodeValue'],
      Status: LabelTemplateStatus.Active,
      CreatedAt: now,
      CreatedBy: null,
    }),
  );
  return template;
}

function addPrintJob(
  repo: InMemoryBarcodeLabelRepository,
  template: LabelTemplateEntity,
  overrides: Partial<PrintJobEntity> = {},
): PrintJobEntity {
  const now = new Date('2026-06-22T01:00:00.000Z');
  const job = new PrintJobEntity({
    Id: overrides.Id ?? 'print-job-1',
    JobCode: overrides.JobCode ?? 'PJ-1',
    TemplateId: template.Id,
    TemplateVersionId: template.ActiveVersionId ?? `version-${template.LabelType}`,
    BusinessObjectType: overrides.BusinessObjectType ?? 'LPN',
    BusinessObjectId: overrides.BusinessObjectId ?? 'lpn-1',
    BusinessObjectCode: overrides.BusinessObjectCode ?? 'LPN0001',
    WarehouseId: overrides.WarehouseId ?? 'warehouse-a',
    OwnerId: overrides.OwnerId ?? 'owner-a',
    PayloadJson: { BarcodeValue: 'SSCC-1' },
    PreviewContent: 'SSCC-1',
    Status: overrides.Status ?? PrintJobStatus.Previewed,
    RequestedAt: now,
    CompletedAt: now,
    CreatedAt: now,
    UpdatedAt: now,
  });
  repo.printJobs.push(job);
  return job;
}

function useCase(
  labels: InMemoryBarcodeLabelRepository,
  profiles: InMemoryWarehouseProfileRepository,
  reasonCatalog: IReasonCodeCatalog = {
    ValidateReason: jest.fn(async () => ({
      ReasonCodeId: 'reason-override',
      EvidenceRequired: true,
      ApprovalRequired: true,
    })),
  },
  audited = new FakeAuditedTransaction(),
  permissionChecker?: IPermissionChecker,
): ValidateLabelBlockingUseCase {
  return new ValidateLabelBlockingUseCase(
    labels,
    profiles as unknown as IWarehouseProfileRepository,
    reasonCatalog,
    audited as unknown as AuditedTransaction,
    permissionChecker,
  );
}

describe('Label blocking validation use case', () => {
  const context = { ...SystemAuditContext, ActorUserId: 'supervisor-1', CorrelationId: 'corr-1' };

  it('blocks putaway when WarehouseProfile requires an LPN label and no valid print job exists', async () => {
    const labels = new InMemoryBarcodeLabelRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    profiles.profiles.push(
      profile({
        labelBlockingRules: [
          {
            downstreamAction: 'putaway',
            businessObjectType: 'LPN',
            labelType: 'LPN',
            required: true,
            mode: 'hard',
            overrideAllowed: false,
          },
        ],
      }),
    );

    const result = await useCase(labels, profiles).Execute({
      DownstreamAction: LabelBlockingDownstreamAction.Putaway,
      BusinessObjectType: 'LPN',
      BusinessObjectId: 'lpn-1',
      WarehouseProfileId: 'profile-1',
      WarehouseId: 'warehouse-a',
      OwnerId: 'owner-a',
    });

    expect(result.Decision).toBe(LabelBlockingDecision.Blocked);
    expect(result.Allowed).toBe(false);
    expect(result.RequiredLabelType).toBe('LPN');
    expect(result.MatchedPrintJobId).toBeNull();
  });

  it('allows putaway when a valid previewed print job matches object and scope', async () => {
    const labels = new InMemoryBarcodeLabelRepository();
    const template = addTemplate(labels, 'LPN');
    addPrintJob(labels, template);
    const profiles = new InMemoryWarehouseProfileRepository();
    profiles.profiles.push(
      profile({
        labelBlockingRules: [
          {
            downstreamAction: 'putaway',
            businessObjectType: 'LPN',
            labelType: 'LPN',
            required: true,
            mode: 'hard',
            overrideAllowed: false,
          },
        ],
      }),
    );

    const result = await useCase(labels, profiles).Execute({
      DownstreamAction: LabelBlockingDownstreamAction.Putaway,
      BusinessObjectType: 'LPN',
      BusinessObjectId: 'lpn-1',
      WarehouseProfileId: 'profile-1',
      WarehouseId: 'warehouse-a',
      OwnerId: 'owner-a',
    });

    expect(result.Decision).toBe(LabelBlockingDecision.Allowed);
    expect(result.Allowed).toBe(true);
    expect(result.MatchedPrintJobCode).toBe('PJ-1');
  });

  it('uses the policy label type over request label type when matching evidence', async () => {
    const labels = new InMemoryBarcodeLabelRepository();
    const shippingTemplate = addTemplate(labels, 'Shipping');
    addPrintJob(labels, shippingTemplate);
    const profiles = new InMemoryWarehouseProfileRepository();
    profiles.profiles.push(
      profile({
        labelBlockingRules: [
          {
            downstreamAction: 'putaway',
            businessObjectType: 'LPN',
            labelType: 'LPN',
            required: true,
            mode: 'hard',
            overrideAllowed: false,
          },
        ],
      }),
    );

    const result = await useCase(labels, profiles).Execute({
      DownstreamAction: LabelBlockingDownstreamAction.Putaway,
      BusinessObjectType: 'LPN',
      BusinessObjectId: 'lpn-1',
      WarehouseProfileId: 'profile-1',
      WarehouseId: 'warehouse-a',
      OwnerId: 'owner-a',
      LabelType: 'Shipping',
    });

    expect(result.Decision).toBe(LabelBlockingDecision.Blocked);
    expect(result.RequiredLabelType).toBe('LPN');
    expect(result.MatchedPrintJobId).toBeNull();
  });

  it('does not wildcard-match scoped print jobs when validation omits warehouse or owner scope', async () => {
    const labels = new InMemoryBarcodeLabelRepository();
    const template = addTemplate(labels, 'LPN');
    addPrintJob(labels, template);
    const profiles = new InMemoryWarehouseProfileRepository();
    profiles.profiles.push(
      profile({
        labelBlockingRules: [
          {
            downstreamAction: 'putaway',
            businessObjectType: 'LPN',
            labelType: 'LPN',
            required: true,
            mode: 'hard',
            overrideAllowed: false,
          },
        ],
      }),
    );

    const result = await useCase(labels, profiles).Execute({
      DownstreamAction: LabelBlockingDownstreamAction.Putaway,
      BusinessObjectType: 'LPN',
      BusinessObjectId: 'lpn-1',
      WarehouseProfileId: 'profile-1',
    });

    expect(result.Decision).toBe(LabelBlockingDecision.Blocked);
    expect(result.MatchedPrintJobId).toBeNull();
  });

  it('blocks package ready-for-staging when required shipping label is missing', async () => {
    const labels = new InMemoryBarcodeLabelRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    profiles.profiles.push(
      profile({
        labelBlockingRules: [
          {
            downstreamAction: 'ready_for_staging',
            businessObjectType: 'Package',
            labelType: 'Shipping',
            required: true,
            mode: 'hard',
            overrideAllowed: false,
          },
        ],
      }),
    );

    const result = await useCase(labels, profiles).Execute({
      DownstreamAction: LabelBlockingDownstreamAction.ReadyForStaging,
      BusinessObjectType: 'Package',
      BusinessObjectId: 'pkg-1',
      WarehouseProfileId: 'profile-1',
      WarehouseId: 'warehouse-a',
      OwnerId: 'owner-a',
    });

    expect(result.Decision).toBe(LabelBlockingDecision.Blocked);
    expect(result.ValidationDetails).toMatchObject({ BusinessObjectType: 'Package' });
  });

  it('blocks loading when required package label evidence is missing', async () => {
    const labels = new InMemoryBarcodeLabelRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    profiles.profiles.push(
      profile({
        labelBlockingRules: [
          {
            downstreamAction: 'loading',
            businessObjectType: 'Package',
            labelType: 'Shipping',
            required: true,
            mode: 'hard',
            overrideAllowed: false,
          },
        ],
      }),
    );

    const result = await useCase(labels, profiles).Execute({
      DownstreamAction: LabelBlockingDownstreamAction.Loading,
      BusinessObjectType: 'Package',
      BusinessObjectId: 'pkg-1',
      WarehouseProfileId: 'profile-1',
      WarehouseId: 'warehouse-a',
      OwnerId: 'owner-a',
    });

    expect(result.Decision).toBe(LabelBlockingDecision.Blocked);
    expect(result.Allowed).toBe(false);
  });

  it('denies override on hard-block rules', async () => {
    const labels = new InMemoryBarcodeLabelRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    profiles.profiles.push(
      profile({
        labelBlockingRules: [
          {
            downstreamAction: 'putaway',
            businessObjectType: 'LPN',
            labelType: 'LPN',
            required: true,
            mode: 'hard',
            overrideAllowed: false,
          },
        ],
      }),
    );

    const result = await useCase(labels, profiles).Execute(
      {
        DownstreamAction: LabelBlockingDownstreamAction.Putaway,
        BusinessObjectType: 'LPN',
        BusinessObjectId: 'lpn-1',
        WarehouseProfileId: 'profile-1',
        AttemptOverride: true,
        ReasonCode: 'RC-V1-OVERRIDE',
      },
      context,
    );

    expect(result.Decision).toBe(LabelBlockingDecision.Blocked);
    expect(result.OverrideAccepted).toBe(false);
    expect(result.Reason).toContain('not overrideable');
  });

  it('requires reason and audits soft-block override acceptance', async () => {
    const labels = new InMemoryBarcodeLabelRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    profiles.profiles.push(
      profile({
        labelBlockingRules: [
          {
            downstreamAction: 'ready_for_staging',
            businessObjectType: 'Package',
            labelType: 'Shipping',
            required: true,
            mode: 'soft',
            overrideAllowed: true,
          },
        ],
      }),
    );
    const audited = new FakeAuditedTransaction();
    const reasonCatalog: IReasonCodeCatalog = {
      ValidateReason: jest.fn(async () => ({
        ReasonCodeId: 'reason-override',
        EvidenceRequired: true,
        ApprovalRequired: true,
      })),
    };
    const permissionChecker: IPermissionChecker = {
      Check: jest.fn(async () => ({ Allowed: true })),
    };

    await expect(
      useCase(labels, profiles, reasonCatalog, audited).Execute({
        DownstreamAction: LabelBlockingDownstreamAction.ReadyForStaging,
        BusinessObjectType: 'Package',
        BusinessObjectId: 'pkg-1',
        WarehouseProfileId: 'profile-1',
        AttemptOverride: true,
      }),
    ).rejects.toMatchObject({ Details: { ReasonCode: 'required' } });
    expect(audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Action: ActionCode.Override,
          ObjectType: ObjectType.Package,
          Result: AuditResult.Failed,
        }),
      ]),
    );

    const result = await useCase(labels, profiles, reasonCatalog, audited, permissionChecker).Execute(
      {
        DownstreamAction: LabelBlockingDownstreamAction.ReadyForStaging,
        BusinessObjectType: 'Package',
        BusinessObjectId: 'pkg-1',
        WarehouseProfileId: 'profile-1',
        AttemptOverride: true,
        ReasonCode: 'RC-V1-OVERRIDE',
        ReasonNote: 'Temporary approved flow',
        EvidenceRefs: [{ ref: 'label-block://supervisor-evidence' }],
      },
      context,
    );

    expect(result.Decision).toBe(LabelBlockingDecision.OverrideAccepted);
    expect(result.Allowed).toBe(true);
    expect(reasonCatalog.ValidateReason).toHaveBeenCalledWith({
      ReasonCode: 'RC-V1-OVERRIDE',
      Action: ActionCode.Override,
      ObjectType: ObjectType.Package,
    });
    expect(audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Action: ActionCode.Override,
          ObjectType: ObjectType.Package,
          Result: AuditResult.Success,
          EvidenceRefs: [{ ref: 'label-block://supervisor-evidence' }],
        }),
      ]),
    );
    expect(permissionChecker.Check).toHaveBeenCalledWith({
      UserId: 'supervisor-1',
      Action: ActionCode.Override,
      ObjectType: ObjectType.Package,
      Scope: { WarehouseId: undefined, OwnerId: undefined },
    });
  });

  it('checks override permission against the downstream owner object before accepting soft override', async () => {
    const labels = new InMemoryBarcodeLabelRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    profiles.profiles.push(
      profile({
        labelBlockingRules: [
          {
            downstreamAction: 'loading',
            businessObjectType: 'Package',
            labelType: 'Shipping',
            required: true,
            mode: 'soft',
            overrideAllowed: true,
          },
        ],
      }),
    );
    const reasonCatalog: IReasonCodeCatalog = {
      ValidateReason: jest.fn(async () => ({
        ReasonCodeId: 'reason-override',
        EvidenceRequired: true,
        ApprovalRequired: true,
      })),
    };
    const deniedPermission: IPermissionChecker = {
      Check: jest.fn(async () => ({ Allowed: false, Reason: 'PERMISSION_DENIED' as const })),
    };

    await expect(
      useCase(labels, profiles, reasonCatalog, new FakeAuditedTransaction(), deniedPermission).Execute(
        {
          DownstreamAction: LabelBlockingDownstreamAction.Loading,
          BusinessObjectType: 'Package',
          BusinessObjectId: 'pkg-1',
          WarehouseProfileId: 'profile-1',
          WarehouseId: 'warehouse-a',
          OwnerId: 'owner-a',
          AttemptOverride: true,
          ReasonCode: 'RC-V1-OVERRIDE',
        },
        context,
      ),
    ).rejects.toMatchObject({ StatusCode: 403 });

    expect(deniedPermission.Check).toHaveBeenCalledWith({
      UserId: 'supervisor-1',
      Action: ActionCode.Override,
      ObjectType: ObjectType.Load,
      Scope: { WarehouseId: 'warehouse-a', OwnerId: 'owner-a' },
    });
  });

  it('rejects soft override when permission checker or actor context is unavailable', async () => {
    const labels = new InMemoryBarcodeLabelRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    profiles.profiles.push(
      profile({
        labelBlockingRules: [
          {
            downstreamAction: 'ready_for_staging',
            businessObjectType: 'Package',
            labelType: 'Shipping',
            required: true,
            mode: 'soft',
            overrideAllowed: true,
          },
        ],
      }),
    );

    await expect(
      useCase(labels, profiles).Execute(
        {
          DownstreamAction: LabelBlockingDownstreamAction.ReadyForStaging,
          BusinessObjectType: 'Package',
          BusinessObjectId: 'pkg-1',
          WarehouseProfileId: 'profile-1',
          AttemptOverride: true,
          ReasonCode: 'RC-V1-OVERRIDE',
        },
        context,
      ),
    ).rejects.toMatchObject({ StatusCode: 403 });
  });

  it('audits invalid soft override reason before rejecting the attempt', async () => {
    const labels = new InMemoryBarcodeLabelRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    profiles.profiles.push(
      profile({
        labelBlockingRules: [
          {
            downstreamAction: 'ready_for_staging',
            businessObjectType: 'Package',
            labelType: 'Shipping',
            required: true,
            mode: 'soft',
            overrideAllowed: true,
          },
        ],
      }),
    );
    const audited = new FakeAuditedTransaction();
    const reasonCatalog: IReasonCodeCatalog = {
      ValidateReason: jest.fn(async () => {
        throw new NotFoundException('Reason not found');
      }),
    };
    const permissionChecker: IPermissionChecker = {
      Check: jest.fn(async () => ({ Allowed: true })),
    };

    await expect(
      useCase(labels, profiles, reasonCatalog, audited, permissionChecker).Execute(
        {
          DownstreamAction: LabelBlockingDownstreamAction.ReadyForStaging,
          BusinessObjectType: 'Package',
          BusinessObjectId: 'pkg-1',
          WarehouseProfileId: 'profile-1',
          AttemptOverride: true,
          ReasonCode: 'RC-INVALID',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(audited.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Action: ActionCode.Override,
          ObjectType: ObjectType.Package,
          Result: AuditResult.Failed,
        }),
      ]),
    );
  });

  it('rejects validation when WarehouseProfile scope does not match the request scope', async () => {
    const labels = new InMemoryBarcodeLabelRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    const scoped = profile({ labelBlockingRules: [] });
    scoped.WarehouseId = 'warehouse-b';
    scoped.OwnerId = 'owner-b';
    profiles.profiles.push(scoped);

    await expect(
      useCase(labels, profiles).Execute({
        DownstreamAction: LabelBlockingDownstreamAction.Putaway,
        BusinessObjectType: 'LPN',
        BusinessObjectId: 'lpn-1',
        WarehouseProfileId: 'profile-1',
        WarehouseId: 'warehouse-a',
        OwnerId: 'owner-b',
      }),
    ).rejects.toMatchObject({ StatusCode: 403 });

    await expect(
      useCase(labels, profiles).Execute({
        DownstreamAction: LabelBlockingDownstreamAction.Putaway,
        BusinessObjectType: 'LPN',
        BusinessObjectId: 'lpn-1',
        WarehouseProfileId: 'profile-1',
      }),
    ).rejects.toMatchObject({ StatusCode: 403 });
  });

  it('allows when no label blocking rule matches and rejects unknown profile', async () => {
    const labels = new InMemoryBarcodeLabelRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    profiles.profiles.push(profile({ labelBlockingRules: [] }));

    await expect(
      useCase(labels, profiles).Execute({
        DownstreamAction: LabelBlockingDownstreamAction.Putaway,
        BusinessObjectType: 'LPN',
        BusinessObjectId: 'lpn-1',
        WarehouseProfileId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const result = await useCase(labels, profiles).Execute({
      DownstreamAction: LabelBlockingDownstreamAction.Putaway,
      BusinessObjectType: 'LPN',
      BusinessObjectId: 'lpn-1',
      WarehouseProfileId: 'profile-1',
    });

    expect(result.Decision).toBe(LabelBlockingDecision.NotRequired);
    expect(result.Allowed).toBe(true);
  });
});
