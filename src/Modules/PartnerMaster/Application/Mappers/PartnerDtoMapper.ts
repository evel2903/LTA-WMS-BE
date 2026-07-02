import { PartnerDto } from '@modules/PartnerMaster/Application/DTOs/PartnerDto';
import { PartnerEntity } from '@modules/PartnerMaster/Domain/Entities/PartnerEntity';

export class PartnerDtoMapper {
  public static ToDto(partner: PartnerEntity): PartnerDto {
    return {
      Id: partner.Id,
      PartnerCode: partner.PartnerCode,
      PartnerName: partner.PartnerName,
      PartnerType: partner.PartnerType,
      Status: partner.Status,
      SourceSystem: partner.SourceSystem,
      ExternalReference: partner.ExternalReference,
      ReferenceText: partner.ReferenceText,
      RiskLevel: partner.RiskLevel,
      CreatedAt: partner.CreatedAt,
      UpdatedAt: partner.UpdatedAt,
      CreatedBy: partner.CreatedBy,
      UpdatedBy: partner.UpdatedBy,
    };
  }
}
