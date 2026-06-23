import { ReplenishmentTaskEntity } from '@modules/InventoryExecution/Domain/Entities/ReplenishmentTaskEntity';
import { ReplenishmentTaskOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/ReplenishmentTaskOrmEntity';

export class ReplenishmentTaskOrmMapper {
  public static ToDomain(entity: ReplenishmentTaskOrmEntity): ReplenishmentTaskEntity {
    return new ReplenishmentTaskEntity({
      ...entity,
      Quantity: Number(entity.Quantity),
      EvidenceRefs: entity.EvidenceRefs ?? [],
      EligibilityDecisionJson: entity.EligibilityDecisionJson ?? null,
    });
  }

  public static ToOrm(entity: ReplenishmentTaskEntity): ReplenishmentTaskOrmEntity {
    const orm = new ReplenishmentTaskOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }
}
