import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { OwnerDto } from '@modules/MasterData/Application/DTOs/OwnerDto';
import { UpdateOwnerDto } from '@modules/MasterData/Application/DTOs/UpdateOwnerDto';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { OwnerDtoMapper } from '@modules/MasterData/Application/Mappers/OwnerDtoMapper';

export class UpdateOwnerUseCase {
  constructor(private readonly ownerRepository: IOwnerRepository) {}

  public async Execute(request: UpdateOwnerDto): Promise<OwnerDto> {
    const owner = await this.ownerRepository.FindById(request.Id);
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }

    if (request.OwnerCode && request.OwnerCode !== owner.OwnerCode) {
      const duplicate = await this.ownerRepository.FindByCode(request.OwnerCode);
      if (duplicate && duplicate.Id !== owner.Id) {
        throw new ConflictException('Owner code already exists');
      }
      owner.OwnerCode = request.OwnerCode;
    }

    owner.OwnerName = request.OwnerName ?? owner.OwnerName;
    owner.Status = request.Status ?? owner.Status;
    owner.BillingPolicy = request.BillingPolicy ?? owner.BillingPolicy;
    owner.VisibilityScope = request.VisibilityScope ?? owner.VisibilityScope;
    owner.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : owner.SourceSystem;
    owner.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : owner.ReferenceId;
    owner.UpdatedAt = new Date();

    const updated = await this.ownerRepository.Update(owner);
    return OwnerDtoMapper.ToDto(updated);
  }
}
