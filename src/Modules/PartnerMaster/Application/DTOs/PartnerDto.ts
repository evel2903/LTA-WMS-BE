import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';

export interface PartnerDto {
  Id: string;
  PartnerCode: string;
  PartnerName: string;
  PartnerType: PartnerType;
  Status: PartnerStatus;
  SourceSystem: string;
  ExternalReference: string;
  ReferenceText: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}
