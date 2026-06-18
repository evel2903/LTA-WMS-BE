import { SkuBarcodeEntity } from '@modules/MasterData/Domain/Entities/SkuBarcodeEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export const SKU_BARCODE_REPOSITORY = Symbol('SKU_BARCODE_REPOSITORY');

export interface SkuBarcodeListFilter {
  SkuId?: string;
  OwnerId?: string | null;
  UomId?: string;
  BarcodeValue?: string;
  Status?: MasterDataStatus;
}

export interface ISkuBarcodeRepository {
  FindById(id: string): Promise<SkuBarcodeEntity | null>;
  FindByValueAndOwner(barcodeValue: string, ownerId: string | null): Promise<SkuBarcodeEntity | null>;
  Create(skuBarcode: SkuBarcodeEntity): Promise<SkuBarcodeEntity>;
  Update(skuBarcode: SkuBarcodeEntity): Promise<SkuBarcodeEntity>;
  List(
    skip: number,
    take: number,
    filter?: SkuBarcodeListFilter,
  ): Promise<{ Items: SkuBarcodeEntity[]; TotalItems: number }>;
}
