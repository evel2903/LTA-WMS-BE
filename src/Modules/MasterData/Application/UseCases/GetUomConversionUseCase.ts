import { NotFoundException } from '@common/Exceptions/AppException';
import { UomConversionDto } from '@modules/MasterData/Application/DTOs/UomConversionDto';
import { IUomConversionRepository } from '@modules/MasterData/Application/Interfaces/IUomConversionRepository';
import { UomConversionMapper } from '@modules/MasterData/Application/Mappers/UomConversionMapper';

export class GetUomConversionUseCase {
  constructor(private readonly uomConversions: IUomConversionRepository) {}

  public async Execute(id: string): Promise<UomConversionDto> {
    const conversion = await this.uomConversions.FindById(id);
    if (!conversion) {
      throw new NotFoundException('UOM conversion not found');
    }
    return UomConversionMapper.ToDto(conversion);
  }
}
