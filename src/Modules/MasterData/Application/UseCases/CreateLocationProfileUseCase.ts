import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
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
import { CreateLocationProfileDto } from '@modules/MasterData/Application/DTOs/CreateLocationProfileDto';
import { LocationProfileDto } from '@modules/MasterData/Application/DTOs/LocationProfileDto';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { LocationProfileDtoMapper } from '@modules/MasterData/Application/Mappers/LocationProfileDtoMapper';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateLocationProfileUseCase {
  constructor(
    private readonly locationProfileRepository: ILocationProfileRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreateLocationProfileDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<LocationProfileDto> {
    if (this.ownershipPolicy) {
      await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.LocationProfile,
        Action: ActionCode.Create,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
    }

    if (request.Status === MasterDataStatus.Active && request.LocationType.trim().length === 0) {
      throw new BusinessRuleException('Active location profile requires LocationType');
    }

    const existing = await this.locationProfileRepository.FindByCode(request.ProfileCode);
    if (existing) {
      throw new ConflictException('Location profile code already exists');
    }

    const now = new Date();
    const profile = new LocationProfileEntity({
      Id: randomUUID(),
      ProfileCode: request.ProfileCode,
      ProfileName: request.ProfileName,
      LocationType: request.LocationType,
      Version: 1,
      Status: request.Status,
      CapacityPolicy: request.CapacityPolicy ?? {},
      EligibilityPolicy: request.EligibilityPolicy ?? {},
      MixPolicy: request.MixPolicy ?? {},
      CompliancePolicy: request.CompliancePolicy ?? {},
      OperationPolicy: request.OperationPolicy ?? {},
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const buildEntry = (created: LocationProfileEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.LocationProfile,
        ObjectId: created.Id,
        ObjectCode: created.ProfileCode,
        AfterJson: LocationProfileDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
      });

    if (!this.auditedTransaction) {
      const created = await this.locationProfileRepository.Create(profile);
      return LocationProfileDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.locationProfileRepository.Create(profile, manager);
      return { result: LocationProfileDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
