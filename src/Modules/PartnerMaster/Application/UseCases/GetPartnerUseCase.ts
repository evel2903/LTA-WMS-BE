import { NotFoundException } from '@common/Exceptions/AppException';
import { PartnerDto } from '@modules/PartnerMaster/Application/DTOs/PartnerDto';
import { IPartnerRepository } from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerDtoMapper } from '@modules/PartnerMaster/Application/Mappers/PartnerDtoMapper';

export class GetPartnerUseCase {
  constructor(private readonly partnerRepository: IPartnerRepository) {}

  public async Execute(id: string): Promise<PartnerDto> {
    const partner = await this.partnerRepository.FindById(id);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }
    return PartnerDtoMapper.ToDto(partner);
  }
}
