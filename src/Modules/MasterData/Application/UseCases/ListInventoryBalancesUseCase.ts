import { InventoryBalanceDto } from '@modules/MasterData/Application/DTOs/InventoryBalanceDto';
import {
  IInventoryBalanceRepository,
  InventoryBalanceListFilter,
} from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import { InventoryBalanceMapper } from '@modules/MasterData/Application/Mappers/InventoryBalanceMapper';

export class ListInventoryBalancesUseCase {
  constructor(private readonly inventoryBalances: IInventoryBalanceRepository) {}

  public async Execute(
    skip = 0,
    take = 50,
    filter: InventoryBalanceListFilter = {},
  ): Promise<{ Items: InventoryBalanceDto[]; TotalItems: number }> {
    const result = await this.inventoryBalances.List(skip, take, filter);
    return {
      Items: result.Items.map(InventoryBalanceMapper.ToDto),
      TotalItems: result.TotalItems,
    };
  }
}
