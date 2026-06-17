import { LocationTreeDto } from '@modules/MasterData/Application/DTOs/LocationTreeDto';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { LocationDtoMapper } from '@modules/MasterData/Application/Mappers/LocationDtoMapper';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';

export class GetLocationTreeUseCase {
  constructor(private readonly locationRepository: ILocationRepository) {}

  public async Execute(query: { WarehouseId: string; ZoneId?: string }): Promise<LocationTreeDto[]> {
    const locations = await this.locationRepository.ListForTree(query.WarehouseId, query.ZoneId);
    const byId = new Map<string, LocationEntity>();
    const childIds = new Set<string>();

    for (const location of locations) {
      byId.set(location.Id, location);
    }

    const buildNode = (location: LocationEntity): LocationTreeDto => {
      const children = locations
        .filter((candidate) => candidate.ParentLocationId === location.Id)
        .map((child) => {
          childIds.add(child.Id);
          return buildNode(child);
        });
      return LocationDtoMapper.ToTreeDto(location, children);
    };

    return locations
      .filter((location) => !location.ParentLocationId || !byId.has(location.ParentLocationId))
      .filter((location) => !childIds.has(location.Id))
      .map(buildNode);
  }
}
