import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';

export interface UpdatePartnerDto {
  Id: string;
  PartnerCode?: string;
  PartnerName?: string;
  Status?: PartnerStatus;
  SourceSystem?: string;
  ExternalReference?: string;
  ReferenceText?: string | null;
}
