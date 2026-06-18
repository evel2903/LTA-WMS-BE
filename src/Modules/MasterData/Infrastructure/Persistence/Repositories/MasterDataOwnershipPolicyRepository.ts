import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IMasterDataOwnershipPolicyRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataOwnershipPolicyRepository';
import { MasterDataOwnershipPolicyEntity } from '@modules/MasterData/Domain/Entities/MasterDataOwnershipPolicyEntity';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { MasterDataOwnershipPolicyOrmMapper } from '@modules/MasterData/Infrastructure/Mappers/MasterDataOwnershipPolicyOrmMapper';
import { MasterDataOwnershipPolicyOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/MasterDataOwnershipPolicyOrmEntity';

@Injectable()
export class MasterDataOwnershipPolicyRepository implements IMasterDataOwnershipPolicyRepository {
  constructor(
    @InjectRepository(MasterDataOwnershipPolicyOrmEntity)
    private readonly policies: Repository<MasterDataOwnershipPolicyOrmEntity>,
  ) {}

  public async List(): Promise<MasterDataOwnershipPolicyEntity[]> {
    const items = await this.policies.find({ order: { ObjectGroup: 'ASC' } });
    return items.map(MasterDataOwnershipPolicyOrmMapper.ToDomain);
  }

  public async FindByObjectGroup(objectGroup: MasterDataObjectGroup): Promise<MasterDataOwnershipPolicyEntity | null> {
    const entity = await this.policies.findOne({ where: { ObjectGroup: objectGroup } });
    return entity ? MasterDataOwnershipPolicyOrmMapper.ToDomain(entity) : null;
  }
}
