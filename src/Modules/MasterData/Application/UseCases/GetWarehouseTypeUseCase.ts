import { NotFoundException } from '@common/Exceptions/AppException';
import { WarehouseTypeDto } from '@modules/MasterData/Application/DTOs/WarehouseTypeDto';
import { IWarehouseTypeRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseTypeRepository';
import { WarehouseTypeDtoMapper } from '@modules/MasterData/Application/Mappers/WarehouseTypeDtoMapper';

export class GetWarehouseTypeUseCase {
  constructor(private readonly warehouseTypes: IWarehouseTypeRepository) {}

  public async Execute(id: string): Promise<WarehouseTypeDto> {
    const warehouseType = await this.warehouseTypes.FindById(id);
    if (!warehouseType) {
      throw new NotFoundException('Warehouse type not found');
    }
    return WarehouseTypeDtoMapper.ToDto(warehouseType);
  }
}
