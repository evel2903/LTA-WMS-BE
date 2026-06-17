import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { UomDto } from '@modules/MasterData/Application/DTOs/UomDto';
import { UpdateUomDto } from '@modules/MasterData/Application/DTOs/UpdateUomDto';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { UomDtoMapper } from '@modules/MasterData/Application/Mappers/UomDtoMapper';

export class UpdateUomUseCase {
  constructor(private readonly uomRepository: IUomRepository) {}

  public async Execute(request: UpdateUomDto): Promise<UomDto> {
    const uom = await this.uomRepository.FindById(request.Id);
    if (!uom) {
      throw new NotFoundException('UOM not found');
    }

    if (request.UomCode && request.UomCode !== uom.UomCode) {
      const duplicate = await this.uomRepository.FindByCode(request.UomCode);
      if (duplicate && duplicate.Id !== uom.Id) {
        throw new ConflictException('UOM code already exists');
      }
      uom.UomCode = request.UomCode;
    }

    uom.UomName = request.UomName ?? uom.UomName;
    uom.UomType = request.UomType ?? uom.UomType;
    uom.DecimalPrecision = request.DecimalPrecision ?? uom.DecimalPrecision;
    uom.Status = request.Status ?? uom.Status;
    uom.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : uom.SourceSystem;
    uom.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : uom.ReferenceId;
    uom.UpdatedAt = new Date();

    const updated = await this.uomRepository.Update(uom);
    return UomDtoMapper.ToDto(updated);
  }
}
