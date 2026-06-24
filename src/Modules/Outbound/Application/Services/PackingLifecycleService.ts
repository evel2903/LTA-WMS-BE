import { createHash, randomUUID } from 'crypto';
import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import {
  BusinessRuleException,
  ConflictException,
  ForbiddenAppException,
  NotFoundException,
} from '@common/Exceptions/AppException';
import { AuditContext, MergeAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IControlExceptionCatalog } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { LabelBlockingValidationResultDto } from '@modules/BarcodeLabel/Application/DTOs/LabelBlockingValidationDto';
import { ValidateLabelBlockingUseCase } from '@modules/BarcodeLabel/Application/UseCases/ValidateLabelBlockingUseCase';
import { LabelBlockingDownstreamAction } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingDownstreamAction';
import {
  ClosePackageDto,
  CreatePackageDto,
  ListPackagesDto,
  PackageDto,
  ReadyForStagingDto,
  ReadyForStagingResultDto,
  RecordPackCheckDto,
  StartPackSessionDto,
} from '@modules/Outbound/Application/DTOs/PackingDto';
import { IPackingRepository, PackageAggregate } from '@modules/Outbound/Application/Interfaces/IPackingRepository';
import { IPickReleaseRepository } from '@modules/Outbound/Application/Interfaces/IPickReleaseRepository';
import { PackingDtoMapper } from '@modules/Outbound/Application/Mappers/PackingDtoMapper';
import { PackageContentEntity } from '@modules/Outbound/Domain/Entities/PackageContentEntity';
import { PackageEntity } from '@modules/Outbound/Domain/Entities/PackageEntity';
import { PackSessionEntity } from '@modules/Outbound/Domain/Entities/PackSessionEntity';
import { PackageCheckResult } from '@modules/Outbound/Domain/Enums/PackageCheckResult';
import { PackageStatus } from '@modules/Outbound/Domain/Enums/PackageStatus';
import { PackSessionStatus } from '@modules/Outbound/Domain/Enums/PackSessionStatus';
import { PickTaskStatus } from '@modules/Outbound/Domain/Enums/PickTaskStatus';
import { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';

const DEFAULT_REASON_CODE = 'RC-V1-DISCREPANCY';
const PACK_CHECK_CONTROL_CODE = 'CTRL-V1-PACK-CHECK-MISMATCH';
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

interface LoadedPackSource {
  PickTask: Awaited<ReturnType<IPickReleaseRepository['FindTaskById']>> & {};
  MobileTask: MobileTaskEntity | null;
  Profile: WarehouseProfileEntity;
  CheckRequired: boolean;
}

interface NormalizedStartSession extends StartPackSessionDto {
  PickTaskId: string;
  MobileTaskId: string | null;
  WarehouseProfileId: string;
  CheckRequired?: boolean;
  ReasonCode: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
}

interface NormalizedRecordCheck extends RecordPackCheckDto {
  CheckResult: PackageCheckResult;
  ReasonCode: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  ObservedQuantity: number | null;
  ObservedSkuId: string | null;
  ObservedSkuCode: string | null;
  Weight: number | null;
  IdempotencyKey: string;
}

interface NormalizedCreatePackage extends CreatePackageDto {
  PackSessionId: string;
  CartonType: string;
  Weight: number | null;
  Length: number | null;
  Width: number | null;
  Height: number | null;
  ReasonCode: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
}

interface NormalizedClosePackage extends ClosePackageDto {
  CartonType: string | null;
  Weight: number | null;
  Length: number | null;
  Width: number | null;
  Height: number | null;
  ReasonCode: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IdempotencyKey: string;
}

interface NormalizedReadyForStaging extends ReadyForStagingDto {
  AttemptOverride: boolean;
  ReasonCode: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  LabelType: string | null;
  IdempotencyKey: string;
}

interface ReadyForStagingMutationResult {
  Aggregate: PackageAggregate;
  LabelValidation: LabelBlockingValidationResultDto;
  IsDuplicate: boolean;
  Blocked: boolean;
}

export class PackingLifecycleService {
  constructor(
    private readonly packing: IPackingRepository,
    private readonly pickReleases: IPickReleaseRepository,
    private readonly taskExecution: ITaskExecutionRepository,
    private readonly profiles: IWarehouseProfileRepository,
    private readonly exceptionCases: IExceptionCaseRepository,
    private readonly controlExceptionCatalog: IControlExceptionCatalog,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly labelBlocking: ValidateLabelBlockingUseCase,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async List(query: ListPackagesDto, actorUserId?: string | null) {
    this.AssertPageSize(query.PageSize);
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: DEFAULT_PAGE_SIZE, MaxPageSize: MAX_PAGE_SIZE },
    );
    const result = await this.packing.ListPackages(paging.Skip, paging.Take, {
      WarehouseId: query.WarehouseId,
      OwnerId: query.OwnerId,
      Status: query.Status,
      PickTaskId: query.PickTaskId,
      OutboundOrderId: query.OutboundOrderId,
    });
    const allowed: PackageAggregate[] = [];
    for (const item of result.Items) {
      if (await this.CheckPermission(actorUserId, ActionCode.Read, item.Package)) allowed.push(item);
    }
    return ToPagedResult(
      allowed.map((item) => PackingDtoMapper.ToPackageDto(item.Package, item.Contents)),
      allowed.length,
      paging.Page,
      paging.PageSize,
    );
  }

  public async Get(id: string, actorUserId?: string | null): Promise<PackageDto> {
    const aggregate = await this.packing.FindPackageById(id?.trim() ?? '');
    if (!aggregate) throw new NotFoundException('Package not found', { PackageId: id });
    await this.AssertPermission(actorUserId, ActionCode.Read, aggregate.Package);
    return PackingDtoMapper.ToPackageDto(aggregate.Package, aggregate.Contents);
  }

  public async StartSession(request: StartPackSessionDto, context: AuditContext) {
    const normalized = this.NormalizeStartSession(request);
    this.AssertActor(context);
    const source = await this.LoadPackSource(normalized);
    await this.AssertPermission(context.ActorUserId, ActionCode.Create, source);

    const fingerprint = this.Hash({
      Operation: 'StartPackSession',
      PickTaskId: normalized.PickTaskId,
      MobileTaskId: normalized.MobileTaskId,
      WarehouseProfileId: normalized.WarehouseProfileId,
      CheckRequired: source.CheckRequired,
      ReasonCode: normalized.ReasonCode,
      ReasonNote: normalized.ReasonNote,
      EvidenceRefs: normalized.EvidenceRefs,
    });
    const existing = await this.packing.FindSessionByIdempotencyKey(normalized.IdempotencyKey);
    if (existing) {
      this.AssertSameFingerprint(existing.PayloadFingerprint, fingerprint, 'Pack session idempotency key already used');
      return PackingDtoMapper.ToSessionDto(existing);
    }

    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: normalized.ReasonCode,
      Action: ActionCode.Create,
      ObjectType: ObjectType.Package,
    });
    const now = new Date();
    const session = new PackSessionEntity({
      Id: randomUUID(),
      SessionNumber: this.BuildCode('PACK-SESSION'),
      PickTaskId: source.PickTask.Id,
      MobileTaskId: source.MobileTask?.Id ?? null,
      OutboundOrderId: source.PickTask.OutboundOrderId,
      WarehouseProfileId: source.Profile.Id,
      WarehouseId: source.MobileTask?.WarehouseId ?? source.Profile.WarehouseId,
      WarehouseCode: source.MobileTask?.WarehouseCode ?? null,
      OwnerId: source.MobileTask?.OwnerId ?? source.Profile.OwnerId,
      OwnerCode: source.MobileTask?.OwnerCode ?? null,
      Status: PackSessionStatus.Open,
      CheckRequired: source.CheckRequired,
      CheckResult: PackageCheckResult.Pending,
      StartedAt: now,
      StartedBy: context.ActorUserId,
      IdempotencyKey: normalized.IdempotencyKey,
      PayloadFingerprint: fingerprint,
      CreatedAt: now,
      UpdatedAt: now,
    });

    let saved: PackSessionEntity;
    try {
      saved = await this.audited.Run<PackSessionEntity>(async (manager) => {
        const created = await this.packing.CreateSession(session, manager);
        return {
          result: created,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Create,
            ObjectType: ObjectType.Package,
            ObjectId: created.Id,
            ObjectCode: created.SessionNumber,
            AfterJson: PackingDtoMapper.ToSessionDto(created) as unknown as Record<string, unknown>,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: normalized.ReasonNote ?? normalized.ReasonCode,
            EvidenceRefs: normalized.EvidenceRefs,
            ReferenceType: 'PackSession',
            ReferenceId: created.Id,
            WarehouseId: created.WarehouseId,
            OwnerId: created.OwnerId,
            Result: AuditResult.Success,
          }),
        };
      });
    } catch (error) {
      const duplicate = await this.LoadSessionDuplicateAfterUniqueViolation(
        error,
        normalized.IdempotencyKey,
        fingerprint,
      );
      if (!duplicate) throw error;
      return PackingDtoMapper.ToSessionDto(duplicate);
    }
    return PackingDtoMapper.ToSessionDto(saved);
  }

  public async RecordCheck(sessionId: string, request: RecordPackCheckDto, context: AuditContext) {
    const normalized = this.NormalizeRecordCheck(request);
    this.AssertActor(context);
    const session = await this.packing.FindSessionById(sessionId?.trim() ?? '');
    if (!session) throw new NotFoundException('Pack session not found', { PackSessionId: sessionId });
    await this.AssertPermission(context.ActorUserId, ActionCode.Update, session);

    const fingerprint = this.Hash({
      Operation: 'RecordPackCheck',
      SessionId: session.Id,
      CheckResult: normalized.CheckResult,
      ReasonCode: normalized.ReasonCode,
      ReasonNote: normalized.ReasonNote,
      EvidenceRefs: normalized.EvidenceRefs,
      ObservedQuantity: normalized.ObservedQuantity,
      ObservedSkuId: normalized.ObservedSkuId,
      ObservedSkuCode: normalized.ObservedSkuCode,
      Weight: normalized.Weight,
    });
    if (session.CheckIdempotencyKey === normalized.IdempotencyKey) {
      this.AssertSameFingerprint(
        session.CheckPayloadFingerprint,
        fingerprint,
        'Pack check idempotency key already used',
      );
      return PackingDtoMapper.ToSessionDto(session);
    }

    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: normalized.ReasonCode,
      Action: ActionCode.Update,
      ObjectType: ObjectType.Package,
    });
    const catalog =
      normalized.CheckResult === PackageCheckResult.Mismatch
        ? await this.controlExceptionCatalog.ValidateExceptionType(PACK_CHECK_CONTROL_CODE)
        : null;
    if (catalog?.EvidenceRequired && normalized.EvidenceRefs.length === 0) {
      throw new BusinessRuleException('Pack check mismatch evidence is required');
    }
    if (
      normalized.CheckResult === PackageCheckResult.Passed &&
      (session.Status === PackSessionStatus.CheckException || session.CheckResult === PackageCheckResult.Mismatch)
    ) {
      await this.FailWithAudit(context, session, 'Pack check exception must be resolved before re-checking as passed', {
        PackSessionId: session.Id,
        ExceptionCaseId: session.CheckExceptionCaseId,
      });
    }

    const saved = await this.audited.Run<PackSessionEntity>(async (manager) => {
      const locked = await this.packing.FindSessionByIdForUpdate(session.Id, manager);
      if (!locked) throw new NotFoundException('Pack session not found', { PackSessionId: session.Id });
      if (locked.CheckIdempotencyKey === normalized.IdempotencyKey) {
        this.AssertSameFingerprint(
          locked.CheckPayloadFingerprint,
          fingerprint,
          'Pack check idempotency key already used',
        );
        return {
          result: locked,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Read,
            ObjectType: ObjectType.Package,
            ObjectId: locked.Id,
            ObjectCode: locked.SessionNumber,
            AfterJson: { IsDuplicate: true },
            Result: AuditResult.Success,
          }),
        };
      }
      if (
        normalized.CheckResult === PackageCheckResult.Passed &&
        (locked.Status === PackSessionStatus.CheckException || locked.CheckResult === PackageCheckResult.Mismatch)
      ) {
        throw new BusinessRuleException('Pack check exception must be resolved before re-checking as passed', {
          PackSessionId: locked.Id,
          ExceptionCaseId: locked.CheckExceptionCaseId,
        });
      }

      let exception: ExceptionCaseEntity | null = null;
      if (normalized.CheckResult === PackageCheckResult.Mismatch) {
        exception = await this.exceptionCases.Create(
          new ExceptionCaseEntity({
            Id: randomUUID(),
            ExceptionType: PACK_CHECK_CONTROL_CODE,
            State: ExceptionState.Detected,
            ReferenceType: 'PackSession',
            ReferenceId: locked.Id,
            WarehouseId: locked.WarehouseId,
            OwnerId: locked.OwnerId,
            ReasonCodeId: reason.ReasonCodeId,
            Severity: catalog?.Severity ?? ControlExceptionSeverity.High,
            EvidenceRefs: [this.BuildCheckEvidence(locked, normalized)],
            OpenedAt: new Date(),
            CreatedAt: new Date(),
            UpdatedAt: new Date(),
            CreatedBy: context.ActorUserId,
            UpdatedBy: context.ActorUserId,
          }),
          manager,
        );
      }

      locked.Status =
        normalized.CheckResult === PackageCheckResult.Passed
          ? PackSessionStatus.CheckingPassed
          : PackSessionStatus.CheckException;
      locked.CheckResult = normalized.CheckResult;
      locked.CheckExceptionCaseId = exception?.Id ?? null;
      locked.CheckReasonCode = normalized.ReasonCode;
      locked.CheckReasonCodeId = reason.ReasonCodeId;
      locked.CheckReasonNote = normalized.ReasonNote;
      locked.CheckEvidenceRefs = normalized.EvidenceRefs;
      locked.CheckPayloadJson = this.BuildCheckEvidence(locked, normalized);
      locked.CheckIdempotencyKey = normalized.IdempotencyKey;
      locked.CheckPayloadFingerprint = fingerprint;
      locked.CheckedAt = new Date();
      locked.CheckedBy = context.ActorUserId;
      locked.UpdatedAt = new Date();
      const updated = await this.packing.UpdateSession(locked, manager);
      return {
        result: updated,
        entry: [
          ...(exception
            ? [
                MergeAuditContext(context, {
                  Action: ActionCode.Create,
                  ObjectType: ObjectType.ExceptionCase,
                  ObjectId: exception.Id,
                  ObjectCode: exception.ExceptionType,
                  AfterJson: {
                    ExceptionType: exception.ExceptionType,
                    ReferenceType: exception.ReferenceType,
                    ReferenceId: exception.ReferenceId,
                  },
                  ReasonCodeId: reason.ReasonCodeId,
                  ReasonNote: normalized.ReasonNote ?? normalized.ReasonCode,
                  EvidenceRefs: normalized.EvidenceRefs,
                  ReferenceType: 'PackSession',
                  ReferenceId: updated.Id,
                  WarehouseId: updated.WarehouseId,
                  OwnerId: updated.OwnerId,
                  Result: AuditResult.Success,
                }),
              ]
            : []),
          MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.Package,
            ObjectId: updated.Id,
            ObjectCode: updated.SessionNumber,
            AfterJson: PackingDtoMapper.ToSessionDto(updated) as unknown as Record<string, unknown>,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: normalized.ReasonNote ?? normalized.ReasonCode,
            EvidenceRefs: normalized.EvidenceRefs,
            ReferenceType: 'PackCheck',
            ReferenceId: exception?.Id ?? updated.Id,
            WarehouseId: updated.WarehouseId,
            OwnerId: updated.OwnerId,
            Result: AuditResult.Success,
          }),
        ],
      };
    });
    return PackingDtoMapper.ToSessionDto(saved);
  }

  public async CreatePackage(request: CreatePackageDto, context: AuditContext): Promise<PackageDto> {
    const normalized = this.NormalizeCreatePackage(request);
    this.AssertActor(context);
    const session = await this.packing.FindSessionById(normalized.PackSessionId);
    if (!session) throw new NotFoundException('Pack session not found', { PackSessionId: normalized.PackSessionId });
    await this.AssertPermission(context.ActorUserId, ActionCode.Create, session);
    await this.AssertSessionAllowsPacking(session, context);
    const pickTask = await this.LoadPickTask(session.PickTaskId);
    this.AssertPickTaskPackable(pickTask);

    const fingerprint = this.Hash({
      Operation: 'CreatePackage',
      PackSessionId: normalized.PackSessionId,
      CartonType: normalized.CartonType,
      Weight: normalized.Weight,
      Length: normalized.Length,
      Width: normalized.Width,
      Height: normalized.Height,
      Contents: normalized.Contents ?? null,
      ReasonCode: normalized.ReasonCode,
      ReasonNote: normalized.ReasonNote,
      EvidenceRefs: normalized.EvidenceRefs,
    });
    const existing = await this.packing.FindPackageByIdempotencyKey(normalized.IdempotencyKey);
    if (existing) {
      this.AssertSameFingerprint(
        existing.Package.PayloadFingerprint,
        fingerprint,
        'Package idempotency key already used',
      );
      return PackingDtoMapper.ToPackageDto(existing.Package, existing.Contents);
    }
    const existingForPickTask = await this.packing.ListPackages(0, 1, { PickTaskId: pickTask.Id });
    if (existingForPickTask.Items.length > 0) {
      throw new ConflictException('Pick task already has a package', { PickTaskId: pickTask.Id });
    }

    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: normalized.ReasonCode,
      Action: ActionCode.Create,
      ObjectType: ObjectType.Package,
    });
    const now = new Date();
    const pack = new PackageEntity({
      Id: randomUUID(),
      PackageCode: this.BuildCode('PKG'),
      PackSessionId: session.Id,
      PickTaskId: pickTask.Id,
      OutboundOrderId: pickTask.OutboundOrderId,
      WarehouseProfileId: session.WarehouseProfileId,
      WarehouseId: session.WarehouseId,
      WarehouseCode: session.WarehouseCode,
      OwnerId: session.OwnerId,
      OwnerCode: session.OwnerCode,
      Status: PackageStatus.PackingPending,
      CheckRequired: session.CheckRequired,
      CheckResult: session.CheckResult,
      CartonType: normalized.CartonType,
      Weight: normalized.Weight,
      Length: normalized.Length,
      Width: normalized.Width,
      Height: normalized.Height,
      IdempotencyKey: normalized.IdempotencyKey,
      PayloadFingerprint: fingerprint,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: context.ActorUserId,
      UpdatedBy: context.ActorUserId,
    });
    const contents = this.BuildPackageContents(pack.Id, pickTask, normalized.Contents ?? null, now);

    let aggregate: PackageAggregate;
    try {
      aggregate = await this.audited.Run<PackageAggregate>(async (manager) => {
        const created = await this.packing.CreatePackage(pack, contents, manager);
        return {
          result: created,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Create,
            ObjectType: ObjectType.Package,
            ObjectId: created.Package.Id,
            ObjectCode: created.Package.PackageCode,
            AfterJson: PackingDtoMapper.ToPackageDto(created.Package, created.Contents) as unknown as Record<
              string,
              unknown
            >,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: normalized.ReasonNote ?? normalized.ReasonCode,
            EvidenceRefs: normalized.EvidenceRefs,
            ReferenceType: 'PackSession',
            ReferenceId: session.Id,
            WarehouseId: created.Package.WarehouseId,
            OwnerId: created.Package.OwnerId,
            Result: AuditResult.Success,
          }),
        };
      });
    } catch (error) {
      const duplicate = await this.LoadPackageDuplicateAfterUniqueViolation(
        error,
        normalized.IdempotencyKey,
        fingerprint,
      );
      if (!duplicate) throw error;
      return PackingDtoMapper.ToPackageDto(duplicate.Package, duplicate.Contents);
    }
    return PackingDtoMapper.ToPackageDto(aggregate.Package, aggregate.Contents);
  }

  public async ClosePackage(packageId: string, request: ClosePackageDto, context: AuditContext): Promise<PackageDto> {
    const normalized = this.NormalizeClosePackage(request);
    this.AssertActor(context);
    const aggregate = await this.LoadPackage(packageId);
    await this.AssertPermission(context.ActorUserId, ActionCode.Update, aggregate.Package);
    const session = await this.LoadSession(aggregate.Package.PackSessionId);
    await this.AssertSessionAllowsPacking(session, context, aggregate.Package);

    const fingerprint = this.Hash({
      Operation: 'ClosePackage',
      PackageId: aggregate.Package.Id,
      CartonType: normalized.CartonType,
      Weight: normalized.Weight,
      Length: normalized.Length,
      Width: normalized.Width,
      Height: normalized.Height,
      ReasonCode: normalized.ReasonCode,
      ReasonNote: normalized.ReasonNote,
      EvidenceRefs: normalized.EvidenceRefs,
    });
    if (aggregate.Package.CloseIdempotencyKey === normalized.IdempotencyKey) {
      this.AssertSameFingerprint(
        aggregate.Package.ClosePayloadFingerprint,
        fingerprint,
        'Package close idempotency key already used',
      );
      return PackingDtoMapper.ToPackageDto(aggregate.Package, aggregate.Contents);
    }
    if (
      aggregate.Package.Status !== PackageStatus.PackingPending &&
      aggregate.Package.Status !== PackageStatus.Blocked
    ) {
      throw new ConflictException('Package status cannot be closed', {
        PackageId: aggregate.Package.Id,
        Status: aggregate.Package.Status,
      });
    }
    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: normalized.ReasonCode,
      Action: ActionCode.Update,
      ObjectType: ObjectType.Package,
    });

    const updated = await this.audited.Run<PackageAggregate>(async (manager) => {
      const locked = await this.packing.FindPackageByIdForUpdate(aggregate.Package.Id, manager);
      if (!locked) throw new NotFoundException('Package not found', { PackageId: aggregate.Package.Id });
      if (locked.Package.CloseIdempotencyKey === normalized.IdempotencyKey) {
        this.AssertSameFingerprint(
          locked.Package.ClosePayloadFingerprint,
          fingerprint,
          'Package close idempotency key already used',
        );
        return {
          result: locked,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Read,
            ObjectType: ObjectType.Package,
            ObjectId: locked.Package.Id,
            ObjectCode: locked.Package.PackageCode,
            AfterJson: { IsDuplicate: true },
            Result: AuditResult.Success,
          }),
        };
      }
      if (locked.Package.Status !== PackageStatus.PackingPending && locked.Package.Status !== PackageStatus.Blocked) {
        throw new ConflictException('Package status cannot be closed', {
          PackageId: locked.Package.Id,
          Status: locked.Package.Status,
        });
      }
      locked.Package.Status = PackageStatus.Packed;
      locked.Package.CartonType = normalized.CartonType ?? locked.Package.CartonType;
      locked.Package.Weight = normalized.Weight ?? locked.Package.Weight;
      locked.Package.Length = normalized.Length ?? locked.Package.Length;
      locked.Package.Width = normalized.Width ?? locked.Package.Width;
      locked.Package.Height = normalized.Height ?? locked.Package.Height;
      locked.Package.CloseIdempotencyKey = normalized.IdempotencyKey;
      locked.Package.ClosePayloadFingerprint = fingerprint;
      locked.Package.ClosedAt = new Date();
      locked.Package.ClosedBy = context.ActorUserId;
      locked.Package.UpdatedAt = new Date();
      locked.Package.UpdatedBy = context.ActorUserId;
      const saved = await this.packing.UpdatePackage(locked.Package, undefined, manager);
      return {
        result: saved,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Update,
          ObjectType: ObjectType.Package,
          ObjectId: saved.Package.Id,
          ObjectCode: saved.Package.PackageCode,
          AfterJson: PackingDtoMapper.ToPackageDto(saved.Package, saved.Contents) as unknown as Record<string, unknown>,
          ReasonCodeId: reason.ReasonCodeId,
          ReasonNote: normalized.ReasonNote ?? normalized.ReasonCode,
          EvidenceRefs: normalized.EvidenceRefs,
          ReferenceType: 'PackageClose',
          ReferenceId: saved.Package.Id,
          WarehouseId: saved.Package.WarehouseId,
          OwnerId: saved.Package.OwnerId,
          Result: AuditResult.Success,
        }),
      };
    });
    return PackingDtoMapper.ToPackageDto(updated.Package, updated.Contents);
  }

  public async MarkReadyForStaging(
    packageId: string,
    request: ReadyForStagingDto,
    context: AuditContext,
  ): Promise<ReadyForStagingResultDto> {
    const normalized = this.NormalizeReadyForStaging(request);
    this.AssertActor(context);
    const aggregate = await this.LoadPackage(packageId);
    await this.AssertPermission(context.ActorUserId, ActionCode.Update, aggregate.Package);
    const fingerprint = this.Hash({
      Operation: 'ReadyForStaging',
      PackageId: aggregate.Package.Id,
      AttemptOverride: normalized.AttemptOverride,
      ReasonCode: normalized.ReasonCode,
      ReasonNote: normalized.ReasonNote,
      EvidenceRefs: normalized.EvidenceRefs,
      LabelType: normalized.LabelType,
    });
    if (aggregate.Package.Status === PackageStatus.ReadyForStaging) {
      if (aggregate.Package.ReadyForStagingIdempotencyKey === normalized.IdempotencyKey) {
        this.AssertSameFingerprint(
          aggregate.Package.ReadyForStagingPayloadFingerprint,
          fingerprint,
          'Ready-for-staging idempotency key already used',
        );
        const labelValidation = await this.labelBlocking.Execute(
          this.BuildLabelRequest(aggregate.Package, normalized),
          context,
        );
        return {
          Package: PackingDtoMapper.ToPackageDto(aggregate.Package, aggregate.Contents),
          LabelValidation: labelValidation,
          IsDuplicate: true,
        };
      }
      throw new ConflictException('Package is already ready for staging', { PackageId: aggregate.Package.Id });
    }
    if (aggregate.Package.Status !== PackageStatus.Packed) {
      await this.FailWithAudit(context, aggregate.Package, 'Package must be packed before ready for staging', {
        Status: aggregate.Package.Status,
      });
    }

    if (aggregate.Package.ReadyForStagingIdempotencyKey === normalized.IdempotencyKey) {
      this.AssertSameFingerprint(
        aggregate.Package.ReadyForStagingPayloadFingerprint,
        fingerprint,
        'Ready-for-staging idempotency key already used',
      );
      const labelValidation = await this.labelBlocking.Execute(
        this.BuildLabelRequest(aggregate.Package, normalized),
        context,
      );
      return {
        Package: PackingDtoMapper.ToPackageDto(aggregate.Package, aggregate.Contents),
        LabelValidation: labelValidation,
        IsDuplicate: true,
      };
    }

    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: normalized.ReasonCode,
      Action: ActionCode.Update,
      ObjectType: ObjectType.Package,
    });
    const mutation = await this.audited.Run<ReadyForStagingMutationResult>(async (manager) => {
      const locked = await this.packing.FindPackageByIdForUpdate(aggregate.Package.Id, manager);
      if (!locked) throw new NotFoundException('Package not found', { PackageId: aggregate.Package.Id });
      if (locked.Package.Status === PackageStatus.ReadyForStaging) {
        if (locked.Package.ReadyForStagingIdempotencyKey === normalized.IdempotencyKey) {
          this.AssertSameFingerprint(
            locked.Package.ReadyForStagingPayloadFingerprint,
            fingerprint,
            'Ready-for-staging idempotency key already used',
          );
          const duplicateLabelValidation = await this.labelBlocking.Execute(
            this.BuildLabelRequest(locked.Package, normalized),
            context,
          );
          return {
            result: {
              Aggregate: locked,
              LabelValidation: duplicateLabelValidation,
              IsDuplicate: true,
              Blocked: false,
            },
            entry: MergeAuditContext(context, {
              Action: ActionCode.Read,
              ObjectType: ObjectType.Package,
              ObjectId: locked.Package.Id,
              ObjectCode: locked.Package.PackageCode,
              AfterJson: { IsDuplicate: true },
              Result: AuditResult.Success,
            }),
          };
        }
        throw new ConflictException('Package is already ready for staging', { PackageId: locked.Package.Id });
      }
      if (locked.Package.Status !== PackageStatus.Packed) {
        throw new ConflictException('Package must be packed before ready for staging', {
          PackageId: locked.Package.Id,
          Status: locked.Package.Status,
        });
      }
      const labelValidation = await this.labelBlocking.Execute(
        this.BuildLabelRequest(locked.Package, normalized),
        context,
      );
      if (!labelValidation.Allowed) {
        return {
          result: {
            Aggregate: locked,
            LabelValidation: labelValidation,
            IsDuplicate: false,
            Blocked: true,
          },
          entry: MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.Package,
            ObjectId: locked.Package.Id,
            ObjectCode: locked.Package.PackageCode,
            AfterJson: {
              Decision: 'Blocked',
              Reason: 'Required label evidence is missing',
              LabelValidation: labelValidation,
            },
            EvidenceRefs: normalized.EvidenceRefs,
            ReferenceType: 'PackageGate',
            ReferenceId: locked.Package.Id,
            WarehouseId: locked.Package.WarehouseId,
            OwnerId: locked.Package.OwnerId,
            Result: AuditResult.Failed,
          }),
        };
      }
      locked.Package.Status = PackageStatus.ReadyForStaging;
      locked.Package.LabelBlockingDecision = labelValidation.Decision;
      locked.Package.LabelPrintJobId = labelValidation.MatchedPrintJobId;
      locked.Package.LabelPrintJobCode = labelValidation.MatchedPrintJobCode;
      locked.Package.ReadyForStagingIdempotencyKey = normalized.IdempotencyKey;
      locked.Package.ReadyForStagingPayloadFingerprint = fingerprint;
      locked.Package.ReadyForStagingAt = new Date();
      locked.Package.ReadyForStagingBy = context.ActorUserId;
      locked.Package.UpdatedAt = new Date();
      locked.Package.UpdatedBy = context.ActorUserId;
      const saved = await this.packing.UpdatePackage(locked.Package, undefined, manager);
      return {
        result: {
          Aggregate: saved,
          LabelValidation: labelValidation,
          IsDuplicate: false,
          Blocked: false,
        },
        entry: MergeAuditContext(context, {
          Action: ActionCode.Update,
          ObjectType: ObjectType.Package,
          ObjectId: saved.Package.Id,
          ObjectCode: saved.Package.PackageCode,
          AfterJson: {
            Package: PackingDtoMapper.ToPackageDto(saved.Package, saved.Contents),
            LabelValidation: labelValidation,
          },
          ReasonCodeId: reason.ReasonCodeId,
          ReasonNote: normalized.ReasonNote ?? normalized.ReasonCode,
          EvidenceRefs: normalized.EvidenceRefs,
          ReferenceType: 'ReadyForStaging',
          ReferenceId: saved.Package.Id,
          WarehouseId: saved.Package.WarehouseId,
          OwnerId: saved.Package.OwnerId,
          Result: AuditResult.Success,
        }),
      };
    });
    if (mutation.Blocked) {
      throw new BusinessRuleException('Required label evidence is missing', {
        LabelValidation: mutation.LabelValidation,
      });
    }
    return {
      Package: PackingDtoMapper.ToPackageDto(mutation.Aggregate.Package, mutation.Aggregate.Contents),
      LabelValidation: mutation.LabelValidation,
      IsDuplicate: mutation.IsDuplicate,
    };
  }

  private BuildLabelRequest(pack: PackageEntity, request: NormalizedReadyForStaging) {
    return {
      DownstreamAction: LabelBlockingDownstreamAction.ReadyForStaging,
      BusinessObjectType: 'Package',
      BusinessObjectId: pack.Id,
      BusinessObjectCode: pack.PackageCode,
      WarehouseProfileId: pack.WarehouseProfileId,
      WarehouseId: pack.WarehouseId,
      OwnerId: pack.OwnerId,
      LabelType: request.LabelType,
      AttemptOverride: request.AttemptOverride,
      ReasonCode: request.ReasonCode,
      ReasonNote: request.ReasonNote,
      EvidenceRefs: request.EvidenceRefs,
    };
  }

  private async LoadPackSource(request: NormalizedStartSession): Promise<LoadedPackSource> {
    const pickTask = await this.LoadPickTask(request.PickTaskId);
    this.AssertPickTaskPackable(pickTask);
    const mobileTask = await this.LoadMobileTask(pickTask.Id, request.MobileTaskId);
    const profile = await this.profiles.FindById(request.WarehouseProfileId);
    if (!profile)
      throw new NotFoundException('Warehouse profile not found', { WarehouseProfileId: request.WarehouseProfileId });
    const checkRequired = this.ResolveCheckRequired(profile, request.CheckRequired);
    return { PickTask: pickTask, MobileTask: mobileTask, Profile: profile, CheckRequired: checkRequired };
  }

  private async LoadPickTask(id: string) {
    const pickTask = await this.pickReleases.FindTaskById(id?.trim() ?? '');
    if (!pickTask) throw new NotFoundException('Pick task not found', { PickTaskId: id });
    return pickTask;
  }

  private async LoadMobileTask(pickTaskId: string, mobileTaskId: string | null): Promise<MobileTaskEntity | null> {
    const mobileTask = mobileTaskId
      ? await this.taskExecution.FindById(mobileTaskId)
      : await this.taskExecution.FindBySourceDocument('PickTask', pickTaskId);
    if (!mobileTask) return null;
    if (
      mobileTask.TaskType !== MobileTaskType.Pick ||
      mobileTask.SourceDocumentType !== 'PickTask' ||
      mobileTask.SourceDocumentId !== pickTaskId
    ) {
      throw new ConflictException('Mobile task does not match pick task', {
        PickTaskId: pickTaskId,
        MobileTaskId: mobileTask.Id,
      });
    }
    return mobileTask;
  }

  private async LoadSession(id: string): Promise<PackSessionEntity> {
    const session = await this.packing.FindSessionById(id);
    if (!session) throw new NotFoundException('Pack session not found', { PackSessionId: id });
    return session;
  }

  private async LoadPackage(id: string): Promise<PackageAggregate> {
    const aggregate = await this.packing.FindPackageById(id?.trim() ?? '');
    if (!aggregate) throw new NotFoundException('Package not found', { PackageId: id });
    return aggregate;
  }

  private AssertPickTaskPackable(pickTask: Awaited<ReturnType<IPickReleaseRepository['FindTaskById']>> & {}): void {
    if (pickTask.Status !== PickTaskStatus.Completed) {
      throw new BusinessRuleException('Pick task must be completed before packing', {
        PickTaskId: pickTask.Id,
        PickTaskStatus: pickTask.Status,
      });
    }
    if (pickTask.ExceptionCaseId) {
      throw new BusinessRuleException('Pick task exception must be resolved before packing', {
        PickTaskId: pickTask.Id,
        ExceptionCaseId: pickTask.ExceptionCaseId,
      });
    }
  }

  private async AssertSessionAllowsPacking(
    session: PackSessionEntity,
    context: AuditContext,
    pack?: PackageEntity,
  ): Promise<void> {
    if (session.CheckRequired && session.CheckResult !== PackageCheckResult.Passed) {
      await this.FailWithAudit(context, pack ?? session, 'Pack check must pass before packing', {
        PackSessionId: session.Id,
        CheckRequired: session.CheckRequired,
        CheckResult: session.CheckResult,
      });
    }
    if (session.Status === PackSessionStatus.CheckException || session.CheckResult === PackageCheckResult.Mismatch) {
      await this.FailWithAudit(context, pack ?? session, 'Pack check mismatch must be resolved before package close', {
        PackSessionId: session.Id,
        ExceptionCaseId: session.CheckExceptionCaseId,
      });
    }
  }

  private BuildPackageContents(
    packageId: string,
    pickTask: Awaited<ReturnType<IPickReleaseRepository['FindTaskById']>> & {},
    requested: CreatePackageDto['Contents'],
    now: Date,
  ): PackageContentEntity[] {
    if ((requested?.length ?? 0) > 1) {
      throw new BusinessRuleException('Only one package content row is supported for a pick task package');
    }
    const request = requested?.[0] ?? null;
    if (request?.PickTaskId?.trim() && request.PickTaskId.trim() !== pickTask.Id) {
      throw new BusinessRuleException('Package content PickTaskId must match pack session pick task', {
        RequestedPickTaskId: request.PickTaskId.trim(),
        PickTaskId: pickTask.Id,
      });
    }
    const quantity = this.NormalizeOptionalQuantity(request?.Quantity) ?? pickTask.Quantity;
    if (quantity <= 0) throw new BusinessRuleException('Package content quantity must be positive');
    if (quantity > pickTask.Quantity) {
      throw new BusinessRuleException('Package content quantity cannot exceed picked quantity', {
        RequestedQuantity: quantity,
        PickedQuantity: pickTask.Quantity,
      });
    }
    return [
      new PackageContentEntity({
        Id: randomUUID(),
        PackageId: packageId,
        PickTaskId: pickTask.Id,
        OutboundOrderLineId: pickTask.OutboundOrderLineId,
        SourceBalanceId: pickTask.SourceBalanceId,
        SourceDimensionId: pickTask.SourceDimensionId,
        SkuId: pickTask.SkuId,
        SkuCode: pickTask.SkuCode,
        UomId: pickTask.UomId,
        UomCode: pickTask.UomCode,
        Quantity: quantity,
        InventoryStatusCode: pickTask.InventoryStatusCode,
        LotNumber: pickTask.LotNumber,
        SerialNumber: pickTask.SerialNumber,
        ExpiryDate: pickTask.ExpiryDate,
        CreatedAt: now,
      }),
    ];
  }

  private ResolveCheckRequired(profile: WarehouseProfileEntity, explicit?: boolean): boolean {
    const policy = profile.StrategyPolicy as Record<string, unknown>;
    const profileRequiresCheck = Boolean(
      policy.packingCheckRequired ??
      policy.requirePackingCheck ??
      policy.requireCheckingBeforePacking ??
      policy.checkingRequiredBeforePacking ??
      false,
    );
    return profileRequiresCheck || explicit === true;
  }

  private async AssertPermission(
    actorUserId: string | null | undefined,
    action: ActionCode,
    target: PackageEntity | PackSessionEntity | LoadedPackSource,
  ): Promise<void> {
    if (!actorUserId) throw new ForbiddenAppException('Authenticated actor is required');
    if (!(await this.CheckPermission(actorUserId, action, target))) {
      throw new ForbiddenAppException('Permission denied for package action', {
        Action: action,
        ObjectType: ObjectType.Package,
      });
    }
  }

  private async CheckPermission(
    actorUserId: string | null | undefined,
    action: ActionCode,
    target: PackageEntity | PackSessionEntity | LoadedPackSource,
  ): Promise<boolean> {
    if (!actorUserId || !this.permissionChecker) return Boolean(actorUserId);
    const scope = this.ScopeOf(target);
    const decision = await this.permissionChecker.Check({
      UserId: actorUserId,
      Action: action,
      ObjectType: ObjectType.Package,
      Scope: scope,
    });
    return decision.Allowed;
  }

  private ScopeOf(target: PackageEntity | PackSessionEntity | LoadedPackSource): {
    WarehouseId?: string | null;
    OwnerId?: string | null;
  } {
    if ('PackageCode' in target) return { WarehouseId: target.WarehouseId, OwnerId: target.OwnerId };
    if ('SessionNumber' in target) return { WarehouseId: target.WarehouseId, OwnerId: target.OwnerId };
    return {
      WarehouseId: target.MobileTask?.WarehouseId ?? target.Profile.WarehouseId,
      OwnerId: target.MobileTask?.OwnerId ?? target.Profile.OwnerId,
    };
  }

  private async FailWithAudit(
    context: AuditContext,
    target: PackageEntity | PackSessionEntity,
    reason: string,
    details: Record<string, unknown>,
  ): Promise<never> {
    await this.audited.Run(async () => ({
      result: null,
      entry: MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Package,
        ObjectId: target.Id,
        ObjectCode: 'PackageCode' in target ? target.PackageCode : target.SessionNumber,
        AfterJson: { Decision: 'Blocked', Reason: reason, ...details },
        ReferenceType: 'PackageGate',
        ReferenceId: target.Id,
        WarehouseId: target.WarehouseId,
        OwnerId: target.OwnerId,
        Result: AuditResult.Failed,
      }),
    }));
    throw new BusinessRuleException(reason, details);
  }

  private AssertActor(context: AuditContext): void {
    if (!context.ActorUserId) throw new ForbiddenAppException('Authenticated actor is required');
  }

  private AssertPageSize(pageSize?: number): void {
    if (pageSize !== undefined && Number(pageSize) > MAX_PAGE_SIZE) {
      throw new BusinessRuleException('PageSize must not be greater than 100');
    }
  }

  private NormalizeStartSession(request: StartPackSessionDto): NormalizedStartSession {
    const normalized = {
      ...request,
      PickTaskId: request.PickTaskId?.trim() ?? '',
      MobileTaskId: request.MobileTaskId?.trim() || null,
      WarehouseProfileId: request.WarehouseProfileId?.trim() ?? '',
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || DEFAULT_REASON_CODE,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!normalized.PickTaskId) throw new BusinessRuleException('PickTaskId is required');
    if (!normalized.WarehouseProfileId) throw new BusinessRuleException('WarehouseProfileId is required');
    if (!normalized.IdempotencyKey) throw new BusinessRuleException('IdempotencyKey is required for pack session');
    return normalized;
  }

  private NormalizeRecordCheck(request: RecordPackCheckDto): NormalizedRecordCheck {
    const checkResult = request.CheckResult as PackageCheckResult;
    if (![PackageCheckResult.Passed, PackageCheckResult.Mismatch].includes(checkResult)) {
      throw new BusinessRuleException('Unsupported pack check result', { CheckResult: request.CheckResult });
    }
    const normalized = {
      ...request,
      CheckResult: checkResult,
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || DEFAULT_REASON_CODE,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      ObservedQuantity: this.NormalizeOptionalQuantity(request.ObservedQuantity),
      ObservedSkuId: request.ObservedSkuId?.trim() || null,
      ObservedSkuCode: request.ObservedSkuCode?.trim() || null,
      Weight: this.NormalizeOptionalQuantity(request.Weight),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!normalized.IdempotencyKey) throw new BusinessRuleException('IdempotencyKey is required for pack check');
    if (checkResult === PackageCheckResult.Mismatch && normalized.EvidenceRefs.length === 0) {
      throw new BusinessRuleException('EvidenceRefs are required for pack check mismatch');
    }
    return normalized;
  }

  private NormalizeCreatePackage(request: CreatePackageDto): NormalizedCreatePackage {
    const normalized = {
      ...request,
      PackSessionId: request.PackSessionId?.trim() ?? '',
      CartonType: request.CartonType?.trim() ?? '',
      Weight: this.NormalizeOptionalQuantity(request.Weight),
      Length: this.NormalizeOptionalQuantity(request.Length),
      Width: this.NormalizeOptionalQuantity(request.Width),
      Height: this.NormalizeOptionalQuantity(request.Height),
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || DEFAULT_REASON_CODE,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!normalized.PackSessionId) throw new BusinessRuleException('PackSessionId is required');
    if (!normalized.CartonType) throw new BusinessRuleException('CartonType is required');
    if (!normalized.IdempotencyKey) throw new BusinessRuleException('IdempotencyKey is required for package create');
    return normalized;
  }

  private NormalizeClosePackage(request: ClosePackageDto): NormalizedClosePackage {
    const normalized = {
      ...request,
      CartonType: request.CartonType?.trim() || null,
      Weight: this.NormalizeOptionalQuantity(request.Weight),
      Length: this.NormalizeOptionalQuantity(request.Length),
      Width: this.NormalizeOptionalQuantity(request.Width),
      Height: this.NormalizeOptionalQuantity(request.Height),
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || DEFAULT_REASON_CODE,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!normalized.IdempotencyKey) throw new BusinessRuleException('IdempotencyKey is required for package close');
    return normalized;
  }

  private NormalizeReadyForStaging(request: ReadyForStagingDto): NormalizedReadyForStaging {
    const normalized = {
      ...request,
      AttemptOverride: request.AttemptOverride === true,
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || DEFAULT_REASON_CODE,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      LabelType: request.LabelType?.trim() || null,
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!normalized.IdempotencyKey) throw new BusinessRuleException('IdempotencyKey is required for ready for staging');
    return normalized;
  }

  private NormalizeEvidence(value?: string[] | null): string[] {
    return (value ?? []).map((item) => item.trim()).filter(Boolean);
  }

  private NormalizeOptionalQuantity(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new BusinessRuleException('Quantity must be zero or positive');
    return number;
  }

  private BuildCheckEvidence(session: PackSessionEntity, request: NormalizedRecordCheck): Record<string, unknown> {
    return {
      PackSessionId: session.Id,
      PickTaskId: session.PickTaskId,
      CheckResult: request.CheckResult,
      ObservedQuantity: request.ObservedQuantity,
      ObservedSkuId: request.ObservedSkuId,
      ObservedSkuCode: request.ObservedSkuCode,
      Weight: request.Weight,
      EvidenceRefs: request.EvidenceRefs,
    };
  }

  private async LoadSessionDuplicateAfterUniqueViolation(
    error: unknown,
    idempotencyKey: string,
    fingerprint: string,
  ): Promise<PackSessionEntity | null> {
    if (!this.IsUniqueViolation(error)) return null;
    const duplicate = await this.packing.FindSessionByIdempotencyKey(idempotencyKey);
    if (!duplicate) return null;
    this.AssertSameFingerprint(duplicate.PayloadFingerprint, fingerprint, 'Pack session idempotency key already used');
    return duplicate;
  }

  private async LoadPackageDuplicateAfterUniqueViolation(
    error: unknown,
    idempotencyKey: string,
    fingerprint: string,
  ): Promise<PackageAggregate | null> {
    if (!this.IsUniqueViolation(error)) return null;
    const duplicate = await this.packing.FindPackageByIdempotencyKey(idempotencyKey);
    if (!duplicate) return null;
    this.AssertSameFingerprint(
      duplicate.Package.PayloadFingerprint,
      fingerprint,
      'Package idempotency key already used',
    );
    return duplicate;
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
