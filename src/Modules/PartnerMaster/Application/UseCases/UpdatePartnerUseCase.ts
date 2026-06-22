import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { PartnerDto } from '@modules/PartnerMaster/Application/DTOs/PartnerDto';
import { UpdatePartnerDto } from '@modules/PartnerMaster/Application/DTOs/UpdatePartnerDto';
import { IPartnerRepository } from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerDtoMapper } from '@modules/PartnerMaster/Application/Mappers/PartnerDtoMapper';
import { PartnerEntity } from '@modules/PartnerMaster/Domain/Entities/PartnerEntity';

export class UpdatePartnerUseCase {
  constructor(
    private readonly partnerRepository: IPartnerRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: UpdatePartnerDto, context: AuditContext = SystemAuditContext): Promise<PartnerDto> {
    const partner = await this.partnerRepository.FindById(request.Id);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    const nextPartnerCode = request.PartnerCode ?? partner.PartnerCode;
    const nextSourceSystem = request.SourceSystem ?? partner.SourceSystem;
    const nextExternalReference = request.ExternalReference ?? partner.ExternalReference;

    if (request.PartnerCode && request.PartnerCode !== partner.PartnerCode) {
      const duplicate = await this.partnerRepository.FindByCode(request.PartnerCode);
      if (duplicate && duplicate.Id !== partner.Id) {
        throw new ConflictException('Partner code already exists');
      }
    }

    if (nextSourceSystem !== partner.SourceSystem || nextExternalReference !== partner.ExternalReference) {
      const duplicate = await this.partnerRepository.FindByExternalReference(
        partner.PartnerType,
        nextSourceSystem,
        nextExternalReference,
      );
      if (duplicate && duplicate.Id !== partner.Id) {
        throw new ConflictException('Partner external reference already exists');
      }
    }

    const before = PartnerDtoMapper.ToDto(partner) as unknown as Record<string, unknown>;

    partner.PartnerCode = nextPartnerCode;
    partner.PartnerName = request.PartnerName ?? partner.PartnerName;
    partner.Status = request.Status ?? partner.Status;
    partner.SourceSystem = nextSourceSystem;
    partner.ExternalReference = nextExternalReference;
    partner.ReferenceText = request.ReferenceText !== undefined ? request.ReferenceText : partner.ReferenceText;
    partner.UpdatedAt = new Date();

    const buildEntry = (updated: PartnerEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Partner,
        ObjectId: updated.Id,
        ObjectCode: updated.PartnerCode,
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
