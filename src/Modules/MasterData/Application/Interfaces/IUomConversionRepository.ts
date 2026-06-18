import { UomConversionEntity } from '@modules/MasterData/Domain/Entities/UomConversionEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export const UOM_CONVERSION_REPOSITORY = Symbol('UOM_CONVERSION_REPOSITORY');

export interface UomConversionListFilter {
  SkuId?: string;
  FromUomId?: string;
  ToUomId?: string;
  Status?: MasterDataStatus;
  EffectiveFrom?: Date;
}

export interface IUomConversionRepository {
  FindById(id: string): Promise<UomConversionEntity | null>;
  FindByUniqueKey(
    skuId: string,
    fromUomId: string,
    toUomId: string,
    effectiveFrom: Date,
  ): Promise<UomConversionEntity | null>;
  FindActiveOverlap(
    skuId: string,
    fromUomId: string,
    toUomId: string,
    effectiveFrom: Date,
    effectiveTo: Date | null,
    excludeId?: string,
  ): Promise<UomConversionEntity | null>;
  Create(uomConversion: UomConversionEntity): Promise<UomConversionEntity>;
  Update(uomConversion: UomConversionEntity): Promise<UomConversionEntity>;
  List(
    skip: number,
    take: number,
    filter?: UomConversionListFilter,
  ): Promise<{ Items: UomConversionEntity[]; TotalItems: number }>;
}
