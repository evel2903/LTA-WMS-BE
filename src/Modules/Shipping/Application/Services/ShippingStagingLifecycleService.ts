import { createHash, randomUUID } from 'crypto';
import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import {
  BusinessRuleException,
  ConflictException,
  ForbiddenAppException,
  NotFoundException,
} from '@common/Exceptions/AppException';
import { AuditContext, MergeAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { IPackingRepository } from '@modules/Outbound/Application/Interfaces/IPackingRepository';
import { PackageEntity } from '@modules/Outbound/Domain/Entities/PackageEntity';
import { PackageStatus } from '@modules/Outbound/Domain/Enums/PackageStatus';
import {
  AssignDockDto,
  AssignTruckDto,
  ListShipmentPackageStagingDto,
  StagePackageDto,
} from '@modules/Shipping/Application/DTOs/ShippingStagingDto';
import { IShippingStagingRepository } from '@modules/Shipping/Application/Interfaces/IShippingStagingRepository';
import { ShippingStagingDtoMapper } from '@modules/Shipping/Application/Mappers/ShippingStagingDtoMapper';
import { ShipmentPackageStagingEntity } from '@modules/Shipping/Domain/Entities/ShipmentPackageStagingEntity';
import { ShipmentPackageStagingStatus } from '@modules/Shipping/Domain/Enums/ShipmentPackageStagingStatus';

const DEFAULT_REASON_CODE = 'RC-V1-DISCREPANCY';
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const STAGED_INVENTORY_STATUS = 'STAGED';

interface NormalizedStagePackage extends StagePackageDto {
  PackageId: string;
  ShipmentReference: string | null;
  StagingLaneCode: string;
  StagingLocationId: string | null;
  StagingLocationCode: string | null;
  ReasonCode: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
}

interface NormalizedAssignDock extends AssignDockDto {
  DockDoorId: string | null;
  DockDoorCode: string | null;
  ReasonCode: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
}

interface NormalizedAssignTruck extends AssignTruckDto {
  TruckReference: string | null;
  VehicleNumber: string | null;
  DriverName: string | null;
  CarrierId: string | null;
  CarrierCode: string | null;
  ReasonCode: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
}

export class ShippingStagingLifecycleService {
  constructor(
    private readonly stagings: IShippingStagingRepository,
    private readonly packing: IPackingRepository,
    private readonly coreFlows: ICoreFlowRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async List(query: ListShipmentPackageStagingDto, actorUserId?: string | null) {
    this.AssertPageSize(query.PageSize);
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: DEFAULT_PAGE_SIZE, MaxPageSize: MAX_PAGE_SIZE },
    );
    const filters = {
      WarehouseId: query.WarehouseId,
      OwnerId: query.OwnerId,
      Status: query.Status,
      PackageId: query.PackageId,
      OutboundOrderId: query.OutboundOrderId,
      ShipmentReference: query.ShipmentReference,
    };
    const allowed: ShipmentPackageStagingEntity[] = [];
    let inspected = 0;
    let totalItems = 0;
    do {
      const result = await this.stagings.List(inspected, paging.Take, filters);
      totalItems = result.TotalItems;
      inspected += result.Items.length;
      for (const item of result.Items) {
        if (await this.CheckPermission(actorUserId, ActionCode.Read, item)) allowed.push(item);
      }
      if (result.Items.length === 0) break;
    } while (inspected < totalItems);
    const pageItems = allowed.slice(paging.Skip, paging.Skip + paging.Take);
    return ToPagedResult(pageItems.map(ShippingStagingDtoMapper.ToDto), allowed.length, paging.Page, paging.PageSize);
  }

  private async FailMissingPackageWithAudit(context: AuditContext, packageId: string): Promise<never> {
    await this.audited.Run(async () => ({
      result: null,
      entry: MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Shipment,
        ObjectId: packageId,
        AfterJson: { Decision: 'Blocked', Reason: 'Package not found', PackageId: packageId },
        ReferenceType: 'PackageStagingGate',
        ReferenceId: packageId,
        Result: AuditResult.Failed,
      }),
    }));
    throw new NotFoundException('Package not found', { PackageId: packageId });
  }

  private async AssertStagingLocationMatchesLane(
    request: NormalizedStagePackage,
    context: AuditContext,
    pack: PackageEntity,
  ): Promise<void> {
    if (!request.StagingLocationCode) return;
    const lane = request.StagingLaneCode.toUpperCase();
    const location = request.StagingLocationCode.toUpperCase();
    if (location === lane || location.startsWith(`${lane}-`) || location.startsWith(`${lane}/`)) return;
    await this.FailWithAudit(context, pack, 'Staging location must belong to staging lane', {
      PackageId: pack.Id,
      StagingLaneCode: request.StagingLaneCode,
      StagingLocationCode: request.StagingLocationCode,
    });
  }

  private BuildCoreFlowMilestoneMetadata(
    coreFlow: { Id: string } | null,
    status: 'Recorded' | 'UnresolvedNonBlocking' | 'FailedNonBlocking',
    error?: unknown,
  ): Record<string, unknown> {
    if (!coreFlow) return { Status: 'UnresolvedNonBlocking' };
    const metadata: Record<string, unknown> = { Status: status, CoreFlowInstanceId: coreFlow.Id };
    if (error instanceof Error) metadata.ErrorMessage = error.message;
    return metadata;
  }

  private BuildCoreFlowAuditMetadata(coreFlowMilestone: Record<string, unknown>): Record<string, unknown> {
    return {
      CoreFlowMilestone: coreFlowMilestone,
    };
  }

  private BuildStagingAuditAfterJson(
    staging: ShipmentPackageStagingEntity,
    coreFlowMilestone: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      Staging: ShippingStagingDtoMapper.ToDto(staging),
      ...this.BuildCoreFlowAuditMetadata(coreFlowMilestone),
    };
  }

  private BuildDockTruckAuditAfterJson(
    staging: ShipmentPackageStagingEntity,
    coreFlowMilestone: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      Staging: ShippingStagingDtoMapper.ToDto(staging),
      ...this.BuildCoreFlowAuditMetadata(coreFlowMilestone),
    };
  }

  public async Get(id: string, actorUserId?: string | null) {
    const staging = await this.LoadStaging(id);
    await this.AssertPermission(actorUserId, ActionCode.Read, staging);
    return ShippingStagingDtoMapper.ToDto(staging);
  }

  public async StagePackage(request: StagePackageDto, context: AuditContext) {
    const normalized = this.NormalizeStagePackage(request);
    this.AssertActor(context);
    const aggregate = await this.packing.FindPackageById(normalized.PackageId);
    if (!aggregate) {
      return await this.FailMissingPackageWithAudit(context, normalized.PackageId);
    }
    const pack = aggregate.Package;
    await this.AssertPermission(context.ActorUserId, ActionCode.Create, pack);

    if (pack.Status !== PackageStatus.ReadyForStaging) {
      await this.FailWithAudit(context, pack, 'Package must be ReadyForStaging before staging', {
        PackageId: pack.Id,
        PackageStatus: pack.Status,
      });
    }
    await this.AssertStagingLocationMatchesLane(normalized, context, pack);

    const fingerprint = this.Hash({
      Operation: 'StagePackage',
      PackageId: normalized.PackageId,
      ShipmentReference: normalized.ShipmentReference,
      StagingLaneCode: normalized.StagingLaneCode,
      StagingLocationId: normalized.StagingLocationId,
      StagingLocationCode: normalized.StagingLocationCode,
      ReasonCode: normalized.ReasonCode,
      ReasonNote: normalized.ReasonNote,
      EvidenceRefs: normalized.EvidenceRefs,
    });
    const existingByKey = await this.stagings.FindByStageIdempotencyKey(normalized.IdempotencyKey);
    if (existingByKey) {
      this.AssertSameFingerprint(
        existingByKey.StagePayloadFingerprint,
        fingerprint,
        'Package staging idempotency key already used',
      );
      return ShippingStagingDtoMapper.ToDto(existingByKey);
    }
    const existingPackage = await this.stagings.FindByPackageId(pack.Id);
    if (existingPackage) throw new ConflictException('Package already staged', { PackageId: pack.Id });

    const reason = await this.ValidateReason(normalized.ReasonCode, ActionCode.Create, normalized.EvidenceRefs);
    const coreFlow = await this.ResolveCoreFlow(pack);
    let coreFlowMilestone = this.BuildCoreFlowMilestoneMetadata(
      coreFlow,
      coreFlow ? 'Recorded' : 'UnresolvedNonBlocking',
    );
    const now = new Date();
    const staging = new ShipmentPackageStagingEntity({
      Id: randomUUID(),
      StagingCode: this.BuildCode('STG'),
      PackageId: pack.Id,
      PackageCode: pack.PackageCode,
      OutboundOrderId: pack.OutboundOrderId,
      WarehouseProfileId: pack.WarehouseProfileId,
      WarehouseId: pack.WarehouseId,
      WarehouseCode: pack.WarehouseCode,
      OwnerId: pack.OwnerId,
      OwnerCode: pack.OwnerCode,
      Status: ShipmentPackageStagingStatus.Staged,
      InventoryStatusCode: STAGED_INVENTORY_STATUS,
      ShipmentReference: normalized.ShipmentReference,
      StagingLaneCode: normalized.StagingLaneCode,
      StagingLocationId: normalized.StagingLocationId,
      StagingLocationCode: normalized.StagingLocationCode,
      CoreFlowInstanceId: coreFlow?.Id ?? null,
      StageIdempotencyKey: normalized.IdempotencyKey,
      StagePayloadFingerprint: fingerprint,
      ReasonCode: normalized.ReasonCode,
      ReasonCodeId: reason.ReasonCodeId,
      ReasonNote: normalized.ReasonNote,
      EvidenceRefs: normalized.EvidenceRefs,
      StagedAt: now,
      StagedBy: context.ActorUserId,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: context.ActorUserId,
      UpdatedBy: context.ActorUserId,
    });

    try {
      const saved = await this.audited.Run<ShipmentPackageStagingEntity>(async (manager) => {
        const created = await this.stagings.Create(staging, manager);
        if (coreFlow) {
          try {
            await this.coreFlows.CreateMilestone(
              this.BuildMilestone(
                coreFlow.Id,
                CoreFlowStepCode.PackageStaged,
                STAGED_INVENTORY_STATUS,
                {
                  PackageId: pack.Id,
                  PackageCode: pack.PackageCode,
                  StagingId: created.Id,
                  StagingLaneCode: created.StagingLaneCode,
                },
                context.ActorUserId,
              ),
              manager,
            );
          } catch (error) {
            coreFlowMilestone = this.BuildCoreFlowMilestoneMetadata(coreFlow, 'FailedNonBlocking', error);
          }
        }
        return {
          result: created,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Create,
            ObjectType: ObjectType.Shipment,
            ObjectId: created.Id,
            ObjectCode: created.StagingCode,
            AfterJson: this.BuildStagingAuditAfterJson(created, coreFlowMilestone),
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: normalized.ReasonNote ?? normalized.ReasonCode,
            EvidenceRefs: normalized.EvidenceRefs,
            ReferenceType: 'PackageStaging',
            ReferenceId: created.Id,
            WarehouseId: created.WarehouseId,
            OwnerId: created.OwnerId,
            Result: AuditResult.Success,
          }),
        };
      });
      return ShippingStagingDtoMapper.ToDto(saved);
    } catch (error) {
      const duplicate = await this.LoadStageDuplicateAfterUniqueViolation(
        error,
        normalized.IdempotencyKey,
        fingerprint,
        pack.Id,
      );
      if (!duplicate) throw error;
      return ShippingStagingDtoMapper.ToDto(duplicate);
    }
  }

  public async AssignDock(id: string, request: AssignDockDto, context: AuditContext) {
    const normalized = this.NormalizeAssignDock(request);
    this.AssertActor(context);
    const staging = await this.LoadStaging(id);
    await this.AssertPermission(context.ActorUserId, ActionCode.Update, staging);
    const fingerprint = this.Hash({
      Operation: 'AssignDock',
      StagingId: staging.Id,
      DockDoorId: normalized.DockDoorId,
      DockDoorCode: normalized.DockDoorCode,
      ReasonCode: normalized.ReasonCode,
      ReasonNote: normalized.ReasonNote,
      EvidenceRefs: normalized.EvidenceRefs,
    });
    if (staging.DockIdempotencyKey === normalized.IdempotencyKey) {
      this.AssertSameFingerprint(staging.DockPayloadFingerprint, fingerprint, 'Dock idempotency key already used');
      return ShippingStagingDtoMapper.ToDto(staging);
    }
    this.AssertDockNotAssigned(staging);
    const reason = await this.ValidateReason(normalized.ReasonCode, ActionCode.Update, normalized.EvidenceRefs);

    const saved = await this.audited.Run<ShipmentPackageStagingEntity>(async (manager) => {
      const locked = await this.stagings.FindByIdForUpdate(staging.Id, manager);
      if (!locked) throw new NotFoundException('Package staging not found', { StagingId: staging.Id });
      if (locked.DockIdempotencyKey === normalized.IdempotencyKey) {
        this.AssertSameFingerprint(locked.DockPayloadFingerprint, fingerprint, 'Dock idempotency key already used');
        return {
          result: locked,
          entry: this.BuildDuplicateAudit(context, locked, 'DockAssignment'),
        };
      }
      this.AssertStagingMutable(locked);
      this.AssertDockNotAssigned(locked);
      locked.DockDoorId = normalized.DockDoorId;
      locked.DockDoorCode = normalized.DockDoorCode;
      locked.DockIdempotencyKey = normalized.IdempotencyKey;
      locked.DockPayloadFingerprint = fingerprint;
      locked.ReasonCode = normalized.ReasonCode;
      locked.ReasonCodeId = reason.ReasonCodeId;
      locked.ReasonNote = normalized.ReasonNote;
      locked.EvidenceRefs = normalized.EvidenceRefs;
      locked.DockAssignedAt = new Date();
      locked.DockAssignedBy = context.ActorUserId;
      locked.UpdatedAt = new Date();
      locked.UpdatedBy = context.ActorUserId;
      locked.RefreshStatus();
      const updated = await this.stagings.Update(locked, manager);
      const coreFlowMilestone = await this.RecordDockTruckMilestone(updated, context, manager);
      return {
        result: updated,
        entry: this.BuildMutationAudit(
          context,
          updated,
          ActionCode.Update,
          reason.ReasonCodeId,
          normalized,
          coreFlowMilestone,
        ),
      };
    });
    return ShippingStagingDtoMapper.ToDto(saved);
  }

  public async AssignTruck(id: string, request: AssignTruckDto, context: AuditContext) {
    const normalized = this.NormalizeAssignTruck(request);
    this.AssertActor(context);
    const staging = await this.LoadStaging(id);
    await this.AssertPermission(context.ActorUserId, ActionCode.Update, staging);
    const fingerprint = this.Hash({
      Operation: 'AssignTruck',
      StagingId: staging.Id,
      TruckReference: normalized.TruckReference,
      VehicleNumber: normalized.VehicleNumber,
      DriverName: normalized.DriverName,
      CarrierId: normalized.CarrierId,
      CarrierCode: normalized.CarrierCode,
      ReasonCode: normalized.ReasonCode,
      ReasonNote: normalized.ReasonNote,
      EvidenceRefs: normalized.EvidenceRefs,
    });
    if (staging.TruckIdempotencyKey === normalized.IdempotencyKey) {
      this.AssertSameFingerprint(staging.TruckPayloadFingerprint, fingerprint, 'Truck idempotency key already used');
      return ShippingStagingDtoMapper.ToDto(staging);
    }
    this.AssertTruckNotAssigned(staging);
    const reason = await this.ValidateReason(normalized.ReasonCode, ActionCode.Update, normalized.EvidenceRefs);

    const saved = await this.audited.Run<ShipmentPackageStagingEntity>(async (manager) => {
      const locked = await this.stagings.FindByIdForUpdate(staging.Id, manager);
      if (!locked) throw new NotFoundException('Package staging not found', { StagingId: staging.Id });
      if (locked.TruckIdempotencyKey === normalized.IdempotencyKey) {
        this.AssertSameFingerprint(locked.TruckPayloadFingerprint, fingerprint, 'Truck idempotency key already used');
        return {
          result: locked,
          entry: this.BuildDuplicateAudit(context, locked, 'TruckAssignment'),
        };
      }
      this.AssertStagingMutable(locked);
      this.AssertTruckNotAssigned(locked);
      locked.TruckReference = normalized.TruckReference;
      locked.VehicleNumber = normalized.VehicleNumber;
      locked.DriverName = normalized.DriverName;
      locked.CarrierId = normalized.CarrierId;
      locked.CarrierCode = normalized.CarrierCode;
      locked.TruckIdempotencyKey = normalized.IdempotencyKey;
      locked.TruckPayloadFingerprint = fingerprint;
      locked.ReasonCode = normalized.ReasonCode;
      locked.ReasonCodeId = reason.ReasonCodeId;
      locked.ReasonNote = normalized.ReasonNote;
      locked.EvidenceRefs = normalized.EvidenceRefs;
      locked.TruckAssignedAt = new Date();
      locked.TruckAssignedBy = context.ActorUserId;
      locked.UpdatedAt = new Date();
      locked.UpdatedBy = context.ActorUserId;
      locked.RefreshStatus();
      const updated = await this.stagings.Update(locked, manager);
      const coreFlowMilestone = await this.RecordDockTruckMilestone(updated, context, manager);
      return {
        result: updated,
        entry: this.BuildMutationAudit(
          context,
          updated,
          ActionCode.Update,
          reason.ReasonCodeId,
          normalized,
          coreFlowMilestone,
        ),
      };
    });
    return ShippingStagingDtoMapper.ToDto(saved);
  }

  private async ResolveCoreFlow(pack: PackageEntity) {
    if (!pack.WarehouseCode) return null;
    return this.coreFlows.FindInstanceByBusinessReference(
      pack.OutboundOrderId,
      pack.WarehouseCode,
      pack.OwnerCode ?? undefined,
    );
  }

  private BuildMilestone(
    coreFlowInstanceId: string,
    stepCode: CoreFlowStepCode,
    inventoryStatusCode: string | null,
    metadata: Record<string, unknown>,
    actorUserId?: string | null,
  ): WorkflowMilestoneEntity {
    return new WorkflowMilestoneEntity({
      Id: randomUUID(),
      CoreFlowInstanceId: coreFlowInstanceId,
      StageCode: CoreFlowStageCode.Shipping,
      StepCode: stepCode,
      MilestoneStatus: WorkflowMilestoneStatus.Completed,
      InventoryStatusCode: inventoryStatusCode,
      Metadata: metadata,
      OccurredAt: new Date(),
      CreatedBy: actorUserId ?? null,
    });
  }

  private async RecordDockTruckMilestone(
    staging: ShipmentPackageStagingEntity,
    context: AuditContext,
    manager: Parameters<ICoreFlowRepository['CreateMilestone']>[1],
  ): Promise<Record<string, unknown>> {
    if (!staging.CoreFlowInstanceId) return { Status: 'UnresolvedNonBlocking' };
    try {
      await this.coreFlows.CreateMilestone(
        this.BuildMilestone(
          staging.CoreFlowInstanceId,
          CoreFlowStepCode.DockTruckMilestoneRecorded,
          null,
          {
            StagingId: staging.Id,
            PackageId: staging.PackageId,
            DockDoorCode: staging.DockDoorCode,
            TruckReference: staging.TruckReference,
            VehicleNumber: staging.VehicleNumber,
            Status: staging.Status,
          },
          context.ActorUserId,
        ),
        manager,
      );
      return { Status: 'Recorded', CoreFlowInstanceId: staging.CoreFlowInstanceId };
    } catch (error) {
      return this.BuildCoreFlowMilestoneMetadata({ Id: staging.CoreFlowInstanceId }, 'FailedNonBlocking', error);
    }
  }

  private async LoadStaging(id: string): Promise<ShipmentPackageStagingEntity> {
    const staging = await this.stagings.FindById(id?.trim() ?? '');
    if (!staging) throw new NotFoundException('Package staging not found', { StagingId: id });
    return staging;
  }

  private async ValidateReason(reasonCode: string, action: ActionCode, evidenceRefs: string[]) {
    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: reasonCode,
      Action: action,
      ObjectType: ObjectType.Shipment,
    });
    if (reason.EvidenceRequired && evidenceRefs.length === 0) {
      throw new BusinessRuleException('EvidenceRefs are required for shipment staging reason');
    }
    return reason;
  }

  private async AssertPermission(
    actorUserId: string | null | undefined,
    action: ActionCode,
    target: ShipmentPackageStagingEntity | PackageEntity,
  ): Promise<void> {
    if (!actorUserId) throw new ForbiddenAppException('Authenticated actor is required');
    if (!(await this.CheckPermission(actorUserId, action, target))) {
      throw new ForbiddenAppException('Permission denied for shipment action', {
        Action: action,
        ObjectType: ObjectType.Shipment,
      });
    }
  }

  private async CheckPermission(
    actorUserId: string | null | undefined,
    action: ActionCode,
    target: ShipmentPackageStagingEntity | PackageEntity,
  ): Promise<boolean> {
    if (!actorUserId || !this.permissionChecker) return Boolean(actorUserId);
    const decision = await this.permissionChecker.Check({
      UserId: actorUserId,
      Action: action,
      ObjectType: ObjectType.Shipment,
      Scope: { WarehouseId: target.WarehouseId, OwnerId: target.OwnerId },
    });
    return decision.Allowed;
  }

  private async FailWithAudit(
    context: AuditContext,
    pack: PackageEntity,
    reason: string,
    details: Record<string, unknown>,
  ): Promise<never> {
    await this.audited.Run(async () => ({
      result: null,
      entry: MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Shipment,
        ObjectId: pack.Id,
        ObjectCode: pack.PackageCode,
        AfterJson: { Decision: 'Blocked', Reason: reason, ...details },
        ReferenceType: 'PackageStagingGate',
        ReferenceId: pack.Id,
        WarehouseId: pack.WarehouseId,
        OwnerId: pack.OwnerId,
        Result: AuditResult.Failed,
      }),
    }));
    throw new BusinessRuleException(reason, details);
  }

  private BuildMutationAudit(
    context: AuditContext,
    staging: ShipmentPackageStagingEntity,
    action: ActionCode,
    reasonCodeId: string,
    request: NormalizedAssignDock | NormalizedAssignTruck,
    coreFlowMilestone: Record<string, unknown>,
  ) {
    return MergeAuditContext(context, {
      Action: action,
      ObjectType: ObjectType.Shipment,
      ObjectId: staging.Id,
      ObjectCode: staging.StagingCode,
      AfterJson: this.BuildDockTruckAuditAfterJson(staging, coreFlowMilestone),
      ReasonCodeId: reasonCodeId,
      ReasonNote: request.ReasonNote ?? request.ReasonCode,
      EvidenceRefs: request.EvidenceRefs,
      ReferenceType: 'ShippingMilestone',
      ReferenceId: staging.Id,
      WarehouseId: staging.WarehouseId,
      OwnerId: staging.OwnerId,
      Result: AuditResult.Success,
    });
  }

  private BuildDuplicateAudit(context: AuditContext, staging: ShipmentPackageStagingEntity, referenceType: string) {
    return MergeAuditContext(context, {
      Action: ActionCode.Read,
      ObjectType: ObjectType.Shipment,
      ObjectId: staging.Id,
      ObjectCode: staging.StagingCode,
      AfterJson: { IsDuplicate: true, Status: staging.Status },
      ReferenceType: referenceType,
      ReferenceId: staging.Id,
      WarehouseId: staging.WarehouseId,
      OwnerId: staging.OwnerId,
      Result: AuditResult.Success,
    });
  }

  private AssertStagingMutable(staging: ShipmentPackageStagingEntity): void {
    if (
      staging.Status === ShipmentPackageStagingStatus.Blocked ||
      staging.Status === ShipmentPackageStagingStatus.ReadyForLoading
    ) {
      throw new BusinessRuleException('Package staging is blocked', { StagingId: staging.Id });
    }
  }

  private AssertDockNotAssigned(staging: ShipmentPackageStagingEntity): void {
    if (staging.DockDoorId || staging.DockDoorCode) {
      throw new ConflictException('Dock milestone already assigned', { StagingId: staging.Id });
    }
  }

  private AssertTruckNotAssigned(staging: ShipmentPackageStagingEntity): void {
    if (staging.TruckReference || staging.VehicleNumber) {
      throw new ConflictException('Truck milestone already assigned', { StagingId: staging.Id });
    }
  }

  private AssertActor(context: AuditContext): void {
    if (!context.ActorUserId) throw new ForbiddenAppException('Authenticated actor is required');
  }

  private AssertPageSize(pageSize?: number): void {
    if (pageSize !== undefined && Number(pageSize) > MAX_PAGE_SIZE) {
      throw new BusinessRuleException('PageSize must not be greater than 100');
    }
  }

  private NormalizeStagePackage(request: StagePackageDto): NormalizedStagePackage {
    const normalized = {
      ...request,
      PackageId: request.PackageId?.trim() ?? '',
      ShipmentReference: request.ShipmentReference?.trim() || null,
      StagingLaneCode: request.StagingLaneCode?.trim() ?? '',
      StagingLocationId: request.StagingLocationId?.trim() || null,
      StagingLocationCode: request.StagingLocationCode?.trim() || null,
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || DEFAULT_REASON_CODE,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!normalized.PackageId) throw new BusinessRuleException('PackageId is required');
    if (!normalized.StagingLaneCode) throw new BusinessRuleException('StagingLaneCode is required');
    if (!normalized.IdempotencyKey) throw new BusinessRuleException('IdempotencyKey is required for package staging');
    return normalized;
  }

  private NormalizeAssignDock(request: AssignDockDto): NormalizedAssignDock {
    const normalized = {
      ...request,
      DockDoorId: request.DockDoorId?.trim() || null,
      DockDoorCode: request.DockDoorCode?.trim() || null,
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || DEFAULT_REASON_CODE,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!normalized.DockDoorId && !normalized.DockDoorCode) {
      throw new BusinessRuleException('DockDoorId or DockDoorCode is required');
    }
    if (!normalized.IdempotencyKey) throw new BusinessRuleException('IdempotencyKey is required for dock assignment');
    return normalized;
  }

  private NormalizeAssignTruck(request: AssignTruckDto): NormalizedAssignTruck {
    const normalized = {
      ...request,
      TruckReference: request.TruckReference?.trim() || null,
      VehicleNumber: request.VehicleNumber?.trim() || null,
      DriverName: request.DriverName?.trim() || null,
      CarrierId: request.CarrierId?.trim() || null,
      CarrierCode: request.CarrierCode?.trim() || null,
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || DEFAULT_REASON_CODE,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!normalized.TruckReference && !normalized.VehicleNumber) {
      throw new BusinessRuleException('TruckReference or VehicleNumber is required');
    }
    if (!normalized.IdempotencyKey) throw new BusinessRuleException('IdempotencyKey is required for truck assignment');
    return normalized;
  }

  private NormalizeEvidence(value?: string[] | null): string[] {
    return (value ?? []).map((item) => item.trim()).filter(Boolean);
  }

  private async LoadStageDuplicateAfterUniqueViolation(
    error: unknown,
    idempotencyKey: string,
    fingerprint: string,
    packageId: string,
  ): Promise<ShipmentPackageStagingEntity | null> {
    if (!this.IsUniqueViolation(error)) return null;
    const duplicateByKey = await this.stagings.FindByStageIdempotencyKey(idempotencyKey);
    if (duplicateByKey) {
      this.AssertSameFingerprint(
        duplicateByKey.StagePayloadFingerprint,
        fingerprint,
        'Package staging idempotency key already used',
      );
      return duplicateByKey;
    }
    const duplicateByPackage = await this.stagings.FindByPackageId(packageId);
    if (duplicateByPackage) throw new ConflictException('Package already staged', { PackageId: packageId });
    return null;
  }

  private IsUniqueViolation(error: unknown): boolean {
    const record = error as {
      code?: unknown;
      errno?: unknown;
      message?: unknown;
      driverError?: { code?: unknown; errno?: unknown; message?: unknown };
    };
    const code = String(record?.code ?? record?.driverError?.code ?? record?.errno ?? record?.driverError?.errno ?? '');
    const message = String(record?.message ?? record?.driverError?.message ?? '');
    return (
      code === '23505' ||
      code === 'SQLITE_CONSTRAINT' ||
      code === '1062' ||
      /duplicate key|unique constraint|unique violation/i.test(message)
    );
  }

  private AssertSameFingerprint(actual: string | null, expected: string, message: string): void {
    if (actual !== expected) throw new ConflictException(message);
  }

  private BuildCode(prefix: string): string {
    return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private Hash(payload: unknown): string {
    return createHash('sha256').update(this.StableStringify(payload)).digest('hex');
  }

  private StableStringify(value: unknown): string {
    if (value instanceof Date) return JSON.stringify(value.toISOString());
    if (Array.isArray(value)) return `[${value.map((item) => this.StableStringify(item)).join(',')}]`;
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${this.StableStringify(record[key])}`)
        .join(',')}}`;
    }
    return JSON.stringify(value);
  }
}
