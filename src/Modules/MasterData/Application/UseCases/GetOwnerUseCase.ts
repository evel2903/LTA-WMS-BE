import { NotFoundException } from '@common/Exceptions/AppException';
import { OwnerDto } from '@modules/MasterData/Application/DTOs/OwnerDto';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { OwnerDtoMapper } from '@modules/MasterData/Application/Mappers/OwnerDtoMapper';

export class GetOwnerUseCase {
  constructor(private readonly ownerRepository: IOwnerRepository) {}

  public async Execute(id: string): Promise<OwnerDto> {
    const owner = await this.ownerRepository.FindById(id);
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }

    return OwnerDtoMapper.ToDto(owner);
  }
}
