import { NotFoundException } from '@common/Exceptions/AppException';
import { RuleGroupDto } from '@modules/WarehouseProfile/Application/DTOs/RuleGroupDto';
import { IRuleGroupRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleGroupRepository';
import { RuleGroupDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/RuleGroupDtoMapper';

export class GetRuleGroupUseCase {
  constructor(private readonly groupRepository: IRuleGroupRepository) {}

  public async Execute(id: string): Promise<RuleGroupDto> {
    const group = await this.groupRepository.FindById(id);
    if (!group) {
      throw new NotFoundException('Rule group not found');
    }
    return RuleGroupDtoMapper.ToDto(group);
  }
}
