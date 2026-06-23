import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { StubAuditedTransaction } from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';
import { MasterDataOwnershipPolicyEntity } from '@modules/MasterData/Domain/Entities/MasterDataOwnershipPolicyEntity';
import { IMasterDataOwnershipPolicyRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataOwnershipPolicyRepository';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { GetSkuUseCase } from '@modules/MasterData/Application/UseCases/GetSkuUseCase';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { MakeSku } from '@test/Modules/MasterData/InventoryTestDoubles';

/**
 * C5 AC4: a sensitive cross-owner master-data read writes an Action=Read audit when the
 * ownership policy marks the group auditable. GetSku is the representative path.
 */
const ctx: AuditContext = {
  ActorUserId: 'u-reader',
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-r',
  RequestId: 'req-r',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

const ownership = (requiresAudit: boolean): MasterDataOwnershipPolicyService =>
  new MasterDataOwnershipPolicyService({
    List: jest.fn(),
    FindByObjectGroup: jest.fn(
      async () =>
        ({
          DirectEditAllowed: false,
          RequiresAudit: requiresAudit,
          RequiresReason: false,
          RequiresSourceSystem: false,
          RequiresReferenceId: false,
        }) as MasterDataOwnershipPolicyEntity,
    ),
  } as IMasterDataOwnershipPolicyRepository);

const skuRepo = (): ISkuRepository =>
  ({
    FindById: jest.fn(async () => MakeSku({ Id: 'sku-1', SkuCode: 'SKU-001', DefaultOwnerId: 'owner-9' })),
  }) as unknown as ISkuRepository;

describe('Sensitive-read audit (C5 AC4)', () => {
  it('GetSku writes an Action=Read audit when the policy is auditable', async () => {
    const stub = new StubAuditedTransaction();
    const useCase = new GetSkuUseCase(skuRepo(), ownership(true), stub as unknown as AuditedTransaction);

    const dto = await useCase.Execute('sku-1', ctx);

    expect(dto.Id).toBe('sku-1');
    expect(stub.Entries).toHaveLength(1);
    expect(stub.Entries[0]).toMatchObject({
      Action: ActionCode.Read,
      ObjectType: ObjectType.Sku,
      ObjectId: 'sku-1',
      ObjectCode: 'SKU-001',
      ActorUserId: 'u-reader',
      OwnerId: 'owner-9',
    });
  });

  it('GetSku does NOT audit when the policy marks the group non-auditable', async () => {
    const stub = new StubAuditedTransaction();
    const useCase = new GetSkuUseCase(skuRepo(), ownership(false), stub as unknown as AuditedTransaction);

    await useCase.Execute('sku-1', ctx);

    expect(stub.Entries).toHaveLength(0);
  });

  it('GetSku constructed bare (no policy) does not attempt audit', async () => {
    const useCase = new GetSkuUseCase(skuRepo());
    const dto = await useCase.Execute('sku-1');
    expect(dto.Id).toBe('sku-1');
  });
});
