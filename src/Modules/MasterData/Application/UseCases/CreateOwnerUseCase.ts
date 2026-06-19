import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
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
import { CreateOwnerDto } from '@modules/MasterData/Application/DTOs/CreateOwnerDto';
import { OwnerDto } from '@modules/MasterData/Application/DTOs/OwnerDto';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { OwnerDtoMapper } from '@modules/MasterData/Application/Mappers/OwnerDtoMapper';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';

export class CreateOwnerUseCase {
  // Owner is an external source-of-truth (A6 OwnerCustomerSupplier, DirectEditAllowed=false):
  // when wired in production the ownership policy hard-blocks this with SOURCE_OF_TRUTH_READONLY.
  constructor(
    private readonly ownerRepository: IOwnerRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: CreateOwnerDto, context: AuditContext = SystemAuditContext): Promise<OwnerDto> {
    if (this.ownershipPolicy) {
      await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.OwnerCustomerSupplier,
        Action: ActionCode.Create,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
    }

    const existing = await this.ownerRepository.FindByCode(request.OwnerCode);
    if (existing) {
      throw new ConflictException('Owner code already exists');
    }

    const now = new Date();
    const owner = new OwnerEntity({
      Id: randomUUID(),
      OwnerCode: request.OwnerCode,
      OwnerName: request.OwnerName,
      Status: request.Status,
      BillingPolicy: request.BillingPolicy ?? {},
      VisibilityScope: request.VisibilityScope ?? {},
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const buildEntry = (created: OwnerEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Owner,
        ObjectId: created.Id,
        ObjectCode: created.OwnerCode,
        AfterJson: OwnerDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
        OwnerId: created.Id,
      });

    if (!this.auditedTransaction) {
      const created = await this.ownerRepository.Create(owner);
      return OwnerDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.ownerRepository.Create(owner, manager);
      return { result: OwnerDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
