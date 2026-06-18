import { NotFoundException } from '@common/Exceptions/AppException';
import { InventoryDimensionDto } from '@modules/MasterData/Application/DTOs/InventoryDimensionDto';
import { IInventoryDimensionRepository } from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import { InventoryDimensionMapper } from '@modules/MasterData/Application/Mappers/InventoryDimensionMapper';

export class GetInventoryDimensionUseCase {
  constructor(private readonly inventoryDimensions: IInventoryDimensionRepository) {}

  public async Execute(id: string): Promise<InventoryDimensionDto> {
    const dimension = await this.inventoryDimensions.FindById(id);
    if (!dimension) {
      throw new NotFoundException('Inventory dimension not found');
    }
    return InventoryDimensionMapper.ToDto(dimension);
  }
}
