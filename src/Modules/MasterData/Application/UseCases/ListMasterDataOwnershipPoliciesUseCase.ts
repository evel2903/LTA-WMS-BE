import { MasterDataOwnershipPolicyDto } from '@modules/MasterData/Application/DTOs/MasterDataOwnershipPolicyDto';
import { IMasterDataOwnershipPolicyRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataOwnershipPolicyRepository';
import { MasterDataOwnershipPolicyMapper } from '@modules/MasterData/Application/Mappers/MasterDataOwnershipPolicyMapper';

export class ListMasterDataOwnershipPoliciesUseCase {
  constructor(private readonly policies: IMasterDataOwnershipPolicyRepository) {}

  public async Execute(): Promise<{ Items: MasterDataOwnershipPolicyDto[]; TotalItems: number }> {
    const items = await this.policies.List();
    return {
      Items: items.map(MasterDataOwnershipPolicyMapper.ToDto),
      TotalItems: items.length,
    };
  }
}
