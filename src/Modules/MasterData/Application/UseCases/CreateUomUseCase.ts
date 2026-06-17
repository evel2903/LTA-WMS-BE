import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { CreateUomDto } from '@modules/MasterData/Application/DTOs/CreateUomDto';
import { UomDto } from '@modules/MasterData/Application/DTOs/UomDto';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { UomDtoMapper } from '@modules/MasterData/Application/Mappers/UomDtoMapper';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';

export class CreateUomUseCase {
  constructor(private readonly uomRepository: IUomRepository) {}

  public async Execute(request: CreateUomDto): Promise<UomDto> {
    const existing = await this.uomRepository.FindByCode(request.UomCode);
    if (existing) {
      throw new ConflictException('UOM code already exists');
    }

    const now = new Date();
    const uom = new UomEntity({
      Id: randomUUID(),
      UomCode: request.UomCode,
      UomName: request.UomName,
      UomType: request.UomType ?? 'Quantity',
      DecimalPrecision: request.DecimalPrecision ?? 0,
      Status: request.Status,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const created = await this.uomRepository.Create(uom);
    return UomDtoMapper.ToDto(created);
  }
}
