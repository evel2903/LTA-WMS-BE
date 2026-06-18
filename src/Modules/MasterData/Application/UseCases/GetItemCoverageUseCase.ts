import { NotFoundException } from '@common/Exceptions/AppException';
import { ItemCoverageDto } from '@modules/MasterData/Application/DTOs/ItemCoverageDto';
import { IItemCoverageRepository } from '@modules/MasterData/Application/Interfaces/IItemCoverageRepository';
import { ItemCoverageMapper } from '@modules/MasterData/Application/Mappers/ItemCoverageMapper';

export class GetItemCoverageUseCase {
  constructor(private readonly itemCoverages: IItemCoverageRepository) {}

  public async Execute(id: string): Promise<ItemCoverageDto> {
    const coverage = await this.itemCoverages.FindById(id);
    if (!coverage) {
      throw new NotFoundException('Item coverage not found');
    }
    return ItemCoverageMapper.ToDto(coverage);
  }
}
