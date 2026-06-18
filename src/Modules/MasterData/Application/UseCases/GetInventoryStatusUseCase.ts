import { NotFoundException } from '@common/Exceptions/AppException';
import { InventoryStatusDto } from '@modules/MasterData/Application/DTOs/InventoryStatusDto';
import { IInventoryStatusRepository } from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import { InventoryStatusMapper } from '@modules/MasterData/Application/Mappers/InventoryStatusMapper';

export class GetInventoryStatusUseCase {
  constructor(private readonly inventoryStatuses: IInventoryStatusRepository) {}

  public async Execute(id: string): Promise<InventoryStatusDto> {
    const status = await this.inventoryStatuses.FindById(id);
    if (!status) {
      throw new NotFoundException('Inventory status not found');
    }
    return InventoryStatusMapper.ToDto(status);
  }
}
