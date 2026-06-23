import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import {
  CancelReplenishmentTaskDto,
  ConfirmReplenishmentTaskDto,
  InventoryReconciliationFailureResultDto,
  ListReplenishmentTasksDto,
  ListReplenishmentTasksResultDto,
  RecordInventoryReconciliationFailureDto,
  ReleaseReplenishmentTaskDto,
  ReplenishmentMutationResultDto,
} from '@modules/InventoryExecution/Application/DTOs/ReplenishmentTaskDto';
import { ReplenishmentTaskLifecycleService } from '@modules/InventoryExecution/Application/Services/ReplenishmentTaskLifecycleService';

export class ReleaseReplenishmentTaskUseCase {
  constructor(private readonly lifecycle: ReplenishmentTaskLifecycleService) {}

  public async Execute(
    request: ReleaseReplenishmentTaskDto,
    context: AuditContext,
  ): Promise<ReplenishmentMutationResultDto> {
    return await this.lifecycle.Release(request, context);
  }
}

export class ListReplenishmentTasksUseCase {
  constructor(private readonly lifecycle: ReplenishmentTaskLifecycleService) {}

  public async Execute(
    query: ListReplenishmentTasksDto,
    context?: AuditContext,
  ): Promise<ListReplenishmentTasksResultDto> {
    return await this.lifecycle.List(query, context);
  }
}

export class GetReplenishmentTaskUseCase {
  constructor(private readonly lifecycle: ReplenishmentTaskLifecycleService) {}

  public async Execute(id: string, context: AuditContext): Promise<ReplenishmentMutationResultDto> {
    return await this.lifecycle.Get(id, context);
  }
}

export class ConfirmReplenishmentTaskUseCase {
  constructor(private readonly lifecycle: ReplenishmentTaskLifecycleService) {}

  public async Execute(
    request: ConfirmReplenishmentTaskDto,
    context: AuditContext,
  ): Promise<ReplenishmentMutationResultDto> {
    return await this.lifecycle.Confirm(request, context);
  }
}

export class CancelReplenishmentTaskUseCase {
  constructor(private readonly lifecycle: ReplenishmentTaskLifecycleService) {}

  public async Execute(
    request: CancelReplenishmentTaskDto,
    context: AuditContext,
  ): Promise<ReplenishmentMutationResultDto> {
    return await this.lifecycle.Cancel(request, context);
  }
}

export class RecordInventoryReconciliationFailureUseCase {
  constructor(private readonly lifecycle: ReplenishmentTaskLifecycleService) {}

  public async Execute(
    request: RecordInventoryReconciliationFailureDto,
    context: AuditContext,
  ): Promise<InventoryReconciliationFailureResultDto> {
    return await this.lifecycle.RecordReconciliationFailure(request, context);
  }
}
