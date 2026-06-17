import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { CreateOwnerDto } from '@modules/MasterData/Application/DTOs/CreateOwnerDto';
import { OwnerDto } from '@modules/MasterData/Application/DTOs/OwnerDto';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { OwnerDtoMapper } from '@modules/MasterData/Application/Mappers/OwnerDtoMapper';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';

export class CreateOwnerUseCase {
  constructor(private readonly ownerRepository: IOwnerRepository) {}

  public async Execute(request: CreateOwnerDto): Promise<OwnerDto> {
    const existing = await this.ownerRepository.FindByCode(request.OwnerCode);
    if (existing) {
      throw new ConflictException('Owner code already exists');
    }

    const now = new Date();
    const owner = new OwnerEntity({
      Id: randomUUID(),
      OwnerCode: request.OwnerCode,
      OwnerName: request.OwnerName,
      Status: request.Status,
      BillingPolicy: request.BillingPolicy ?? {},
      VisibilityScope: request.VisibilityScope ?? {},
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const created = await this.ownerRepository.Create(owner);
    return OwnerDtoMapper.ToDto(created);
  }
}
