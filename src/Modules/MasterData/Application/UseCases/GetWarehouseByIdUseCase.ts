import { NotFoundException } from '@common/Exceptions/AppException';
import { WarehouseDto } from '@modules/MasterData/Application/DTOs/WarehouseDto';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { WarehouseDtoMapper } from '@modules/MasterData/Application/Mappers/WarehouseDtoMapper';

export class GetWarehouseByIdUseCase {
  constructor(private readonly warehouseRepository: IWarehouseRepository) {}

  public async Execute(id: string): Promise<WarehouseDto> {
    const warehouse = await this.warehouseRepository.FindById(id);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return WarehouseDtoMapper.ToDto(warehouse);
  }
}
