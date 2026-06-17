import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { SiteDto } from '@modules/MasterData/Application/DTOs/SiteDto';
import { UpdateSiteDto } from '@modules/MasterData/Application/DTOs/UpdateSiteDto';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { SiteDtoMapper } from '@modules/MasterData/Application/Mappers/SiteDtoMapper';

export class UpdateSiteUseCase {
  constructor(private readonly siteRepository: ISiteRepository) {}

  public async Execute(request: UpdateSiteDto): Promise<SiteDto> {
    const site = await this.siteRepository.FindById(request.Id);
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    if (request.SiteCode && request.SiteCode !== site.SiteCode) {
      const duplicate = await this.siteRepository.FindByCode(request.SiteCode);
      if (duplicate && duplicate.Id !== site.Id) {
        throw new ConflictException('Site code already exists');
      }
      site.SiteCode = request.SiteCode;
    }

    site.SiteName = request.SiteName ?? site.SiteName;
    site.Status = request.Status ?? site.Status;
    site.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : site.SourceSystem;
    site.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : site.ReferenceId;
    site.UpdatedAt = new Date();

    const updated = await this.siteRepository.Update(site);
    return SiteDtoMapper.ToDto(updated);
  }
}
