import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import {
  AssignDockDto,
  AssignTruckDto,
  ConfirmShipmentDto,
  ListShipmentPackageStagingDto,
  ScanLoadingDto,
  StagePackageDto,
} from '@modules/Shipping/Application/DTOs/ShippingStagingDto';
import { ShippingStagingLifecycleService } from '@modules/Shipping/Application/Services/ShippingStagingLifecycleService';

export class ListShippingStagingUseCase {
  constructor(private readonly lifecycle: ShippingStagingLifecycleService) {}

  public async Execute(query: ListShipmentPackageStagingDto, actorUserId?: string | null) {
    return this.lifecycle.List(query, actorUserId);
  }
}

export class GetShippingStagingUseCase {
  constructor(private readonly lifecycle: ShippingStagingLifecycleService) {}

  public async Execute(id: string, actorUserId?: string | null) {
    return this.lifecycle.Get(id, actorUserId);
  }
}

export class StagePackageUseCase {
  constructor(private readonly lifecycle: ShippingStagingLifecycleService) {}

  public async Execute(request: StagePackageDto, context: AuditContext) {
    return this.lifecycle.StagePackage(request, context);
  }
}

export class AssignDockUseCase {
  constructor(private readonly lifecycle: ShippingStagingLifecycleService) {}

  public async Execute(id: string, request: AssignDockDto, context: AuditContext) {
    return this.lifecycle.AssignDock(id, request, context);
  }
}

export class AssignTruckUseCase {
  constructor(private readonly lifecycle: ShippingStagingLifecycleService) {}

  public async Execute(id: string, request: AssignTruckDto, context: AuditContext) {
    return this.lifecycle.AssignTruck(id, request, context);
  }
}

export class ScanLoadingUseCase {
  constructor(private readonly lifecycle: ShippingStagingLifecycleService) {}

  public async Execute(id: string, request: ScanLoadingDto, context: AuditContext) {
    return this.lifecycle.ScanLoading(id, request, context);
  }
}

export class ConfirmShipmentUseCase {
  constructor(private readonly lifecycle: ShippingStagingLifecycleService) {}

  public async Execute(id: string, request: ConfirmShipmentDto, context: AuditContext) {
    return this.lifecycle.ConfirmShipment(id, request, context);
  }
}
