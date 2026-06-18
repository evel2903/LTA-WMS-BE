import {
  Tier1MasterDataChecklistDto,
  Tier1MasterDataChecklistFixtureDto,
} from '@modules/MasterData/Application/DTOs/Tier1MasterDataChecklistDto';
import { IMasterDataOwnershipPolicyRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataOwnershipPolicyRepository';
import { Tier1MasterDataChecklistService } from '@modules/MasterData/Application/Services/Tier1MasterDataChecklistService';

export class VerifyTier1MasterDataChecklistUseCase {
  constructor(
    private readonly policies: IMasterDataOwnershipPolicyRepository,
    private readonly checklistService: Tier1MasterDataChecklistService,
  ) {}

  public async Execute(fixture: Tier1MasterDataChecklistFixtureDto): Promise<Tier1MasterDataChecklistDto> {
    const policies = await this.policies.List();
    return this.checklistService.Verify(policies, fixture);
  }
}
