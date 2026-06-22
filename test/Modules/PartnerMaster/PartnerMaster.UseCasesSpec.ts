import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { StubAuditedTransaction } from '@modules/AccessControl/Test/AccessControlTestDoubles';
import { CreatePartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/CreatePartnerUseCase';
import { DeactivatePartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/DeactivatePartnerUseCase';
import { ListPartnersUseCase } from '@modules/PartnerMaster/Application/UseCases/ListPartnersUseCase';
import { ResolvePartnerByReferenceUseCase } from '@modules/PartnerMaster/Application/UseCases/ResolvePartnerByReferenceUseCase';
import { UpdatePartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/UpdatePartnerUseCase';
import {
  IPartnerRepository,
  PartnerListFilter,
} from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerEntity } from '@modules/PartnerMaster/Domain/Entities/PartnerEntity';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';

class FakePartnerRepository implements IPartnerRepository {
  public FindById = jest.fn<Promise<PartnerEntity | null>, [string]>();
  public FindByCode = jest.fn<Promise<PartnerEntity | null>, [string]>();
  public FindByExternalReference = jest.fn<Promise<PartnerEntity | null>, [PartnerType, string, string]>();
  public Create = jest.fn<Promise<PartnerEntity>, [PartnerEntity]>();
  public Update = jest.fn<Promise<PartnerEntity>, [PartnerEntity]>();
  public List = jest.fn<
    Promise<{ Items: PartnerEntity[]; TotalItems: number }>,
    [number, number, PartnerListFilter?]
  >();
}

const ctx: AuditContext = {
  ActorUserId: 'u1',
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-1',
  RequestId: 'req-1',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

const partner = (overrides: Partial<ConstructorParameters<typeof PartnerEntity>[0]> = {}) =>
  new PartnerEntity({
    Id: 'partner-1',
    PartnerCode: 'SUP-A',
    PartnerName: 'Supplier A',
    PartnerType: PartnerType.Supplier,
    Status: PartnerStatus.Active,
    SourceSystem: 'ERP',
    ExternalReference: 'ERP-SUP-A',
    ReferenceText: 'PO supplier',
    CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    CreatedBy: null,
    UpdatedBy: null,
    ...overrides,
  });

describe('Partner master use cases', () => {
  it('creates Supplier/Customer/Carrier partner with external reference and writes audit', async () => {
    const partners = new FakePartnerRepository();
    const audit = new StubAuditedTransaction();
    partners.FindByCode.mockResolvedValue(null);
    partners.FindByExternalReference.mockResolvedValue(null);
    partners.Create.mockImplementation(async (entity) => entity);

    const created = await new CreatePartnerUseCase(partners, audit as unknown as AuditedTransaction).Execute(
      {
        PartnerCode: 'SUP-A',
        PartnerName: 'Supplier A',
        PartnerType: PartnerType.Supplier,
        SourceSystem: 'ERP',
        ExternalReference: 'ERP-SUP-A',
        ReferenceText: 'PO supplier',
      },
      ctx,
    );

    expect(partners.FindByExternalReference).toHaveBeenCalledWith(PartnerType.Supplier, 'ERP', 'ERP-SUP-A');
    expect(created.Status).toBe(PartnerStatus.Active);
    expect(audit.Entries[0]).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.Partner,
      ActorUserId: 'u1',
      ObjectCode: 'SUP-A',
    });
    expect(audit.Entries[0].AfterJson).toMatchObject({
      PartnerType: PartnerType.Supplier,
      ExternalReference: 'ERP-SUP-A',
    });
  });

  it('rejects duplicate partner code and duplicate type/source/reference', async () => {
    const partners = new FakePartnerRepository();
    partners.FindByCode.mockResolvedValueOnce(partner());

    await expect(
      new CreatePartnerUseCase(partners).Execute({
        PartnerCode: 'SUP-A',
        PartnerName: 'Supplier A',
        PartnerType: PartnerType.Supplier,
        SourceSystem: 'ERP',
        ExternalReference: 'ERP-SUP-A',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    partners.FindByCode.mockResolvedValueOnce(null);
    partners.FindByExternalReference.mockResolvedValueOnce(partner());

    await expect(
      new CreatePartnerUseCase(partners).Execute({
        PartnerCode: 'SUP-B',
        PartnerName: 'Supplier B',
        PartnerType: PartnerType.Supplier,
        SourceSystem: 'ERP',
        ExternalReference: 'ERP-SUP-A',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('resolves partner by type/source/external reference', async () => {
    const partners = new FakePartnerRepository();
    partners.FindByExternalReference.mockResolvedValue(partner());

    const resolved = await new ResolvePartnerByReferenceUseCase(partners).Execute({
      PartnerType: PartnerType.Supplier,
      SourceSystem: 'ERP',
      ExternalReference: 'ERP-SUP-A',
    });

    expect(resolved.PartnerCode).toBe('SUP-A');
  });

  it('lists partners with default PageSize 50 and max PageSize 100 clamp', async () => {
    const partners = new FakePartnerRepository();
    partners.List.mockResolvedValue({ Items: [partner()], TotalItems: 1 });
    const useCase = new ListPartnersUseCase(partners);

    const defaultResult = await useCase.Execute({});
    expect(defaultResult.Meta.PageSize).toBe(50);
    expect(partners.List).toHaveBeenLastCalledWith(0, 50, {});

    const clampedResult = await useCase.Execute({ Page: 1, PageSize: 500 });
    expect(clampedResult.Meta.PageSize).toBe(100);
    expect(partners.List).toHaveBeenLastCalledWith(0, 100, {});
  });

  it('validates update duplicates before mutating the loaded partner', async () => {
    const partners = new FakePartnerRepository();
    const existing = partner({ PartnerName: 'Before' });
    partners.FindById.mockResolvedValue(existing);
    partners.FindByCode.mockResolvedValue(null);
    partners.FindByExternalReference.mockResolvedValue(partner({ Id: 'partner-2', ExternalReference: 'ERP-SUP-B' }));

    await expect(
      new UpdatePartnerUseCase(partners).Execute({
        Id: 'partner-1',
        PartnerName: 'After',
        SourceSystem: 'ERP',
        ExternalReference: 'ERP-SUP-B',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(existing.PartnerName).toBe('Before');
    expect(partners.Update).not.toHaveBeenCalled();
  });

  it('deactivates with DeleteCancel audit and requires a reason code', async () => {
    const partners = new FakePartnerRepository();
    const audit = new StubAuditedTransaction();
    const reasonCatalog = {
      ValidateReason: jest.fn().mockResolvedValue({
        ReasonCodeId: 'reason-1',
        EvidenceRequired: false,
        ApprovalRequired: false,
      }),
    };
    partners.FindById.mockResolvedValue(partner());
    partners.Update.mockImplementation(async (entity) => entity);

    await expect(
      new DeactivatePartnerUseCase(partners).Execute({ Id: 'partner-1', ReasonCode: '' }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const deactivated = await new DeactivatePartnerUseCase(
      partners,
      audit as unknown as AuditedTransaction,
      reasonCatalog,
    ).Execute({ Id: 'partner-1', ReasonCode: 'RC-V1-CANCEL' }, ctx);

    expect(reasonCatalog.ValidateReason).toHaveBeenCalledWith({
      ReasonCode: 'RC-V1-CANCEL',
      Action: ActionCode.DeleteCancel,
      ObjectType: ObjectType.Partner,
    });
    expect(deactivated.Status).toBe(PartnerStatus.Inactive);
    expect(audit.Entries[0]).toMatchObject({
      Action: ActionCode.DeleteCancel,
      ObjectType: ObjectType.Partner,
      ReasonCodeId: 'reason-1',
    });
  });
});
