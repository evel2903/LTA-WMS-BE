import { NotFoundException } from '@common/Exceptions/AppException';
import { InventoryBalanceDto } from '@modules/MasterData/Application/DTOs/InventoryBalanceDto';
import { IInventoryBalanceRepository } from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import { InventoryBalanceMapper } from '@modules/MasterData/Application/Mappers/InventoryBalanceMapper';

export class GetInventoryBalanceUseCase {
  constructor(private readonly inventoryBalances: IInventoryBalanceRepository) {}

  public async Execute(id: string): Promise<InventoryBalanceDto> {
    const balance = await this.inventoryBalances.FindById(id);
    if (!balance) {
      throw new NotFoundException('Inventory balance not found');
    }
    return InventoryBalanceMapper.ToDto(balance);
  }
}
