import { NotFoundException } from '@common/Exceptions/AppException';
import { LocationProfileDto } from '@modules/MasterData/Application/DTOs/LocationProfileDto';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { LocationProfileDtoMapper } from '@modules/MasterData/Application/Mappers/LocationProfileDtoMapper';

export class GetLocationProfileUseCase {
  constructor(private readonly locationProfileRepository: ILocationProfileRepository) {}

  public async Execute(id: string): Promise<LocationProfileDto> {
    const profile = await this.locationProfileRepository.FindById(id);
    if (!profile) {
      throw new NotFoundException('Location profile not found');
    }

    return LocationProfileDtoMapper.ToDto(profile);
  }
}
