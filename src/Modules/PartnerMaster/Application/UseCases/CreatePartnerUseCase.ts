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
import { CreatePartnerDto } from '@modules/PartnerMaster/Application/DTOs/CreatePartnerDto';
import { PartnerDto } from '@modules/PartnerMaster/Application/DTOs/PartnerDto';
import { IPartnerRepository } from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerDtoMapper } from '@modules/PartnerMaster/Application/Mappers/PartnerDtoMapper';
import { PartnerEntity } from '@modules/PartnerMaster/Domain/Entities/PartnerEntity';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';

export class CreatePartnerUseCase {
  constructor(
    private readonly partnerRepository: IPartnerRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: CreatePartnerDto, context: AuditContext = SystemAuditContext): Promise<PartnerDto> {
    this.AssertExternalReference(request.SourceSystem, request.ExternalReference);

    const duplicateCode = await this.partnerRepository.FindByCode(request.PartnerCode);
    if (duplicateCode) {
      throw new ConflictException('Partner code already exists');
    }

    const duplicateReference = await this.partnerRepository.FindByExternalReference(
      request.PartnerType,
      request.SourceSystem,
      request.ExternalReference,
    );
    if (duplicateReference) {
      throw new ConflictException('Partner external reference already exists');
    }

    const now = new Date();
    const partner = new PartnerEntity({
      Id: randomUUID(),
      PartnerCode: request.PartnerCode,
      PartnerName: request.PartnerName,
      PartnerType: request.PartnerType,
      Status: request.Status ?? PartnerStatus.Active,
      SourceSystem: request.SourceSystem,
      ExternalReference: request.ExternalReference,
      ReferenceText: request.ReferenceText ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const buildEntry = (created: PartnerEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Partner,
        ObjectId: created.Id,
        ObjectCode: created.PartnerCode,
        AfterJson: PartnerDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
      });

    if (!this.auditedTransaction) {
      const created = await this.partnerRepository.Create(partner);
      return PartnerDtoMapper.ToDto(created);
    }

    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.partnerRepository.Create(partner, manager);
      return { result: PartnerDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }

  private AssertExternalReference(sourceSystem: string, externalReference: string): void {
    if (!sourceSystem?.trim() || !externalReference?.trim()) {
      throw new BusinessRuleException('Partner external reference requires SourceSystem and ExternalReference');
    }
  }
}
