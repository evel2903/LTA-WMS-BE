import { NotFoundException } from '@common/Exceptions/AppException';
import { SkuRuleFactsDto } from '@modules/MasterData/Application/DTOs/SkuRuleFactsDto';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { SkuDtoMapper } from '@modules/MasterData/Application/Mappers/SkuDtoMapper';

export class GetSkuRuleFactsUseCase {
  constructor(private readonly skuRepository: ISkuRepository) {}

  public async Execute(id: string): Promise<SkuRuleFactsDto> {
    const sku = await this.skuRepository.FindById(id);
    if (!sku) {
      throw new NotFoundException('SKU not found');
    }

    return SkuDtoMapper.ToRuleFacts(sku);
  }
}
