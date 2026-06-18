import { NotFoundException } from '@common/Exceptions/AppException';
import { ResolveSkuBarcodeDto } from '@modules/MasterData/Application/DTOs/ResolveSkuBarcodeDto';
import { SkuBarcodeDto } from '@modules/MasterData/Application/DTOs/SkuBarcodeDto';
import { ISkuBarcodeRepository } from '@modules/MasterData/Application/Interfaces/ISkuBarcodeRepository';
import { SkuBarcodeMapper } from '@modules/MasterData/Application/Mappers/SkuBarcodeMapper';

export class ResolveSkuBarcodeUseCase {
  constructor(private readonly skuBarcodes: ISkuBarcodeRepository) {}

  public async Execute(query: ResolveSkuBarcodeDto): Promise<SkuBarcodeDto> {
    const barcode = await this.skuBarcodes.FindByValueAndOwner(query.BarcodeValue, query.OwnerId ?? null);
    if (!barcode) {
      throw new NotFoundException('SKU barcode not found');
    }
    return SkuBarcodeMapper.ToDto(barcode);
  }
}
