import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { UpdateWarehouseProfileDto } from '@modules/WarehouseProfile/Application/DTOs/UpdateWarehouseProfileDto';
import { WarehouseProfileDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileDto';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/WarehouseProfileDtoMapper';
import { ParseEffectiveDate } from '@modules/WarehouseProfile/Application/Services/EffectiveDate';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { ScopeReferenceValidator } from '@modules/WarehouseProfile/Application/Services/ScopeReferenceValidator';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { ProfilePolicyKey } from '@modules/WarehouseProfile/Domain/ValueObjects/ProfilePolicyConfig';

export class UpdateWarehouseProfileUseCase {
  private readonly scopeReferenceValidator: ScopeReferenceValidator;

  constructor(
    private readonly profileRepository: IWarehouseProfileRepository,
    warehouseRepository: IWarehouseRepository,
    zoneRepository: IZoneRepository,
    ownerRepository: IOwnerRepository,
    skuRepository: ISkuRepository,
    private readonly scopeKeyService: ScopeKeyService,
    private readonly policyValidator: WarehouseProfilePolicyValidator,
  ) {
    this.scopeReferenceValidator = new ScopeReferenceValidator(
      warehouseRepository,
      zoneRepository,
      ownerRepository,
      skuRepository,
    );
  }

  public async Execute(request: UpdateWarehouseProfileDto): Promise<WarehouseProfileDto> {
    const profile = await this.profileRepository.FindById(request.Id);
    if (!profile) {
      throw new NotFoundException('Warehouse profile not found');
    }

    this.RejectNullRequired(request);
    await this.ApplyHeader(request, profile);
    this.ApplyScope(request, profile);
    // Re-assert minimum scope readiness against the post-update profile state
    // (B1 validates readiness; B5 enforces activation).
    this.policyValidator.AssertScopeReadiness({ WarehouseTypeCode: profile.WarehouseTypeCode });
    await this.scopeReferenceValidator.Assert({
      WarehouseId: profile.WarehouseId,
      ZoneId: profile.ZoneId,
      OwnerId: profile.OwnerId,
      SkuId: profile.SkuId,
    });
    this.ApplyEffective(request, profile);
    this.ApplyPolicies(request, profile);
    this.ApplyAuditMetadata(request, profile);

    profile.ScopeKey = this.scopeKeyService.Build({
      WarehouseTypeCode: profile.WarehouseTypeCode,
      WarehouseId: profile.WarehouseId,
      ZoneId: profile.ZoneId,
      LocationType: profile.LocationType,
      OwnerId: profile.OwnerId,
      SkuId: profile.SkuId,
      ItemClass: profile.ItemClass,
      OrderType: profile.OrderType,
      CustomerId: profile.CustomerId,
      SupplierId: profile.SupplierId,
    });
    profile.UpdatedAt = new Date();

    const updated = await this.profileRepository.Update(profile);
    return WarehouseProfileDtoMapper.ToDto(updated);
  }

  private RejectNullRequired(request: UpdateWarehouseProfileDto): void {
    const requiredKeys: Array<keyof UpdateWarehouseProfileDto> = [
      'ProfileCode',
      'ProfileName',
      'WarehouseTypeCode',
      'EffectiveFrom',
    ];
    for (const key of requiredKeys) {
      if (key in request && request[key] === null) {
        throw new BusinessRuleException(`${key} cannot be null`);
      }
    }
  }

  private async ApplyHeader(request: UpdateWarehouseProfileDto, profile: WarehouseProfileEntity): Promise<void> {
    if (request.ProfileCode !== undefined && request.ProfileCode !== profile.ProfileCode) {
      const duplicate = await this.profileRepository.FindByCode(request.ProfileCode);
      if (duplicate && duplicate.Id !== profile.Id) {
        throw new ConflictException('Warehouse profile code already exists');
      }
      profile.ProfileCode = request.ProfileCode;
    }
    if (request.ProfileName !== undefined) {
      profile.ProfileName = request.ProfileName;
    }
    if (request.WarehouseTypeCode !== undefined) {
      profile.WarehouseTypeCode = this.policyValidator.AssertWarehouseTypeCode(request.WarehouseTypeCode);
    }
  }

  private ApplyScope(request: UpdateWarehouseProfileDto, profile: WarehouseProfileEntity): void {
    if (request.WarehouseId !== undefined) profile.WarehouseId = request.WarehouseId;
    if (request.ZoneId !== undefined) profile.ZoneId = request.ZoneId;
    if (request.LocationType !== undefined) profile.LocationType = request.LocationType;
    if (request.OwnerId !== undefined) profile.OwnerId = request.OwnerId;
    if (request.SkuId !== undefined) profile.SkuId = request.SkuId;
    if (request.ItemClass !== undefined) profile.ItemClass = request.ItemClass;
    if (request.OrderType !== undefined) profile.OrderType = request.OrderType;
    if (request.CustomerId !== undefined) profile.CustomerId = request.CustomerId;
    if (request.SupplierId !== undefined) profile.SupplierId = request.SupplierId;
  }

  private ApplyEffective(request: UpdateWarehouseProfileDto, profile: WarehouseProfileEntity): void {
    if (request.EffectiveFrom !== undefined) {
      profile.EffectiveFrom = ParseEffectiveDate(request.EffectiveFrom, 'EffectiveFrom');
    }
    if (request.EffectiveTo !== undefined) {
      profile.EffectiveTo =
        request.EffectiveTo === null ? null : ParseEffectiveDate(request.EffectiveTo, 'EffectiveTo');
    }
    this.policyValidator.AssertEffectiveWindow(profile.EffectiveFrom, profile.EffectiveTo);
  }

  private ApplyPolicies(request: UpdateWarehouseProfileDto, profile: WarehouseProfileEntity): void {
    const keys: ProfilePolicyKey[] = [
      'CapabilityFlags',
      'StrategyPolicy',
      'ThresholdPolicy',
      'ApprovalPolicy',
      'LabelDevicePolicy',
      'IntegrationPolicy',
      'AuditPolicy',
    ];
    for (const key of keys) {
      if (request[key] !== undefined) {
        profile[key] = this.policyValidator.ValidatePolicyShape(key, request[key]);
      }
    }
  }

  private ApplyAuditMetadata(request: UpdateWarehouseProfileDto, profile: WarehouseProfileEntity): void {
    if (request.SourceSystem !== undefined) profile.SourceSystem = request.SourceSystem;
    if (request.ReferenceId !== undefined) profile.ReferenceId = request.ReferenceId;
    if (request.UpdatedBy !== undefined) profile.UpdatedBy = request.UpdatedBy;
  }
}
