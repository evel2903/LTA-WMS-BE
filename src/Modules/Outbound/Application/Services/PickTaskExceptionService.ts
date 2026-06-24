import { createHash, randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import {
  BusinessRuleException,
  ConflictException,
  ForbiddenAppException,
  NotFoundException,
} from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ApprovalRequestDto } from '@modules/AccessControl/Application/DTOs/ApprovalRequestDto';
import { AuditContext, MergeAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ExceptionCaseDto } from '@modules/AccessControl/Application/DTOs/ExceptionCaseDto';
import { IApprovalRequestRepository } from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import { IControlExceptionCatalog } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { ApprovalRequestDtoMapper } from '@modules/AccessControl/Application/Mappers/ApprovalRequestDtoMapper';
import { ExceptionCaseDtoMapper } from '@modules/AccessControl/Application/Mappers/ExceptionCaseDtoMapper';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { CreateApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/CreateApprovalRequestUseCase';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import { ReleaseReplenishmentTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/ReplenishmentTaskUseCases';
import { ReplenishmentTaskDto } from '@modules/InventoryExecution/Application/DTOs/ReplenishmentTaskDto';
import { ReplenishmentTriggerType } from '@modules/InventoryExecution/Domain/Enums/ReplenishmentTriggerType';
import {
  PickExceptionResultDto,
  PickSubstitutionPolicyDecision,
  ReportPickExceptionDto,
  RequestPickSubstitutionDto,
} from '@modules/Outbound/Application/DTOs/PickTaskExceptionDto';
import { PickReleaseDtoMapper } from '@modules/Outbound/Application/Mappers/PickReleaseDtoMapper';
import { IPickReleaseRepository } from '@modules/Outbound/Application/Interfaces/IPickReleaseRepository';
import { PickTaskEntity } from '@modules/Outbound/Domain/Entities/PickTaskEntity';
import { PickExceptionType } from '@modules/Outbound/Domain/Enums/PickExceptionType';
import { PickSubstitutionStatus } from '@modules/Outbound/Domain/Enums/PickSubstitutionStatus';
import { PickTaskStatus } from '@modules/Outbound/Domain/Enums/PickTaskStatus';
import { MobileTaskDtoMapper } from '@modules/TaskExecution/Application/Mappers/MobileTaskDtoMapper';
import { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { AssertMobileTaskPermission } from '@modules/TaskExecution/Application/UseCases/MobileTaskPermission';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';
import { MobileTaskType } from '@modules/TaskExecution/Domain/Enums/MobileTaskType';

const PICK_EXCEPTION_CONTROL_CODE = 'CTRL-V1-PICK-EXCEPTION';
const PICK_SUBSTITUTION_CONTROL_CODE = 'CTRL-V1-PICK-SUBSTITUTION';
const DEFAULT_REASON_CODE = 'RC-V1-DISCREPANCY';
const REPLENISHMENT_REASON_CODE = 'RC-V1-REPLENISHMENT';
const BLOCKING_EXCEPTION_TYPES = new Set<PickExceptionType>([
  PickExceptionType.ShortPick,
  PickExceptionType.NoStock,
  PickExceptionType.Damaged,
  PickExceptionType.WrongItem,
]);

interface NormalizedExceptionRequest extends ReportPickExceptionDto {
  MobileTaskId: string | null;
  ExceptionType: PickExceptionType;
  ReasonCode: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  ObservedQuantity: number | null;
  DamagedQuantity: number | null;
  ObservedSkuId: string | null;
  ObservedSkuCode: string | null;
  ReplenishmentTargetLocationId: string | null;
}

interface NormalizedSubstitutionRequest extends RequestPickSubstitutionDto {
  MobileTaskId: string | null;
  SubstituteSkuId: string;
  SubstituteSkuCode: string | null;
  SubstituteUomId: string | null;
  SubstituteUomCode: string | null;
  Quantity: number;
  PolicyDecision: PickSubstitutionPolicyDecision;
  PolicyReason: string | null;
  ReasonCode: string;
  ReasonNote: string | null;
  EvidenceRefs: string[];
}

interface LoadedPickTaskContext {
  PickTask: PickTaskEntity;
  MobileTask: MobileTaskEntity | null;
}

export class PickTaskExceptionService {
  constructor(
    private readonly pickReleases: IPickReleaseRepository,
    private readonly taskExecution: ITaskExecutionRepository,
    private readonly exceptionCases: IExceptionCaseRepository,
    private readonly controlExceptionCatalog: IControlExceptionCatalog,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited: AuditedTransaction,
    private readonly approvalRequests: IApprovalRequestRepository,
    private readonly createApprovalRequest: CreateApprovalRequestUseCase,
    private readonly releaseReplenishmentTask?: ReleaseReplenishmentTaskUseCase,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async ReportException(
    pickTaskId: string,
    request: ReportPickExceptionDto,
    context: AuditContext,
  ): Promise<PickExceptionResultDto> {
    const normalized = this.NormalizeException(request);
    const loaded = await this.LoadByPickTask(pickTaskId, normalized.MobileTaskId);
    return this.ReportExceptionForLoaded(loaded, normalized, context);
  }

  public async ReportExceptionByMobileTask(
    mobileTaskId: string,
    request: ReportPickExceptionDto,
    context: AuditContext,
  ): Promise<PickExceptionResultDto> {
    const normalized = this.NormalizeException({ ...request, MobileTaskId: mobileTaskId });
    const loaded = await this.LoadByMobileTask(mobileTaskId);
    return this.ReportExceptionForLoaded(loaded, normalized, context);
  }

  public async RequestSubstitution(
    pickTaskId: string,
    request: RequestPickSubstitutionDto,
    context: AuditContext,
  ): Promise<PickExceptionResultDto> {
    const normalized = this.NormalizeSubstitution(request);
    const loaded = await this.LoadByPickTask(pickTaskId, normalized.MobileTaskId);
    return this.RequestSubstitutionForLoaded(loaded, normalized, context);
  }

  public async RequestSubstitutionByMobileTask(
    mobileTaskId: string,
    request: RequestPickSubstitutionDto,
    context: AuditContext,
  ): Promise<PickExceptionResultDto> {
    const normalized = this.NormalizeSubstitution({ ...request, MobileTaskId: mobileTaskId });
    const loaded = await this.LoadByMobileTask(mobileTaskId);
    return this.RequestSubstitutionForLoaded(loaded, normalized, context);
  }

  private async ReportExceptionForLoaded(
    loaded: LoadedPickTaskContext,
    request: NormalizedExceptionRequest,
    context: AuditContext,
  ): Promise<PickExceptionResultDto> {
    this.AssertActor(context);
    const { PickTask: pickTask, MobileTask: mobileTask } = loaded;
    await this.AssertPermissions(context.ActorUserId, pickTask, mobileTask, ActionCode.Update);
    this.AssertPickTaskMutable(pickTask, mobileTask);

    const fingerprint = this.Hash({
      Operation: 'ReportPickException',
      PickTaskId: pickTask.Id,
      MobileTaskId: mobileTask?.Id ?? null,
      ExceptionType: request.ExceptionType,
      ReasonCode: request.ReasonCode,
      ReasonNote: request.ReasonNote,
      EvidenceRefs: request.EvidenceRefs,
      ObservedQuantity: request.ObservedQuantity,
      DamagedQuantity: request.DamagedQuantity,
      ObservedSkuId: request.ObservedSkuId,
      ObservedSkuCode: request.ObservedSkuCode,
      ReplenishmentTargetLocationId: request.ReplenishmentTargetLocationId,
    });
    if (pickTask.ExceptionIdempotencyKey === request.IdempotencyKey) {
      this.AssertSameFingerprint(pickTask.ExceptionPayloadFingerprint, fingerprint);
      return this.BuildResult(pickTask, mobileTask, await this.LoadException(pickTask), null, null, true);
    }
    if (pickTask.ExceptionCaseId) {
      throw new ConflictException('Pick task already has an exception case', {
        PickTaskId: pickTask.Id,
        ExceptionCaseId: pickTask.ExceptionCaseId,
      });
    }

    const catalog = await this.controlExceptionCatalog.ValidateExceptionType(PICK_EXCEPTION_CONTROL_CODE);
    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: request.ReasonCode,
      Action: ActionCode.Update,
      ObjectType: ObjectType.PickTask,
    });
    if (catalog.EvidenceRequired && request.EvidenceRefs.length === 0) {
      throw new BusinessRuleException('Pick exception evidence is required', { ExceptionType: request.ExceptionType });
    }

    const evidence = this.BuildExceptionEvidence(pickTask, mobileTask, request);
    const auditEvidence = [evidence];
    const now = new Date();
    const result = await this.audited.Run<{
      PickTask: PickTaskEntity;
      MobileTask: MobileTaskEntity | null;
      ExceptionCase: ExceptionCaseEntity;
    }>(async (manager) => {
      const locked = await this.LockLoaded(pickTask.Id, mobileTask?.Id ?? null, manager);
      this.AssertPickTaskMutable(locked.PickTask, locked.MobileTask);

      const exception = await this.exceptionCases.Create(
        new ExceptionCaseEntity({
          Id: randomUUID(),
          ExceptionType: PICK_EXCEPTION_CONTROL_CODE,
          State: ExceptionState.Detected,
          ReferenceType: 'PickTask',
          ReferenceId: locked.PickTask.Id,
          WarehouseId: locked.MobileTask?.WarehouseId ?? null,
          OwnerId: locked.MobileTask?.OwnerId ?? null,
          ReasonCodeId: reason.ReasonCodeId,
          Severity: catalog.Severity ?? ControlExceptionSeverity.High,
          EvidenceRefs: auditEvidence,
          OpenedAt: now,
          CreatedAt: now,
          UpdatedAt: now,
          CreatedBy: context.ActorUserId,
          UpdatedBy: context.ActorUserId,
        }),
        manager,
      );

      locked.PickTask.ExceptionType = request.ExceptionType;
      locked.PickTask.ExceptionCaseId = exception.Id;
      locked.PickTask.ExceptionReasonCode = request.ReasonCode;
      locked.PickTask.ExceptionReasonCodeId = reason.ReasonCodeId;
      locked.PickTask.ExceptionReasonNote = request.ReasonNote;
      locked.PickTask.ExceptionEvidenceJson = evidence;
      locked.PickTask.ExceptionIdempotencyKey = request.IdempotencyKey;
      locked.PickTask.ExceptionPayloadFingerprint = fingerprint;
      locked.PickTask.ExceptionReportedAt = now;
      locked.PickTask.ExceptionReportedBy = context.ActorUserId;
      locked.PickTask.ReplenishmentRequired = this.RequiresReplenishment(request.ExceptionType);
      const savedTask = await this.pickReleases.SaveTask(locked.PickTask, manager);

      let savedMobile = locked.MobileTask;
      if (savedMobile && BLOCKING_EXCEPTION_TYPES.has(request.ExceptionType)) {
        savedMobile.TaskStatus = MobileTaskStatus.Blocked;
        savedMobile.UpdatedAt = now;
        savedMobile.UpdatedBy = context.ActorUserId;
        savedMobile = await this.taskExecution.Save(savedMobile, manager);
      }

      return {
        result: { PickTask: savedTask, MobileTask: savedMobile, ExceptionCase: exception },
        entry: [
          MergeAuditContext(context, {
            Action: ActionCode.Create,
            ObjectType: ObjectType.ExceptionCase,
            ObjectId: exception.Id,
            ObjectCode: exception.ExceptionType,
            AfterJson: ExceptionCaseDtoMapper.ToDto(exception) as unknown as Record<string, unknown>,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: request.ReasonNote ?? request.ReasonCode,
            EvidenceRefs: auditEvidence,
            ReferenceType: 'PickTask',
            ReferenceId: savedTask.Id,
            WarehouseId: exception.WarehouseId,
            OwnerId: exception.OwnerId,
            Result: AuditResult.Success,
          }),
          MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.PickTask,
            ObjectId: savedTask.Id,
            ObjectCode: savedTask.TaskNumber,
            AfterJson: PickReleaseDtoMapper.ToTaskDto(savedTask) as unknown as Record<string, unknown>,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: request.ReasonNote ?? request.ReasonCode,
            EvidenceRefs: auditEvidence,
            ReferenceType: 'PickException',
            ReferenceId: exception.Id,
            WarehouseId: exception.WarehouseId,
            OwnerId: exception.OwnerId,
            Result: AuditResult.Success,
          }),
        ],
      };
    });

    const replenishment = await this.TryReleaseEmergencyReplenishment(result.PickTask, request, context);
    if (replenishment) {
      result.PickTask = await this.LinkReplenishmentTask(result.PickTask, result.MobileTask, replenishment, context);
    }

    return this.BuildResult(
      result.PickTask,
      result.MobileTask,
      ExceptionCaseDtoMapper.ToDto(result.ExceptionCase),
      replenishment,
      null,
      false,
    );
  }

  private async RequestSubstitutionForLoaded(
    loaded: LoadedPickTaskContext,
    request: NormalizedSubstitutionRequest,
    context: AuditContext,
  ): Promise<PickExceptionResultDto> {
    this.AssertActor(context);
    const { PickTask: pickTask, MobileTask: mobileTask } = loaded;
    await this.AssertPermissions(context.ActorUserId, pickTask, mobileTask, ActionCode.Update);
    this.AssertPickTaskMutable(pickTask, mobileTask);

    const fingerprint = this.Hash({
      Operation: 'RequestPickSubstitution',
      PickTaskId: pickTask.Id,
      MobileTaskId: mobileTask?.Id ?? null,
      SubstituteSkuId: request.SubstituteSkuId,
      SubstituteSkuCode: request.SubstituteSkuCode,
      SubstituteUomId: request.SubstituteUomId,
      SubstituteUomCode: request.SubstituteUomCode,
      Quantity: request.Quantity,
      PolicyDecision: request.PolicyDecision,
      PolicyReason: request.PolicyReason,
      ReasonCode: request.ReasonCode,
      ReasonNote: request.ReasonNote,
      EvidenceRefs: request.EvidenceRefs,
    });
    if (pickTask.SubstitutionIdempotencyKey === request.IdempotencyKey) {
      this.AssertSameFingerprint(pickTask.SubstitutionPayloadFingerprint, fingerprint);
      return this.BuildResult(
        pickTask,
        mobileTask,
        await this.LoadException(pickTask),
        null,
        await this.LoadApproval(pickTask),
        true,
      );
    }
    if (request.PolicyDecision === 'Disallow') {
      return this.RecordRejectedSubstitution(pickTask, mobileTask, request, context, fingerprint);
    }

    const catalog = await this.controlExceptionCatalog.ValidateExceptionType(PICK_SUBSTITUTION_CONTROL_CODE);
    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: request.ReasonCode,
      Action: ActionCode.Update,
      ObjectType: ObjectType.PickTask,
    });
    if (catalog.EvidenceRequired && request.EvidenceRefs.length === 0) {
      throw new BusinessRuleException('Pick substitution evidence is required');
    }

    let approval: ApprovalRequestDto | null = null;
    if (request.PolicyDecision === 'RequireApproval') {
      approval = await this.createApprovalRequest.Execute(
        {
          Action: ActionCode.Update,
          TargetObjectType: ObjectType.PickTask,
          TargetObjectId: pickTask.Id,
          TargetObjectCode: pickTask.TaskNumber,
          ReasonCode: request.ReasonCode,
          ReasonNote: request.ReasonNote,
          EvidenceRefs: request.EvidenceRefs,
          ReferenceType: 'PickSubstitution',
          ReferenceId: pickTask.Id,
        },
        context,
      );
    }

    const now = new Date();
    const evidence = this.BuildSubstitutionEvidence(pickTask, mobileTask, request);
    const auditEvidence = [evidence];
    const status =
      request.PolicyDecision === 'RequireApproval'
        ? PickSubstitutionStatus.PendingApproval
        : PickSubstitutionStatus.AutoApplied;

    const saved = await this.audited.Run<{ PickTask: PickTaskEntity; MobileTask: MobileTaskEntity | null }>(
      async (manager) => {
        const locked = await this.LockLoaded(pickTask.Id, mobileTask?.Id ?? null, manager);
        this.AssertPickTaskMutable(locked.PickTask, locked.MobileTask);
        locked.PickTask.SubstitutionStatus = status;
        locked.PickTask.SubstitutionSkuId = request.SubstituteSkuId;
        locked.PickTask.SubstitutionSkuCode = request.SubstituteSkuCode;
        locked.PickTask.SubstitutionUomId = request.SubstituteUomId;
        locked.PickTask.SubstitutionUomCode = request.SubstituteUomCode;
        locked.PickTask.SubstitutionQuantity = request.Quantity;
        locked.PickTask.SubstitutionApprovalRequestId = approval?.Id ?? null;
        locked.PickTask.SubstitutionPolicyJson = {
          PolicyDecision: request.PolicyDecision,
          PolicyReason: request.PolicyReason,
          OriginalSkuId: locked.PickTask.SkuId,
          OriginalSkuCode: locked.PickTask.SkuCode,
        };
        locked.PickTask.SubstitutionIdempotencyKey = request.IdempotencyKey;
        locked.PickTask.SubstitutionPayloadFingerprint = fingerprint;
        locked.PickTask.SubstitutionRequestedAt = now;
        locked.PickTask.SubstitutionRequestedBy = context.ActorUserId;
        const updatedTask = await this.pickReleases.SaveTask(locked.PickTask, manager);

        let updatedMobile = locked.MobileTask;
        if (updatedMobile && status === PickSubstitutionStatus.PendingApproval) {
          updatedMobile.TaskStatus = MobileTaskStatus.Blocked;
          updatedMobile.UpdatedAt = now;
          updatedMobile.UpdatedBy = context.ActorUserId;
          updatedMobile = await this.taskExecution.Save(updatedMobile, manager);
        }
        return {
          result: { PickTask: updatedTask, MobileTask: updatedMobile },
          entry: MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.PickTask,
            ObjectId: updatedTask.Id,
            ObjectCode: updatedTask.TaskNumber,
            AfterJson: PickReleaseDtoMapper.ToTaskDto(updatedTask) as unknown as Record<string, unknown>,
            ReasonCodeId: reason.ReasonCodeId,
            ReasonNote: request.ReasonNote ?? request.ReasonCode,
            EvidenceRefs: auditEvidence,
            ReferenceType: 'PickSubstitution',
            ReferenceId: approval?.Id ?? updatedTask.Id,
            WarehouseId: updatedMobile?.WarehouseId ?? null,
            OwnerId: updatedMobile?.OwnerId ?? null,
            Result: AuditResult.Success,
          }),
        };
      },
    );

    return this.BuildResult(
      saved.PickTask,
      saved.MobileTask,
      await this.LoadException(saved.PickTask),
      null,
      approval,
      false,
    );
  }

  private async RecordRejectedSubstitution(
    pickTask: PickTaskEntity,
    mobileTask: MobileTaskEntity | null,
    request: NormalizedSubstitutionRequest,
    context: AuditContext,
    fingerprint: string,
  ): Promise<PickExceptionResultDto> {
    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: request.ReasonCode,
      Action: ActionCode.Update,
      ObjectType: ObjectType.PickTask,
    });
    const evidence = this.BuildSubstitutionEvidence(pickTask, mobileTask, request);
    const auditEvidence = [evidence];
    await this.audited.Run(async () => ({
      result: null,
      entry: MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.PickTask,
        ObjectId: pickTask.Id,
        ObjectCode: pickTask.TaskNumber,
        AfterJson: {
          PickTaskId: pickTask.Id,
          SubstitutionStatus: PickSubstitutionStatus.Rejected,
          SubstituteSkuId: request.SubstituteSkuId,
          PolicyDecision: request.PolicyDecision,
          PolicyReason: request.PolicyReason,
          Fingerprint: fingerprint,
        },
        ReasonCodeId: reason.ReasonCodeId,
        ReasonNote: request.ReasonNote ?? request.PolicyReason ?? request.ReasonCode,
        EvidenceRefs: auditEvidence,
        ReferenceType: 'PickSubstitutionRejected',
        ReferenceId: pickTask.Id,
        WarehouseId: mobileTask?.WarehouseId ?? null,
        OwnerId: mobileTask?.OwnerId ?? null,
        Result: AuditResult.Failed,
      }),
    }));
    return {
      PickTask: PickReleaseDtoMapper.ToTaskDto(pickTask),
      MobileTask: mobileTask ? MobileTaskDtoMapper.ToDto(mobileTask) : null,
      ExceptionCase: await this.LoadException(pickTask),
      ReplenishmentRequired: pickTask.ReplenishmentRequired,
      ReplenishmentTask: null,
      SubstitutionStatus: PickSubstitutionStatus.Rejected,
      ApprovalRequest: null,
      IsDuplicate: false,
    };
  }

  private async TryReleaseEmergencyReplenishment(
    task: PickTaskEntity,
    request: NormalizedExceptionRequest,
    context: AuditContext,
  ): Promise<ReplenishmentTaskDto | null> {
    if (!this.releaseReplenishmentTask || !this.RequiresReplenishment(request.ExceptionType)) return null;
    if (!request.ReplenishmentTargetLocationId) return null;
    try {
      const result = await this.releaseReplenishmentTask.Execute(
        {
          TriggerType: ReplenishmentTriggerType.EmergencyShortPick,
          SourceBalanceId: task.SourceBalanceId,
          TargetLocationId: request.ReplenishmentTargetLocationId,
          Quantity: task.Quantity,
          ShortPickReference: task.Id,
          ReasonCode: REPLENISHMENT_REASON_CODE,
          ReasonNote: request.ReasonNote,
          EvidenceRefs: [...request.EvidenceRefs, `pick-task:${task.Id}`],
          IdempotencyKey: `pick-exception:${request.IdempotencyKey}:replenishment`,
        },
        context,
      );
      return result.ReplenishmentTask;
    } catch {
      return null;
    }
  }

  private async LinkReplenishmentTask(
    task: PickTaskEntity,
    mobileTask: MobileTaskEntity | null,
    replenishment: ReplenishmentTaskDto,
    context: AuditContext,
  ): Promise<PickTaskEntity> {
    const reason = await this.reasonCatalog.ValidateReason({
      ReasonCode: REPLENISHMENT_REASON_CODE,
      Action: ActionCode.Update,
      ObjectType: ObjectType.PickTask,
    });
    return this.audited.Run<PickTaskEntity>(async (manager) => {
      const locked = await this.LockLoaded(task.Id, mobileTask?.Id ?? null, manager);
      locked.PickTask.ReplenishmentTaskId = replenishment.Id;
      locked.PickTask.ReplenishmentRequired = true;
      const updatedTask = await this.pickReleases.SaveTask(locked.PickTask, manager);
      return {
        result: updatedTask,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Update,
          ObjectType: ObjectType.PickTask,
          ObjectId: updatedTask.Id,
          ObjectCode: updatedTask.TaskNumber,
          AfterJson: PickReleaseDtoMapper.ToTaskDto(updatedTask) as unknown as Record<string, unknown>,
          ReasonCodeId: reason.ReasonCodeId,
          ReasonNote: 'Emergency short-pick replenishment linked',
          EvidenceRefs: [`pick-task:${updatedTask.Id}`, `replenishment-task:${replenishment.Id}`],
          ReferenceType: 'PickReplenishmentLink',
          ReferenceId: replenishment.Id,
          WarehouseId: locked.MobileTask?.WarehouseId ?? null,
          OwnerId: locked.MobileTask?.OwnerId ?? null,
          Result: AuditResult.Success,
        }),
      };
    });
  }

  private async LoadByPickTask(pickTaskId: string, mobileTaskId: string | null): Promise<LoadedPickTaskContext> {
    const task = await this.pickReleases.FindTaskById(pickTaskId?.trim() ?? '');
    if (!task) throw new NotFoundException('Pick task not found', { PickTaskId: pickTaskId });
    const mobileTask = mobileTaskId
      ? await this.taskExecution.FindById(mobileTaskId)
      : await this.taskExecution.FindBySourceDocument('PickTask', task.Id);
    if (mobileTask) this.AssertMobileTaskMatches(task, mobileTask);
    return { PickTask: task, MobileTask: mobileTask };
  }

  private async LoadByMobileTask(mobileTaskId: string): Promise<LoadedPickTaskContext> {
    const mobileTask = await this.taskExecution.FindById(mobileTaskId?.trim() ?? '');
    if (!mobileTask) throw new NotFoundException('Mobile task not found', { MobileTaskId: mobileTaskId });
    if (mobileTask.TaskType !== MobileTaskType.Pick || mobileTask.SourceDocumentType !== 'PickTask') {
      throw new ConflictException('Mobile task is not a pick task', {
        MobileTaskId: mobileTask.Id,
        TaskType: mobileTask.TaskType,
        SourceDocumentType: mobileTask.SourceDocumentType,
      });
    }
    const task = await this.pickReleases.FindTaskById(mobileTask.SourceDocumentId);
    if (!task) throw new NotFoundException('Pick task not found', { PickTaskId: mobileTask.SourceDocumentId });
    return { PickTask: task, MobileTask: mobileTask };
  }

  private async LockLoaded(
    pickTaskId: string,
    mobileTaskId: string | null,
    manager: EntityManager,
  ): Promise<LoadedPickTaskContext> {
    const task = await this.pickReleases.FindTaskByIdForUpdate(pickTaskId, manager);
    if (!task) throw new NotFoundException('Pick task not found', { PickTaskId: pickTaskId });
    const mobileTask = mobileTaskId
      ? await this.taskExecution.FindByIdForUpdate(mobileTaskId, manager)
      : await this.taskExecution.FindBySourceDocument('PickTask', task.Id, manager);
    if (mobileTask) this.AssertMobileTaskMatches(task, mobileTask);
    return { PickTask: task, MobileTask: mobileTask };
  }

  private AssertMobileTaskMatches(task: PickTaskEntity, mobileTask: MobileTaskEntity): void {
    if (
      mobileTask.TaskType !== MobileTaskType.Pick ||
      mobileTask.SourceDocumentType !== 'PickTask' ||
      mobileTask.SourceDocumentId !== task.Id
    ) {
      throw new ConflictException('Mobile task does not match pick task', {
        PickTaskId: task.Id,
        MobileTaskId: mobileTask.Id,
      });
    }
  }

  private AssertPickTaskMutable(task: PickTaskEntity, mobileTask: MobileTaskEntity | null): void {
    if (task.Status === PickTaskStatus.Completed || task.Status === PickTaskStatus.Cancelled) {
      throw new BusinessRuleException('Pick task status does not allow exception handling', {
        PickTaskId: task.Id,
        PickTaskStatus: task.Status,
      });
    }
    if (mobileTask && [MobileTaskStatus.Completed, MobileTaskStatus.Cancelled].includes(mobileTask.TaskStatus)) {
      throw new BusinessRuleException('Mobile task status does not allow exception handling', {
        MobileTaskId: mobileTask.Id,
        MobileTaskStatus: mobileTask.TaskStatus,
      });
    }
  }

  private async AssertPermissions(
    actorUserId: string | null,
    task: PickTaskEntity,
    mobileTask: MobileTaskEntity | null,
    action: ActionCode,
  ): Promise<void> {
    if (!actorUserId) throw new ForbiddenAppException('Authenticated actor is required');
    if (mobileTask)
      await AssertMobileTaskPermission(this.permissionChecker, actorUserId, ActionCode.Update, mobileTask);
    if (!this.permissionChecker) return;
    const decision = await this.permissionChecker.Check({
      UserId: actorUserId,
      Action: action,
      ObjectType: ObjectType.PickTask,
      Scope: { WarehouseId: mobileTask?.WarehouseId ?? null, OwnerId: mobileTask?.OwnerId ?? null },
    });
    if (!decision.Allowed) {
      throw new ForbiddenAppException('Permission denied for pick exception action', {
        PickTaskId: task.Id,
        Action: action,
        Reason: decision.Reason ?? 'PERMISSION_DENIED',
      });
    }
  }

  private AssertActor(context: AuditContext): void {
    if (!context.ActorUserId) throw new ForbiddenAppException('Authenticated actor is required');
  }

  private NormalizeException(request: ReportPickExceptionDto): NormalizedExceptionRequest {
    const exceptionType = request.ExceptionType as PickExceptionType;
    if (!Object.values(PickExceptionType).includes(exceptionType)) {
      throw new BusinessRuleException('Unsupported pick exception type', { ExceptionType: request.ExceptionType });
    }
    const normalized: NormalizedExceptionRequest = {
      ...request,
      MobileTaskId: request.MobileTaskId?.trim() || null,
      ExceptionType: exceptionType,
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || DEFAULT_REASON_CODE,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      ObservedQuantity: this.NormalizeOptionalQuantity(request.ObservedQuantity),
      DamagedQuantity: this.NormalizeOptionalQuantity(request.DamagedQuantity),
      ObservedSkuId: request.ObservedSkuId?.trim() || null,
      ObservedSkuCode: request.ObservedSkuCode?.trim() || null,
      ReplenishmentTargetLocationId: request.ReplenishmentTargetLocationId?.trim() || null,
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!normalized.IdempotencyKey) throw new BusinessRuleException('IdempotencyKey is required for pick exception');
    if (normalized.EvidenceRefs.length === 0) throw new BusinessRuleException('EvidenceRefs are required');
    return normalized;
  }

  private NormalizeSubstitution(request: RequestPickSubstitutionDto): NormalizedSubstitutionRequest {
    const decision = request.PolicyDecision;
    if (!['Allow', 'RequireApproval', 'Disallow'].includes(decision)) {
      throw new BusinessRuleException('Unsupported substitution policy decision', { PolicyDecision: decision });
    }
    const quantity = this.NormalizeOptionalQuantity(request.Quantity) ?? 0;
    if (quantity <= 0) throw new BusinessRuleException('Substitution quantity must be positive');
    const normalized: NormalizedSubstitutionRequest = {
      ...request,
      MobileTaskId: request.MobileTaskId?.trim() || null,
      SubstituteSkuId: request.SubstituteSkuId?.trim() ?? '',
      SubstituteSkuCode: request.SubstituteSkuCode?.trim() || null,
      SubstituteUomId: request.SubstituteUomId?.trim() || null,
      SubstituteUomCode: request.SubstituteUomCode?.trim() || null,
      Quantity: quantity,
      PolicyDecision: decision,
      PolicyReason: request.PolicyReason?.trim() || null,
      ReasonCode: request.ReasonCode?.trim().toUpperCase() || DEFAULT_REASON_CODE,
      ReasonNote: request.ReasonNote?.trim() || null,
      EvidenceRefs: this.NormalizeEvidence(request.EvidenceRefs),
      IdempotencyKey: request.IdempotencyKey?.trim() ?? '',
    };
    if (!normalized.SubstituteSkuId) throw new BusinessRuleException('SubstituteSkuId is required');
    if (!normalized.IdempotencyKey) throw new BusinessRuleException('IdempotencyKey is required for pick substitution');
    if (normalized.EvidenceRefs.length === 0) throw new BusinessRuleException('EvidenceRefs are required');
    return normalized;
  }

  private NormalizeOptionalQuantity(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new BusinessRuleException('Quantity must be zero or positive');
    return number;
  }

  private NormalizeEvidence(value?: string[]): string[] {
    return (value ?? []).map((item) => item.trim()).filter(Boolean);
  }

  private RequiresReplenishment(type: PickExceptionType): boolean {
    return type === PickExceptionType.ShortPick || type === PickExceptionType.NoStock;
  }

  private BuildExceptionEvidence(
    task: PickTaskEntity,
    mobileTask: MobileTaskEntity | null,
    request: NormalizedExceptionRequest,
  ): Record<string, unknown> {
    return {
      PickTaskId: task.Id,
      MobileTaskId: mobileTask?.Id ?? null,
      ExceptionType: request.ExceptionType,
      ExpectedSkuId: task.SkuId,
      ExpectedSkuCode: task.SkuCode,
      ExpectedQuantity: task.Quantity,
      ObservedQuantity: request.ObservedQuantity,
      DamagedQuantity: request.DamagedQuantity,
      ObservedSkuId: request.ObservedSkuId,
      ObservedSkuCode: request.ObservedSkuCode,
      EvidenceRefs: request.EvidenceRefs,
    };
  }

  private BuildSubstitutionEvidence(
    task: PickTaskEntity,
    mobileTask: MobileTaskEntity | null,
    request: NormalizedSubstitutionRequest,
  ): Record<string, unknown> {
    return {
      PickTaskId: task.Id,
      MobileTaskId: mobileTask?.Id ?? null,
      OriginalSkuId: task.SkuId,
      OriginalSkuCode: task.SkuCode,
      SubstituteSkuId: request.SubstituteSkuId,
      SubstituteSkuCode: request.SubstituteSkuCode,
      Quantity: request.Quantity,
      PolicyDecision: request.PolicyDecision,
      PolicyReason: request.PolicyReason,
      EvidenceRefs: request.EvidenceRefs,
    };
  }

  private async LoadException(task: PickTaskEntity): Promise<ExceptionCaseDto | null> {
    if (!task.ExceptionCaseId) return null;
    const entity = await this.exceptionCases.FindById(task.ExceptionCaseId);
    return entity ? ExceptionCaseDtoMapper.ToDto(entity) : null;
  }

  private async LoadApproval(task: PickTaskEntity): Promise<ApprovalRequestDto | null> {
    if (!task.SubstitutionApprovalRequestId) return null;
    const entity = await this.approvalRequests.FindById(task.SubstitutionApprovalRequestId);
    return entity ? ApprovalRequestDtoMapper.ToDto(entity) : null;
  }

  private BuildResult(
    pickTask: PickTaskEntity,
    mobileTask: MobileTaskEntity | null,
    exceptionCase: ExceptionCaseDto | null,
    replenishmentTask: ReplenishmentTaskDto | null,
    approvalRequest: ApprovalRequestDto | null,
    isDuplicate: boolean,
  ): PickExceptionResultDto {
    return {
      PickTask: PickReleaseDtoMapper.ToTaskDto(pickTask),
      MobileTask: mobileTask ? MobileTaskDtoMapper.ToDto(mobileTask) : null,
      ExceptionCase: exceptionCase,
      ReplenishmentRequired: pickTask.ReplenishmentRequired || Boolean(replenishmentTask),
      ReplenishmentTask: replenishmentTask,
      SubstitutionStatus: pickTask.SubstitutionStatus,
      ApprovalRequest: approvalRequest,
      IsDuplicate: isDuplicate,
    };
  }

  private AssertSameFingerprint(actual: string | null, expected: string): void {
    if (actual !== expected) {
      throw new ConflictException('Pick exception idempotency key already used for a different payload');
    }
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
