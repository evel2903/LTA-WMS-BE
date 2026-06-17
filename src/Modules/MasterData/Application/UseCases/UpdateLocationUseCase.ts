import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { UpdateLocationDto } from '@modules/MasterData/Application/DTOs/UpdateLocationDto';
import { LocationDto } from '@modules/MasterData/Application/DTOs/LocationDto';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { LocationDtoMapper } from '@modules/MasterData/Application/Mappers/LocationDtoMapper';
import { LocationPolicyValidator } from '@modules/MasterData/Application/Services/LocationPolicyValidator';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateLocationUseCase {
  constructor(
    private readonly locationRepository: ILocationRepository,
    private readonly locationProfileRepository: ILocationProfileRepository,
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly zoneRepository: IZoneRepository,
  ) {}

  public async Execute(request: UpdateLocationDto): Promise<LocationDto> {
    const location = await this.locationRepository.FindById(request.Id);
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const targetWarehouseId = request.WarehouseId ?? location.WarehouseId;
    const targetZoneId = request.ZoneId ?? location.ZoneId;
    const targetProfileId = request.LocationProfileId ?? location.LocationProfileId;
    const targetLocationCode = request.LocationCode ?? location.LocationCode;
    const targetParentLocationId =
      request.ParentLocationId !== undefined ? request.ParentLocationId : location.ParentLocationId;

    const warehouse = await this.warehouseRepository.FindById(targetWarehouseId);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    if (warehouse.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Warehouse must be active');
    }

    const zone = await this.zoneRepository.FindById(targetZoneId);
    if (!zone) {
      throw new NotFoundException('Zone not found');
    }
    if (zone.WarehouseId !== targetWarehouseId) {
      throw new BusinessRuleException('Zone must belong to location warehouse');
    }
    if (zone.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Zone must be active');
    }

    if (targetWarehouseId !== location.WarehouseId || targetLocationCode !== location.LocationCode) {
      const duplicate = await this.locationRepository.FindByWarehouseAndCode(targetWarehouseId, targetLocationCode);
      if (duplicate && duplicate.Id !== location.Id) {
        throw new ConflictException('Location code already exists in warehouse');
      }
    }

    if (
      request.ParentLocationId !== undefined ||
      targetWarehouseId !== location.WarehouseId ||
      targetZoneId !== location.ZoneId
    ) {
      await this.ValidateParent(request.Id, targetParentLocationId, targetWarehouseId, targetZoneId);
    }

    const profile = await this.locationProfileRepository.FindById(targetProfileId);
    if (!profile) {
      throw new NotFoundException('Location profile not found');
    }

    location.WarehouseId = targetWarehouseId;
    location.ZoneId = targetZoneId;
    location.ParentLocationId = targetParentLocationId;
    location.LocationCode = targetLocationCode;
    location.LocationName = request.LocationName ?? location.LocationName;
    location.LocationType = request.LocationType ?? location.LocationType;
    location.LocationProfileId = targetProfileId;
    location.LocationStatus = request.LocationStatus ?? location.LocationStatus;
    location.CapacityQty = request.CapacityQty !== undefined ? request.CapacityQty : location.CapacityQty;
    location.CapacityVolume = request.CapacityVolume !== undefined ? request.CapacityVolume : location.CapacityVolume;
    location.CapacityWeight = request.CapacityWeight !== undefined ? request.CapacityWeight : location.CapacityWeight;
    location.PalletSlot = request.PalletSlot !== undefined ? request.PalletSlot : location.PalletSlot;
    location.TemperatureClass =
      request.TemperatureClass !== undefined ? request.TemperatureClass : location.TemperatureClass;
    location.DgCompatibilityGroup =
      request.DgCompatibilityGroup !== undefined ? request.DgCompatibilityGroup : location.DgCompatibilityGroup;
    location.BondedFlag =
      request.BondedFlag !== undefined && request.BondedFlag !== null ? request.BondedFlag : location.BondedFlag;
    location.OwnerRestriction =
      request.OwnerRestriction !== undefined ? request.OwnerRestriction : location.OwnerRestriction;
    location.MixSkuPolicy = request.MixSkuPolicy !== undefined ? request.MixSkuPolicy : location.MixSkuPolicy;
    location.MixLotPolicy = request.MixLotPolicy !== undefined ? request.MixLotPolicy : location.MixLotPolicy;
    location.MixOwnerPolicy = request.MixOwnerPolicy !== undefined ? request.MixOwnerPolicy : location.MixOwnerPolicy;
    location.PickSequence = request.PickSequence !== undefined ? request.PickSequence : location.PickSequence;
    location.PutawaySequence =
      request.PutawaySequence !== undefined ? request.PutawaySequence : location.PutawaySequence;
    location.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : location.SourceSystem;
    location.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : location.ReferenceId;
    location.UpdatedAt = new Date();

    LocationPolicyValidator.Validate(location, profile);

    const updated = await this.locationRepository.Update(location);
    return LocationDtoMapper.ToDto(updated);
  }

  private async ValidateParent(
    currentLocationId: string,
    parentLocationId: string | null,
    warehouseId: string,
    zoneId: string,
  ): Promise<void> {
    if (parentLocationId === null) {
      return;
    }
    if (parentLocationId.trim().length === 0) {
      throw new BusinessRuleException('Parent location id cannot be empty');
    }
    if (parentLocationId === currentLocationId) {
      throw new BusinessRuleException('Location cannot be its own parent');
    }

    let parent = await this.locationRepository.FindById(parentLocationId);
    if (!parent) {
      throw new NotFoundException('Parent location not found');
    }
    if (parent.WarehouseId !== warehouseId) {
      throw new BusinessRuleException('Parent location must belong to the same warehouse');
    }
    if (parent.ZoneId !== zoneId) {
      throw new BusinessRuleException('Parent location must belong to the same zone');
    }

    while (parent.ParentLocationId) {
      if (parent.ParentLocationId === currentLocationId) {
        throw new BusinessRuleException('Location hierarchy cannot contain cycles');
      }
      parent = await this.GetAncestor(parent.ParentLocationId);
    }
  }

  private async GetAncestor(parentLocationId: string): Promise<LocationEntity> {
    const parent = await this.locationRepository.FindById(parentLocationId);
    if (!parent) {
      throw new NotFoundException('Parent location hierarchy is broken');
    }
    return parent;
  }
}
