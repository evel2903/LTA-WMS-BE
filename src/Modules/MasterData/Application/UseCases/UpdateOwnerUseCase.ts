import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
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
import { OwnerDto } from '@modules/MasterData/Application/DTOs/OwnerDto';
import { UpdateOwnerDto } from '@modules/MasterData/Application/DTOs/UpdateOwnerDto';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { OwnerDtoMapper } from '@modules/MasterData/Application/Mappers/OwnerDtoMapper';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';

export class UpdateOwnerUseCase {
  // Hard-blocked in production by A6 (OwnerCustomerSupplier read-only) — see CreateOwnerUseCase.
  constructor(
    private readonly ownerRepository: IOwnerRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: UpdateOwnerDto, context: AuditContext = SystemAuditContext): Promise<OwnerDto> {
    if (this.ownershipPolicy) {
      await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.OwnerCustomerSupplier,
        Action: ActionCode.Update,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
    }

    const owner = await this.ownerRepository.FindById(request.Id);
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
    const before = OwnerDtoMapper.ToDto(owner) as unknown as Record<string, unknown>;

    if (request.OwnerCode && request.OwnerCode !== owner.OwnerCode) {
      const duplicate = await this.ownerRepository.FindByCode(request.OwnerCode);
      if (duplicate && duplicate.Id !== owner.Id) {
        throw new ConflictException('Owner code already exists');
      }
      owner.OwnerCode = request.OwnerCode;
    }

    owner.OwnerName = request.OwnerName ?? owner.OwnerName;
    owner.Status = request.Status ?? owner.Status;
    owner.BillingPolicy = request.BillingPolicy ?? owner.BillingPolicy;
    owner.VisibilityScope = request.VisibilityScope ?? owner.VisibilityScope;
    owner.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : owner.SourceSystem;
    owner.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : owner.ReferenceId;
    owner.UpdatedAt = new Date();

    const buildEntry = (updated: OwnerEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Owner,
        ObjectId: updated.Id,
        ObjectCode: updated.OwnerCode,
        BeforeJson: before,
        AfterJson: OwnerDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
        OwnerId: updated.Id,
      });

    if (!this.auditedTransaction) {
      const updated = await this.ownerRepository.Update(owner);
      return OwnerDtoMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.ownerRepository.Update(owner, manager);
      return { result: OwnerDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
