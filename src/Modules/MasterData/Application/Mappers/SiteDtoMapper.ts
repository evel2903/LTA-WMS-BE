import { SiteDto } from '@modules/MasterData/Application/DTOs/SiteDto';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';

export class SiteDtoMapper {
  public static ToDto(entity: SiteEntity): SiteDto {
    return {
      Id: entity.Id,
      SiteCode: entity.SiteCode,
      SiteName: entity.SiteName,
      Status: entity.Status,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt.toISOString(),
      UpdatedAt: entity.UpdatedAt.toISOString(),
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    };
  }
}
