import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { CreateSiteDto } from '@modules/MasterData/Application/DTOs/CreateSiteDto';
import { SiteDto } from '@modules/MasterData/Application/DTOs/SiteDto';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { SiteDtoMapper } from '@modules/MasterData/Application/Mappers/SiteDtoMapper';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';

export class CreateSiteUseCase {
  constructor(private readonly siteRepository: ISiteRepository) {}

  public async Execute(request: CreateSiteDto): Promise<SiteDto> {
    const existing = await this.siteRepository.FindByCode(request.SiteCode);
    if (existing) {
      throw new ConflictException('Site code already exists');
    }

    const now = new Date();
    const site = new SiteEntity({
      Id: randomUUID(),
      SiteCode: request.SiteCode,
      SiteName: request.SiteName,
      Status: request.Status,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const created = await this.siteRepository.Create(site);
    return SiteDtoMapper.ToDto(created);
  }
}
