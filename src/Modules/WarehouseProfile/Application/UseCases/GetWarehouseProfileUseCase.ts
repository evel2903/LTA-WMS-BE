import { NotFoundException } from '@common/Exceptions/AppException';
import { WarehouseProfileDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileDto';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/WarehouseProfileDtoMapper';

export class GetWarehouseProfileUseCase {
  constructor(private readonly profileRepository: IWarehouseProfileRepository) {}

  public async Execute(id: string): Promise<WarehouseProfileDto> {
    const profile = await this.profileRepository.FindById(id);
    if (!profile) {
      throw new NotFoundException('Warehouse profile not found');
    }
    return WarehouseProfileDtoMapper.ToDto(profile);
  }
}
