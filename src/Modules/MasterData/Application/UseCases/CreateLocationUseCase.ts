import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { CreateLocationDto } from '@modules/MasterData/Application/DTOs/CreateLocationDto';
import { LocationDto } from '@modules/MasterData/Application/DTOs/LocationDto';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { LocationDtoMapper } from '@modules/MasterData/Application/Mappers/LocationDtoMapper';
import { LocationPolicyValidator } from '@modules/MasterData/Application/Services/LocationPolicyValidator';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateLocationUseCase {
  constructor(
    private readonly locationRepository: ILocationRepository,
    private readonly locationProfileRepository: ILocationProfileRepository,
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly zoneRepository: IZoneRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: CreateLocationDto, context: AuditContext = SystemAuditContext): Promise<LocationDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.WarehouseLocation,
        ObjectType: ObjectType.Location,
        Action: ActionCode.Create,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const warehouse = await this.warehouseRepository.FindById(request.WarehouseId);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    if (warehouse.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Warehouse must be active');
    }

    const zone = await this.zoneRepository.FindById(request.ZoneId);
    if (!zone) {
      throw new NotFoundException('Zone not found');
    }
    if (zone.WarehouseId !== request.WarehouseId) {
      throw new BusinessRuleException('Zone must belong to location warehouse');
    }
    if (zone.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Zone must be active');
    }

    const profile = await this.locationProfileRepository.FindById(request.LocationProfileId);
    if (!profile) {
      throw new NotFoundException('Location profile not found');
    }

    const duplicate = await this.locationRepository.FindByWarehouseAndCode(request.WarehouseId, request.LocationCode);
    if (duplicate) {
      throw new ConflictException('Location code already exists in warehouse');
    }

    const parentLocationId = request.ParentLocationId ?? null;
    if (parentLocationId !== null) {
      if (parentLocationId.trim().length === 0) {
        throw new BusinessRuleException('Parent location id cannot be empty');
      }

      const parent = await this.locationRepository.FindById(parentLocationId);
      if (!parent) {
        throw new NotFoundException('Parent location not found');
      }
      this.ValidateParentScope(parent, request.WarehouseId, request.ZoneId);
    }

    const now = new Date();
    const location = new LocationEntity({
      Id: randomUUID(),
      WarehouseId: request.WarehouseId,
      ZoneId: request.ZoneId,
      ParentLocationId: parentLocationId,
      LocationCode: request.LocationCode,
      LocationName: request.LocationName,
      LocationType: request.LocationType,
      LocationProfileId: request.LocationProfileId,
      LocationStatus: request.LocationStatus,
      CapacityQty: request.CapacityQty ?? null,
      CapacityVolume: request.CapacityVolume ?? null,
      CapacityWeight: request.CapacityWeight ?? null,
      PalletSlot: request.PalletSlot ?? null,
      TemperatureClass: request.TemperatureClass ?? null,
      DgCompatibilityGroup: request.DgCompatibilityGroup ?? null,
      BondedFlag: request.BondedFlag ?? false,
      OwnerRestriction: request.OwnerRestriction ?? null,
      MixSkuPolicy: request.MixSkuPolicy ?? null,
      MixLotPolicy: request.MixLotPolicy ?? null,
      MixOwnerPolicy: request.MixOwnerPolicy ?? null,
      PickSequence: request.PickSequence ?? null,
      PutawaySequence: request.PutawaySequence ?? null,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    LocationPolicyValidator.Validate(location, profile);

    const buildEntry = (created: LocationEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Location,
        ObjectId: created.Id,
        ObjectCode: created.LocationCode,
        ReasonCodeId: reasonCodeId,
        AfterJson: LocationDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
        WarehouseId: created.WarehouseId,
      });

    if (!this.auditedTransaction) {
      const created = await this.locationRepository.Create(location);
      return LocationDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.locationRepository.Create(location, manager);
      return { result: LocationDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }

  private ValidateParentScope(parent: LocationEntity, warehouseId: string, zoneId: string): void {
    if (parent.WarehouseId !== warehouseId) {
      throw new BusinessRuleException('Parent location must belong to the same warehouse');
    }
    if (parent.ZoneId !== zoneId) {
      throw new BusinessRuleException('Parent location must belong to the same zone');
    }
  }
}
