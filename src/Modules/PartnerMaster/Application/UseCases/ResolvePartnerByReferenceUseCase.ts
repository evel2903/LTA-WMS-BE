import { NotFoundException } from '@common/Exceptions/AppException';
import { PartnerDto } from '@modules/PartnerMaster/Application/DTOs/PartnerDto';
import { ResolvePartnerByReferenceDto } from '@modules/PartnerMaster/Application/DTOs/ResolvePartnerByReferenceDto';
import { IPartnerRepository } from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerDtoMapper } from '@modules/PartnerMaster/Application/Mappers/PartnerDtoMapper';

export class ResolvePartnerByReferenceUseCase {
  constructor(private readonly partnerRepository: IPartnerRepository) {}

  public async Execute(query: ResolvePartnerByReferenceDto): Promise<PartnerDto> {
    const partner = await this.partnerRepository.FindByExternalReference(
      query.PartnerType,
      query.SourceSystem,
      query.ExternalReference,
    );
    if (!partner) {
      throw new NotFoundException('Partner external reference not found');
    }
    return PartnerDtoMapper.ToDto(partner);
  }
}
