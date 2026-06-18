import { InventoryDimensionDto } from '@modules/MasterData/Application/DTOs/InventoryDimensionDto';
import {
  IInventoryDimensionRepository,
  InventoryDimensionListFilter,
} from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import { InventoryDimensionMapper } from '@modules/MasterData/Application/Mappers/InventoryDimensionMapper';

export class ListInventoryDimensionsUseCase {
  constructor(private readonly inventoryDimensions: IInventoryDimensionRepository) {}

  public async Execute(
    skip = 0,
    take = 50,
    filter: InventoryDimensionListFilter = {},
  ): Promise<{ Items: InventoryDimensionDto[]; TotalItems: number }> {
    const result = await this.inventoryDimensions.List(skip, take, filter);
    return {
      Items: result.Items.map(InventoryDimensionMapper.ToDto),
      TotalItems: result.TotalItems,
    };
  }
}
