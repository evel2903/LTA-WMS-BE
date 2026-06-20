import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { MasterDataOwnershipPolicyEntity } from '@modules/MasterData/Domain/Entities/MasterDataOwnershipPolicyEntity';
import { IMasterDataOwnershipPolicyRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataOwnershipPolicyRepository';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { CreateSkuUseCase } from '@modules/MasterData/Application/UseCases/CreateSkuUseCase';
import { UpdateSkuUseCase } from '@modules/MasterData/Application/UseCases/UpdateSkuUseCase';
import { CreateOwnerUseCase } from '@modules/MasterData/Application/UseCases/CreateOwnerUseCase';
import { UpdateOwnerUseCase } from '@modules/MasterData/Application/UseCases/UpdateOwnerUseCase';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { CreateSkuDto } from '@modules/MasterData/Application/DTOs/CreateSkuDto';
import { UpdateSkuDto } from '@modules/MasterData/Application/DTOs/UpdateSkuDto';
import { CreateOwnerDto } from '@modules/MasterData/Application/DTOs/CreateOwnerDto';
import { UpdateOwnerDto } from '@modules/MasterData/Application/DTOs/UpdateOwnerDto';

/**
 * C5 AC3: external source-of-truth groups (A6 DirectEditAllowed=false — seed: Sku,
 * OwnerCustomerSupplier, LpnSscc) MUST hard-block direct create/update at the use-case
 * surface. The module always wires the ownership policy, so production rejects these with
 * ForbiddenAppException(SOURCE_OF_TRUTH_READONLY) before any persistence runs. This proves
 * the block fires; the unit/e2e specs elsewhere construct the use cases bare (no policy),
 * which is why they exercise the happy path without tripping the block.
 */
const readOnlyPolicy = (): MasterDataOwnershipPolicyEntity =>
  ({
    DirectEditAllowed: false,
    RequiresAudit: true,
    RequiresReason: true,
    RequiresSourceSystem: true,
    RequiresReferenceId: true,
  }) as MasterDataOwnershipPolicyEntity;

const blockingOwnership = (): MasterDataOwnershipPolicyService =>
  new MasterDataOwnershipPolicyService({
    List: jest.fn(),
    FindByObjectGroup: jest.fn(async () => readOnlyPolicy()),
  } as IMasterDataOwnershipPolicyRepository);

// The repositories are never reached — Enforce throws first — so bare stubs suffice.
const skuRepo = {} as ISkuRepository;
const ownerRepo = {} as IOwnerRepository;
const uomRepo = {} as IUomRepository;

const expectBlocked = (run: Promise<unknown>) =>
  Promise.all([
    expect(run).rejects.toBeInstanceOf(ForbiddenAppException),
    expect(run).rejects.toMatchObject({ Details: { Reason: 'SOURCE_OF_TRUTH_READONLY' } }),
  ]);

describe('A6 hard-block: external source-of-truth groups reject direct edit (C5 AC3)', () => {
  it('blocks CreateSku', async () => {
    const useCase = new CreateSkuUseCase(skuRepo, ownerRepo, uomRepo, blockingOwnership());
    await expectBlocked(useCase.Execute({} as CreateSkuDto));
  });

  it('blocks UpdateSku', async () => {
    const useCase = new UpdateSkuUseCase(skuRepo, ownerRepo, uomRepo, blockingOwnership());
    await expectBlocked(useCase.Execute({ Id: 'sku-1' } as UpdateSkuDto));
  });

  it('blocks CreateOwner', async () => {
    const useCase = new CreateOwnerUseCase(ownerRepo, blockingOwnership());
    await expectBlocked(useCase.Execute({} as CreateOwnerDto));
  });

  it('blocks UpdateOwner', async () => {
    const useCase = new UpdateOwnerUseCase(ownerRepo, blockingOwnership());
    await expectBlocked(useCase.Execute({ Id: 'owner-1' } as UpdateOwnerDto));
  });
});
