import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import {
  ImportOutboundOrderDto,
  ListOutboundOrdersDto,
  ReasonOutboundOrderDto,
} from '@modules/Outbound/Application/DTOs/OutboundOrderDto';
import { OutboundOrderLifecycleService } from '@modules/Outbound/Application/Services/OutboundOrderLifecycleService';

export class ImportOutboundOrderUseCase {
  constructor(private readonly lifecycle: OutboundOrderLifecycleService) {}

  public async Execute(request: ImportOutboundOrderDto, context: AuditContext) {
    return this.lifecycle.Import(request, context);
  }
}

export class ListOutboundOrdersUseCase {
  constructor(private readonly lifecycle: OutboundOrderLifecycleService) {}

  public async Execute(query: ListOutboundOrdersDto, actorUserId?: string | null) {
    return this.lifecycle.List(query, actorUserId);
  }
}

export class GetOutboundOrderUseCase {
  constructor(private readonly lifecycle: OutboundOrderLifecycleService) {}

  public async Execute(id: string, actorUserId?: string | null) {
    return this.lifecycle.Get(id, actorUserId);
  }
}

export class ValidateOutboundOrderUseCase {
  constructor(private readonly lifecycle: OutboundOrderLifecycleService) {}

  public async Execute(id: string, context: AuditContext) {
    return this.lifecycle.Validate(id, context);
  }
}

export class HoldOutboundOrderUseCase {
  constructor(private readonly lifecycle: OutboundOrderLifecycleService) {}

  public async Execute(request: ReasonOutboundOrderDto, context: AuditContext) {
    return this.lifecycle.Hold(request, context);
  }
}

export class RejectOutboundOrderUseCase {
  constructor(private readonly lifecycle: OutboundOrderLifecycleService) {}

  public async Execute(request: ReasonOutboundOrderDto, context: AuditContext) {
    return this.lifecycle.Reject(request, context);
  }
}

export class CancelOutboundOrderUseCase {
  constructor(private readonly lifecycle: OutboundOrderLifecycleService) {}

  public async Execute(request: ReasonOutboundOrderDto, context: AuditContext) {
    return this.lifecycle.Cancel(request, context);
  }
}
