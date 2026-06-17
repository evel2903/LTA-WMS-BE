import { NotFoundException } from '@common/Exceptions/AppException';
import { ZoneDto } from '@modules/MasterData/Application/DTOs/ZoneDto';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { ZoneDtoMapper } from '@modules/MasterData/Application/Mappers/ZoneDtoMapper';

export class GetZoneByIdUseCase {
  constructor(private readonly zoneRepository: IZoneRepository) {}

  public async Execute(id: string): Promise<ZoneDto> {
    const zone = await this.zoneRepository.FindById(id);
    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    return ZoneDtoMapper.ToDto(zone);
  }
}
