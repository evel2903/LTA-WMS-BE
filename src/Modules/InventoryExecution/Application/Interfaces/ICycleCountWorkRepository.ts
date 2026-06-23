import { EntityManager } from 'typeorm';
import { CycleCountWorkEntity } from '@modules/InventoryExecution/Domain/Entities/CycleCountWorkEntity';
import { CycleCountWorkStatus } from '@modules/InventoryExecution/Domain/Enums/CycleCountWorkStatus';

export const CYCLE_COUNT_WORK_REPOSITORY = Symbol('ICycleCountWorkRepository');

export interface CycleCountWorkListFilter {
  WarehouseId?: string;
  OwnerId?: string;
  WorkStatus?: CycleCountWorkStatus;
}

export interface ICycleCountWorkRepository {
  Create(work: CycleCountWorkEntity, manager?: EntityManager): Promise<CycleCountWorkEntity>;
  Update(work: CycleCountWorkEntity, manager?: EntityManager): Promise<CycleCountWorkEntity>;
  FindById(id: string, manager?: EntityManager): Promise<CycleCountWorkEntity | null>;
  FindByIdForUpdate(id: string, manager: EntityManager): Promise<CycleCountWorkEntity | null>;
  FindByCreateIdempotencyKey(idempotencyKey: string, manager?: EntityManager): Promise<CycleCountWorkEntity | null>;
  List(
    skip: number,
    take: number,
    filter?: CycleCountWorkListFilter,
  ): Promise<{ Items: CycleCountWorkEntity[]; TotalItems: number }>;
}
