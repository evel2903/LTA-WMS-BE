import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { CreateWarehouseProfileDto } from '@modules/WarehouseProfile/Application/DTOs/CreateWarehouseProfileDto';
import { WarehouseProfileDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileDto';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/WarehouseProfileDtoMapper';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { ScopeReferenceValidator } from '@modules/WarehouseProfile/Application/Services/ScopeReferenceValidator';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { ParseEffectiveDate } from '@modules/WarehouseProfile/Application/Services/EffectiveDate';

export class CreateWarehouseProfileUseCase {
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

  public async Execute(request: CreateWarehouseProfileDto): Promise<WarehouseProfileDto> {
    const warehouseTypeCode = this.policyValidator.AssertWarehouseTypeCode(request.WarehouseTypeCode);
    // Minimum scope readiness gate (B1 validates readiness; B5 enforces activation).
    this.policyValidator.AssertScopeReadiness({ WarehouseTypeCode: warehouseTypeCode });

    const effectiveFrom = ParseEffectiveDate(request.EffectiveFrom, 'EffectiveFrom');
    const effectiveTo = request.EffectiveTo ? ParseEffectiveDate(request.EffectiveTo, 'EffectiveTo') : null;
    this.policyValidator.AssertEffectiveWindow(effectiveFrom, effectiveTo);

    const policies = {
      CapabilityFlags: this.policyValidator.ValidatePolicyShape('CapabilityFlags', request.CapabilityFlags),
      StrategyPolicy: this.policyValidator.ValidatePolicyShape('StrategyPolicy', request.StrategyPolicy),
      ThresholdPolicy: this.policyValidator.ValidatePolicyShape('ThresholdPolicy', request.ThresholdPolicy),
      ApprovalPolicy: this.policyValidator.ValidatePolicyShape('ApprovalPolicy', request.ApprovalPolicy),
      LabelDevicePolicy: this.policyValidator.ValidatePolicyShape('LabelDevicePolicy', request.LabelDevicePolicy),
      IntegrationPolicy: this.policyValidator.ValidatePolicyShape('IntegrationPolicy', request.IntegrationPolicy),
      AuditPolicy: this.policyValidator.ValidatePolicyShape('AuditPolicy', request.AuditPolicy),
    };

    await this.scopeReferenceValidator.Assert(request);

    if (await this.profileRepository.FindByCode(request.ProfileCode)) {
      throw new ConflictException('Warehouse profile code already exists');
    }

    const scopeKey = this.scopeKeyService.Build({
      WarehouseTypeCode: warehouseTypeCode,
      WarehouseId: request.WarehouseId,
      ZoneId: request.ZoneId,
      LocationType: request.LocationType,
      OwnerId: request.OwnerId,
      SkuId: request.SkuId,
      ItemClass: request.ItemClass,
      OrderType: request.OrderType,
      CustomerId: request.CustomerId,
      SupplierId: request.SupplierId,
    });

    const now = new Date();
    const profile = new WarehouseProfileEntity({
      Id: randomUUID(),
      ProfileCode: request.ProfileCode,
      ProfileName: request.ProfileName,
      WarehouseTypeCode: warehouseTypeCode,
      Version: 1,
      Status: WarehouseProfileStatus.Draft,
      WarehouseId: request.WarehouseId ?? null,
      ZoneId: request.ZoneId ?? null,
      LocationType: request.LocationType ?? null,
      OwnerId: request.OwnerId ?? null,
      SkuId: request.SkuId ?? null,
      ItemClass: request.ItemClass ?? null,
      OrderType: request.OrderType ?? null,
      CustomerId: request.CustomerId ?? null,
      SupplierId: request.SupplierId ?? null,
      ScopeKey: scopeKey,
      EffectiveFrom: effectiveFrom,
      EffectiveTo: effectiveTo,
      ...policies,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: request.CreatedBy ?? null,
      UpdatedBy: request.CreatedBy ?? null,
    });

    const created = await this.profileRepository.Create(profile);
    return WarehouseProfileDtoMapper.ToDto(created);
  }
}
