import { InventoryStatusDto } from '@modules/MasterData/Application/DTOs/InventoryStatusDto';
import {
  IInventoryStatusRepository,
  InventoryStatusListFilter,
} from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import { InventoryStatusMapper } from '@modules/MasterData/Application/Mappers/InventoryStatusMapper';

export class ListInventoryStatusesUseCase {
  constructor(private readonly inventoryStatuses: IInventoryStatusRepository) {}

  public async Execute(
    skip = 0,
    take = 50,
    filter: InventoryStatusListFilter = {},
  ): Promise<{ Items: InventoryStatusDto[]; TotalItems: number }> {
    const result = await this.inventoryStatuses.List(skip, take, filter);
    return {
      Items: result.Items.map(InventoryStatusMapper.ToDto),
      TotalItems: result.TotalItems,
    };
  }
}
