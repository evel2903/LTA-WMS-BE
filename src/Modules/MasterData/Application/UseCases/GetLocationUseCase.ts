import { NotFoundException } from '@common/Exceptions/AppException';
import { LocationDto } from '@modules/MasterData/Application/DTOs/LocationDto';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { LocationDtoMapper } from '@modules/MasterData/Application/Mappers/LocationDtoMapper';

export class GetLocationUseCase {
  constructor(private readonly locationRepository: ILocationRepository) {}

  public async Execute(id: string): Promise<LocationDto> {
    const location = await this.locationRepository.FindById(id);
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return LocationDtoMapper.ToDto(location);
  }
}
