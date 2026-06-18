import { NotFoundException } from '@common/Exceptions/AppException';
import { SkuBarcodeDto } from '@modules/MasterData/Application/DTOs/SkuBarcodeDto';
import { ISkuBarcodeRepository } from '@modules/MasterData/Application/Interfaces/ISkuBarcodeRepository';
import { SkuBarcodeMapper } from '@modules/MasterData/Application/Mappers/SkuBarcodeMapper';

export class GetSkuBarcodeUseCase {
  constructor(private readonly skuBarcodes: ISkuBarcodeRepository) {}

  public async Execute(id: string): Promise<SkuBarcodeDto> {
    const barcode = await this.skuBarcodes.FindById(id);
    if (!barcode) {
      throw new NotFoundException('SKU barcode not found');
    }
    return SkuBarcodeMapper.ToDto(barcode);
  }
}
