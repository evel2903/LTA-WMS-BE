import { CycleCountWorkEntity } from '@modules/InventoryExecution/Domain/Entities/CycleCountWorkEntity';
import { CycleCountWorkOrmEntity } from '@modules/InventoryExecution/Infrastructure/Persistence/Entities/CycleCountWorkOrmEntity';

export class CycleCountWorkOrmMapper {
  public static ToDomain(entity: CycleCountWorkOrmEntity): CycleCountWorkEntity {
    return new CycleCountWorkEntity({
      ...entity,
      ExpectedQuantity: Number(entity.ExpectedQuantity),
      CountedQuantity: entity.CountedQuantity === null ? null : Number(entity.CountedQuantity),
      VarianceQuantity: entity.VarianceQuantity === null ? null : Number(entity.VarianceQuantity),
      ToleranceQuantity: Number(entity.ToleranceQuantity),
      EvidenceRefs: entity.EvidenceRefs ?? [],
    });
  }

  public static ToOrm(entity: CycleCountWorkEntity): CycleCountWorkOrmEntity {
    const orm = new CycleCountWorkOrmEntity();
    Object.assign(orm, entity);
    return orm;
  }
}
