import { NotFoundException } from '@common/Exceptions/AppException';
import { PackDefinitionDto } from '@modules/MasterData/Application/DTOs/PackDefinitionDto';
import { IPackDefinitionRepository } from '@modules/MasterData/Application/Interfaces/IPackDefinitionRepository';
import { PackDefinitionMapper } from '@modules/MasterData/Application/Mappers/PackDefinitionMapper';

export class GetPackDefinitionUseCase {
  constructor(private readonly packDefinitions: IPackDefinitionRepository) {}

  public async Execute(id: string): Promise<PackDefinitionDto> {
    const pack = await this.packDefinitions.FindById(id);
    if (!pack) {
      throw new NotFoundException('Pack definition not found');
    }
    return PackDefinitionMapper.ToDto(pack);
  }
}
