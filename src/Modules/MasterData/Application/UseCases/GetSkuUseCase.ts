import { NotFoundException } from '@common/Exceptions/AppException';
import { SkuDto } from '@modules/MasterData/Application/DTOs/SkuDto';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { SkuDtoMapper } from '@modules/MasterData/Application/Mappers/SkuDtoMapper';

export class GetSkuUseCase {
  constructor(private readonly skuRepository: ISkuRepository) {}

  public async Execute(id: string): Promise<SkuDto> {
    const sku = await this.skuRepository.FindById(id);
    if (!sku) {
      throw new NotFoundException('SKU not found');
    }

    return SkuDtoMapper.ToDto(sku);
  }
}
