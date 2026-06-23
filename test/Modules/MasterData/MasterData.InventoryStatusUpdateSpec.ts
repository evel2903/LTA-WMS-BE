import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { StubAuditedTransaction } from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { IMasterDataOwnershipPolicyRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataOwnershipPolicyRepository';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import {
  IInventoryStatusRepository,
  InventoryStatusListFilter,
} from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import { UpdateInventoryStatusUseCase } from '@modules/MasterData/Application/UseCases/UpdateInventoryStatusUseCase';
import { ListInventoryStatusesUseCase } from '@modules/MasterData/Application/UseCases/ListInventoryStatusesUseCase';
import { InventoryStatusEntity } from '@modules/MasterData/Domain/Entities/InventoryStatusEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

const ctx: AuditContext = {
  ActorUserId: 'u1',
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-1',
  RequestId: 'req-1',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

const now = new Date();
const status = (overrides: Partial<InventoryStatusEntity> = {}): InventoryStatusEntity =>
  new InventoryStatusEntity({
    Id: 'is1',
    StatusCode: 'AVAILABLE',
    DisplayName: 'Available',
    StageGroup: 'Storage',
    AllowsAllocation: true,
    AllowsPick: true,
    Hold: false,
    IsTerminal: false,
    IsMilestone: false,
    SortOrder: 10,
    Status: MasterDataStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });

class InMemoryInventoryStatusRepository implements IInventoryStatusRepository {
  private readonly items = new Map<string, InventoryStatusEntity>();
  public seed(entity: InventoryStatusEntity): void {
    this.items.set(entity.Id, entity);
  }
  public async FindById(id: string): Promise<InventoryStatusEntity | null> {
    return this.items.get(id) ?? null;
  }
  public async FindByCode(code: string): Promise<InventoryStatusEntity | null> {
    return [...this.items.values()].find((s) => s.StatusCode === code) ?? null;
  }
  public async List(
    skip: number,
    take: number,
    filter: InventoryStatusListFilter = {},
  ): Promise<{ Items: InventoryStatusEntity[]; TotalItems: number }> {
    void filter;
    const all = [...this.items.values()];
    return { Items: all.slice(skip, skip + take), TotalItems: all.length };
  }
  public async Update(entity: InventoryStatusEntity): Promise<InventoryStatusEntity> {
    this.items.set(entity.Id, entity);
    return entity;
  }
}

const ownershipNoBlock = (): MasterDataOwnershipPolicyService =>
  new MasterDataOwnershipPolicyService({
    List: jest.fn(),
    FindByObjectGroup: jest.fn(async () => null),
  } as unknown as IMasterDataOwnershipPolicyRepository);

const ownershipReasonRequired = (): MasterDataOwnershipPolicyService =>
  new MasterDataOwnershipPolicyService({
    List: jest.fn(),
    FindByObjectGroup: jest.fn(async () => ({
      DirectEditAllowed: true,
      RequiresReason: true,
      RequiresSourceSystem: false,
      RequiresReferenceId: false,
      RequiresAudit: true,
    })),
  } as unknown as IMasterDataOwnershipPolicyRepository);

describe('UpdateInventoryStatusUseCase (C14)', () => {
  it('updates the Hold flag (and other flags) and writes a Update audit entry', async () => {
    const repo = new InMemoryInventoryStatusRepository();
    repo.seed(status({ Hold: false, AllowsAllocation: true }));
    const stub = new StubAuditedTransaction();
    const useCase = new UpdateInventoryStatusUseCase(repo, ownershipNoBlock(), stub as unknown as AuditedTransaction);

    const result = await useCase.Execute({ Id: 'is1', Hold: true, AllowsAllocation: false }, ctx);

    expect(result.Hold).toBe(true);
    expect(result.AllowsAllocation).toBe(false);
    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toEqual(
      expect.objectContaining({
        Action: ActionCode.Update,
        ObjectType: ObjectType.InventoryStatus,
        ObjectCode: 'AVAILABLE',
        ActorUserId: 'u1',
      }),
    );
    expect(stub.Entries[0].AfterJson).toEqual(expect.objectContaining({ Hold: true, AllowsAllocation: false }));
    expect(stub.Entries[0].BeforeJson).toEqual(expect.objectContaining({ Hold: false }));
  });

  it('resolves a valid reason code via the C3 catalog and stamps ReasonCodeId on the audit entry', async () => {
    const repo = new InMemoryInventoryStatusRepository();
    repo.seed(status());
    const stub = new StubAuditedTransaction();
    const reasonCatalog = {
      ValidateReason: jest.fn(async () => ({
        ReasonCodeId: 'rc-md-update-007',
        EvidenceRequired: false,
        ApprovalRequired: false,
      })),
    };
    const ownership = new MasterDataOwnershipPolicyService(
      {
        List: jest.fn(),
        FindByObjectGroup: jest.fn(async () => ({
          DirectEditAllowed: true,
          RequiresReason: true,
          RequiresSourceSystem: false,
          RequiresReferenceId: false,
          RequiresAudit: true,
        })),
      } as unknown as IMasterDataOwnershipPolicyRepository,
      reasonCatalog as unknown as IReasonCodeCatalog,
    );
    const useCase = new UpdateInventoryStatusUseCase(repo, ownership, stub as unknown as AuditedTransaction);

    await useCase.Execute({ Id: 'is1', Hold: true, ReasonCode: 'RC-MD-UPDATE' }, ctx);

    // Reason is validated against the catalog for exactly (Update, InventoryStatus)…
    expect(reasonCatalog.ValidateReason).toHaveBeenCalledWith({
      ReasonCode: 'RC-MD-UPDATE',
      Action: ActionCode.Update,
      ObjectType: ObjectType.InventoryStatus,
    });
    // …and its resolved id lands on the immutable audit entry (AC3 + A10 "ReasonCodeId resolved").
    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0].ReasonCodeId).toBe('rc-md-update-007');
  });

  it('rejects an update with no reason when the ownership policy requires one', async () => {
    const repo = new InMemoryInventoryStatusRepository();
    repo.seed(status());
    const useCase = new UpdateInventoryStatusUseCase(
      repo,
      ownershipReasonRequired(),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );

    await expect(useCase.Execute({ Id: 'is1', Hold: true }, ctx)).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('rejects updating an unknown id with NotFound', async () => {
    const repo = new InMemoryInventoryStatusRepository();
    const useCase = new UpdateInventoryStatusUseCase(
      repo,
      ownershipNoBlock(),
      new StubAuditedTransaction() as unknown as AuditedTransaction,
    );
    await expect(useCase.Execute({ Id: 'nope', Hold: true }, ctx)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ListInventoryStatusesUseCase (C14 standard envelope)', () => {
  it('returns the paginated {Items, Meta} envelope', async () => {
    const repo = new InMemoryInventoryStatusRepository();
    repo.seed(status({ Id: 'a', StatusCode: 'A' }));
    repo.seed(status({ Id: 'b', StatusCode: 'B' }));
    const result = await new ListInventoryStatusesUseCase(repo).Execute({ Page: 1, PageSize: 10 });
    expect(result.Items).toHaveLength(2);
    expect(result.Meta).toMatchObject({ Page: 1, PageSize: 10, TotalItems: 2, TotalPages: 1 });
  });
});
