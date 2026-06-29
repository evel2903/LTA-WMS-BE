import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';

/**
 * Narrow port (interface segregation) cho luồng import Excel: chỉ cần batch-lookup SKU/UOM theo
 * code, không phải toàn bộ ISkuRepository/IUomRepository. Concrete SkuRepository/UomRepository
 * (đã có FindByCodes) thỏa các port này qua structural typing — không buộc fake test khác thêm method.
 */
export interface ISkuCodeBatchLookup {
  FindByCodes(skuCodes: string[]): Promise<SkuEntity[]>;
}

export interface IUomCodeBatchLookup {
  FindByCodes(uomCodes: string[]): Promise<UomEntity[]>;
}
