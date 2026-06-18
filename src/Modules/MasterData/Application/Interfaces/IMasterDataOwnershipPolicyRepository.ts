import { MasterDataOwnershipPolicyEntity } from '@modules/MasterData/Domain/Entities/MasterDataOwnershipPolicyEntity';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';

export const MASTER_DATA_OWNERSHIP_POLICY_REPOSITORY = Symbol('MASTER_DATA_OWNERSHIP_POLICY_REPOSITORY');

export interface IMasterDataOwnershipPolicyRepository {
  List(): Promise<MasterDataOwnershipPolicyEntity[]>;
  FindByObjectGroup(objectGroup: MasterDataObjectGroup): Promise<MasterDataOwnershipPolicyEntity | null>;
}
