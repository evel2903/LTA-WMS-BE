import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AllocateOutboundOrderDto, ListAllocationsDto } from '@modules/Outbound/Application/DTOs/AllocationDto';
import { AllocationLifecycleService } from '@modules/Outbound/Application/Services/AllocationLifecycleService';

export class AllocateOutboundOrderUseCase {
  constructor(private readonly lifecycle: AllocationLifecycleService) {}

  public async Execute(request: AllocateOutboundOrderDto, context: AuditContext) {
    return this.lifecycle.Allocate(request, context);
  }
}

export class ListAllocationsUseCase {
  constructor(private readonly lifecycle: AllocationLifecycleService) {}

  public async Execute(query: ListAllocationsDto, actorUserId?: string | null) {
    return this.lifecycle.List(query, actorUserId);
  }
}

export class GetAllocationUseCase {
  constructor(private readonly lifecycle: AllocationLifecycleService) {}

  public async Execute(id: string, actorUserId?: string | null) {
    return this.lifecycle.Get(id, actorUserId);
  }
}
