import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';

export interface CreatePartnerDto {
  PartnerCode: string;
  PartnerName: string;
  PartnerType: PartnerType;
  Status?: PartnerStatus;
  SourceSystem: string;
  ExternalReference: string;
  ReferenceText?: string | null;
}
