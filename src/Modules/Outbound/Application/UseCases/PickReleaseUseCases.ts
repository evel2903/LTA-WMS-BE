import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ListPickReleasesDto, ReleaseOutboundOrderDto } from '@modules/Outbound/Application/DTOs/PickReleaseDto';
import { PickReleaseLifecycleService } from '@modules/Outbound/Application/Services/PickReleaseLifecycleService';

export class ReleaseOutboundOrderUseCase {
  constructor(private readonly lifecycle: PickReleaseLifecycleService) {}

  public async Execute(request: ReleaseOutboundOrderDto, context: AuditContext) {
    return this.lifecycle.Release(request, context);
  }
}

export class ListPickReleasesUseCase {
  constructor(private readonly lifecycle: PickReleaseLifecycleService) {}

  public async Execute(query: ListPickReleasesDto, actorUserId?: string | null) {
    return this.lifecycle.List(query, actorUserId);
  }
}

export class GetPickReleaseUseCase {
  constructor(private readonly lifecycle: PickReleaseLifecycleService) {}

  public async Execute(id: string, actorUserId?: string | null) {
    return this.lifecycle.Get(id, actorUserId);
  }
}
