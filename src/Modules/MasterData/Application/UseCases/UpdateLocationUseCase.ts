import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import {
  AssertUpdateDataScopes,
  ResolveActorUserId,
} from '@modules/AccessControl/Application/Services/PermissionScopeAssertion';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { UpdateLocationDto } from '@modules/MasterData/Application/DTOs/UpdateLocationDto';
import { LocationDto } from '@modules/MasterData/Application/DTOs/LocationDto';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { LocationDtoMapper } from '@modules/MasterData/Application/Mappers/LocationDtoMapper';
import { LocationPhysicalAddressPolicy } from '@modules/MasterData/Application/Services/LocationPhysicalAddressPolicy';
import { LocationPolicyValidator } from '@modules/MasterData/Application/Services/LocationPolicyValidator';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateLocationUseCase {
  constructor(
    private readonly locationRepository: ILocationRepository,
    private readonly locationProfileRepository: ILocationProfileRepository,
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly zoneRepository: IZoneRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(request: UpdateLocationDto, context: AuditContext = SystemAuditContext): Promise<LocationDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.WarehouseLocation,
        ObjectType: ObjectType.Location,
        Action: ActionCode.Update,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const location = await this.locationRepository.FindById(request.Id);
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    const before = LocationDtoMapper.ToDto(location) as unknown as Record<string, unknown>;

    const targetWarehouseId = request.WarehouseId ?? location.WarehouseId;
    const targetZoneId = request.ZoneId ?? location.ZoneId;
    const targetProfileId = request.LocationProfileId ?? location.LocationProfileId;
    const targetLocationCode = request.LocationCode ?? location.LocationCode;
    const targetParentLocationId =
      request.ParentLocationId !== undefined ? request.ParentLocationId : location.ParentLocationId;
    const targetPhysicalAddress = LocationPhysicalAddressPolicy.Normalize({
      AisleCode: request.AisleCode !== undefined ? request.AisleCode : location.AisleCode,
      RackCode: request.RackCode !== undefined ? request.RackCode : location.RackCode,
      LevelCode: request.LevelCode !== undefined ? request.LevelCode : location.LevelCode,
      BinCode: request.BinCode !== undefined ? request.BinCode : location.BinCode,
    });
    await AssertUpdateDataScopes(this.permissionChecker, ResolveActorUserId(request, context), ObjectType.Location, [
      { WarehouseId: location.WarehouseId },
      { WarehouseId: targetWarehouseId },
    ]);

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

    if (LocationPhysicalAddressPolicy.IsComplete(targetPhysicalAddress)) {
      const duplicateAddress = await this.locationRepository.FindByPhysicalAddress(
        targetWarehouseId,
        targetZoneId,
        targetPhysicalAddress,
      );
      if (duplicateAddress && duplicateAddress.Id !== location.Id) {
        throw new ConflictException('Location physical address already exists in zone');
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
    location.AisleCode = targetPhysicalAddress.AisleCode;
    location.RackCode = targetPhysicalAddress.RackCode;
    location.LevelCode = targetPhysicalAddress.LevelCode;
    location.BinCode = targetPhysicalAddress.BinCode;
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

    const buildEntry = (updated: LocationEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Location,
        ObjectId: updated.Id,
        ObjectCode: updated.LocationCode,
        ReasonCodeId: reasonCodeId,
        BeforeJson: before,
        AfterJson: LocationDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
        WarehouseId: updated.WarehouseId,
      });

    if (!this.auditedTransaction) {
      const updated = await this.locationRepository.Update(location);
      return LocationDtoMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.locationRepository.Update(location, manager);
      return { result: LocationDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
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

    // Track every node visited while walking up the ancestor chain. This catches
    // both a cycle through the current location and any pre-existing cycle in the
    // stored hierarchy that does not pass through it (e.g. A -> B -> A), preventing
    // an infinite loop on corrupted data.
    const visited = new Set<string>([parent.Id]);
    while (parent.ParentLocationId) {
      if (parent.ParentLocationId === currentLocationId) {
        throw new BusinessRuleException('Location hierarchy cannot contain cycles');
      }
      if (visited.has(parent.ParentLocationId)) {
        throw new BusinessRuleException('Location hierarchy cannot contain cycles');
      }
      visited.add(parent.ParentLocationId);
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
