import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SiteOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SiteOrmEntity';

export class SiteOrmMapper {
  public static ToDomain(entity: SiteOrmEntity): SiteEntity {
    return new SiteEntity({
      Id: entity.Id,
      SiteCode: entity.SiteCode,
      SiteName: entity.SiteName,
      Status: entity.Status as MasterDataStatus,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: SiteEntity): SiteOrmEntity {
    const orm = new SiteOrmEntity();
    orm.Id = entity.Id;
    orm.SiteCode = entity.SiteCode;
    orm.SiteName = entity.SiteName;
    orm.Status = entity.Status;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
