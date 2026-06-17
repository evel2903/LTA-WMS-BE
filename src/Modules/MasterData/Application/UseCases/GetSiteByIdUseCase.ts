import { NotFoundException } from '@common/Exceptions/AppException';
import { SiteDto } from '@modules/MasterData/Application/DTOs/SiteDto';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { SiteDtoMapper } from '@modules/MasterData/Application/Mappers/SiteDtoMapper';

export class GetSiteByIdUseCase {
  constructor(private readonly siteRepository: ISiteRepository) {}

  public async Execute(id: string): Promise<SiteDto> {
    const site = await this.siteRepository.FindById(id);
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return SiteDtoMapper.ToDto(site);
  }
}
