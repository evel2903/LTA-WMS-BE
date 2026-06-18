import { NotFoundException } from '@common/Exceptions/AppException';
import { RuleDefinitionDto } from '@modules/WarehouseProfile/Application/DTOs/RuleDefinitionDto';
import { IRuleDefinitionRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleDefinitionRepository';
import { RuleDefinitionDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/RuleDefinitionDtoMapper';

export class GetRuleDefinitionUseCase {
  constructor(private readonly definitionRepository: IRuleDefinitionRepository) {}

  public async Execute(id: string): Promise<RuleDefinitionDto> {
    const definition = await this.definitionRepository.FindById(id);
    if (!definition) {
      throw new NotFoundException('Rule definition not found');
    }
    return RuleDefinitionDtoMapper.ToDto(definition);
  }
}
