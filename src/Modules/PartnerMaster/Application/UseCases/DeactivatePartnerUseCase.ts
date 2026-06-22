import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { DeactivatePartnerDto } from '@modules/PartnerMaster/Application/DTOs/DeactivatePartnerDto';
import { PartnerDto } from '@modules/PartnerMaster/Application/DTOs/PartnerDto';
import { IPartnerRepository } from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerDtoMapper } from '@modules/PartnerMaster/Application/Mappers/PartnerDtoMapper';
import { PartnerEntity } from '@modules/PartnerMaster/Domain/Entities/PartnerEntity';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';

export class DeactivatePartnerUseCase {
  constructor(
    private readonly partnerRepository: IPartnerRepository,
    private readonly auditedTransaction?: AuditedTransaction,
    private readonly reasonCatalog?: IReasonCodeCatalog,
  ) {}

  public async Execute(request: DeactivatePartnerDto, context: AuditContext = SystemAuditContext): Promise<PartnerDto> {
    if (!request.ReasonCode?.trim()) {
      throw new BusinessRuleException('Partner deactivation requires a reason code');
    }

    const partner = await this.partnerRepository.FindById(request.Id);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    const validated = this.reasonCatalog
      ? await this.reasonCatalog.ValidateReason({
          ReasonCode: request.ReasonCode,
          Action: ActionCode.DeleteCancel,
          ObjectType: ObjectType.Partner,
        })
      : { ReasonCodeId: request.ReasonCode };

    const before = PartnerDtoMapper.ToDto(partner) as unknown as Record<string, unknown>;
    partner.Status = PartnerStatus.Inactive;
    partner.UpdatedAt = new Date();

    const buildEntry = (updated: PartnerEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.DeleteCancel,
        ObjectType: ObjectType.Partner,
        ObjectId: updated.Id,
        ObjectCode: updated.PartnerCode,
        ReasonCodeId: validated.ReasonCodeId,
        BeforeJson: before,
        AfterJson: PartnerDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
      });

    if (!this.auditedTransaction) {
      const updated = await this.partnerRepository.Update(partner);
      return PartnerDtoMapper.ToDto(updated);
    }

    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.partnerRepository.Update(partner, manager);
      return { result: PartnerDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
