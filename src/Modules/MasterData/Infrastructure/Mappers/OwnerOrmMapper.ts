import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { OwnerOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/OwnerOrmEntity';

export class OwnerOrmMapper {
  public static ToDomain(entity: OwnerOrmEntity): OwnerEntity {
    return new OwnerEntity({
      Id: entity.Id,
      OwnerCode: entity.OwnerCode,
      OwnerName: entity.OwnerName,
      Status: entity.Status as MasterDataStatus,
      BillingPolicy: entity.BillingPolicy,
      VisibilityScope: entity.VisibilityScope,
      SourceSystem: entity.SourceSystem,
      ReferenceId: entity.ReferenceId,
      CreatedAt: entity.CreatedAt,
      UpdatedAt: entity.UpdatedAt,
      CreatedBy: entity.CreatedBy,
      UpdatedBy: entity.UpdatedBy,
    });
  }

  public static ToOrm(entity: OwnerEntity): OwnerOrmEntity {
    const orm = new OwnerOrmEntity();
    orm.Id = entity.Id;
    orm.OwnerCode = entity.OwnerCode;
    orm.OwnerName = entity.OwnerName;
    orm.Status = entity.Status;
    orm.BillingPolicy = entity.BillingPolicy;
    orm.VisibilityScope = entity.VisibilityScope;
    orm.SourceSystem = entity.SourceSystem;
    orm.ReferenceId = entity.ReferenceId;
    orm.CreatedAt = entity.CreatedAt;
    orm.UpdatedAt = entity.UpdatedAt;
    orm.CreatedBy = entity.CreatedBy;
    orm.UpdatedBy = entity.UpdatedBy;
    return orm;
  }
}
