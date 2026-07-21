import { EntityManager } from 'typeorm';
import { PartnerEntity } from '@modules/PartnerMaster/Domain/Entities/PartnerEntity';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';

export const PARTNER_REPOSITORY = Symbol('PARTNER_REPOSITORY');

export interface PartnerListFilter {
  PartnerType?: PartnerType;
  Status?: PartnerStatus;
  PartnerCode?: string;
  PartnerName?: string;
  SourceSystem?: string;
  ExternalReference?: string;
  Search?: string;
}

export interface IPartnerRepository {
  FindById(id: string): Promise<PartnerEntity | null>;
  FindByCode(partnerCode: string): Promise<PartnerEntity | null>;
  FindByExternalReference(
    partnerType: PartnerType,
    sourceSystem: string,
    externalReference: string,
  ): Promise<PartnerEntity | null>;
  Create(partner: PartnerEntity, manager?: EntityManager): Promise<PartnerEntity>;
  Update(partner: PartnerEntity, manager?: EntityManager): Promise<PartnerEntity>;
  List(skip: number, take: number, filter?: PartnerListFilter): Promise<{ Items: PartnerEntity[]; TotalItems: number }>;
}
