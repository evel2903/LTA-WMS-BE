import { NotFoundException } from '@common/Exceptions/AppException';
import { UomDto } from '@modules/MasterData/Application/DTOs/UomDto';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { UomDtoMapper } from '@modules/MasterData/Application/Mappers/UomDtoMapper';

export class GetUomUseCase {
  constructor(private readonly uomRepository: IUomRepository) {}

  public async Execute(id: string): Promise<UomDto> {
    const uom = await this.uomRepository.FindById(id);
    if (!uom) {
      throw new NotFoundException('UOM not found');
    }

    return UomDtoMapper.ToDto(uom);
  }
}
