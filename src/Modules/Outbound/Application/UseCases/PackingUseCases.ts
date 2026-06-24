import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import {
  ClosePackageDto,
  CreatePackageDto,
  ListPackagesDto,
  ReadyForStagingDto,
  RecordPackCheckDto,
  StartPackSessionDto,
} from '@modules/Outbound/Application/DTOs/PackingDto';
import { PackingLifecycleService } from '@modules/Outbound/Application/Services/PackingLifecycleService';

export class ListPackagesUseCase {
  constructor(private readonly lifecycle: PackingLifecycleService) {}

  public async Execute(query: ListPackagesDto, actorUserId?: string | null) {
    return this.lifecycle.List(query, actorUserId);
  }
}

export class GetPackageUseCase {
  constructor(private readonly lifecycle: PackingLifecycleService) {}

  public async Execute(id: string, actorUserId?: string | null) {
    return this.lifecycle.Get(id, actorUserId);
  }
}

export class StartPackSessionUseCase {
  constructor(private readonly lifecycle: PackingLifecycleService) {}

  public async Execute(request: StartPackSessionDto, context: AuditContext) {
    return this.lifecycle.StartSession(request, context);
  }
}

export class RecordPackCheckUseCase {
  constructor(private readonly lifecycle: PackingLifecycleService) {}

  public async Execute(sessionId: string, request: RecordPackCheckDto, context: AuditContext) {
    return this.lifecycle.RecordCheck(sessionId, request, context);
  }
}

export class CreatePackageUseCase {
  constructor(private readonly lifecycle: PackingLifecycleService) {}

  public async Execute(request: CreatePackageDto, context: AuditContext) {
    return this.lifecycle.CreatePackage(request, context);
  }
}

export class ClosePackageUseCase {
  constructor(private readonly lifecycle: PackingLifecycleService) {}

  public async Execute(id: string, request: ClosePackageDto, context: AuditContext) {
    return this.lifecycle.ClosePackage(id, request, context);
  }
}

export class MarkPackageReadyForStagingUseCase {
  constructor(private readonly lifecycle: PackingLifecycleService) {}

  public async Execute(id: string, request: ReadyForStagingDto, context: AuditContext) {
    return this.lifecycle.MarkReadyForStaging(id, request, context);
  }
}
