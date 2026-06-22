import { BusinessRuleException, ForbiddenAppException, NotFoundException } from '@common/Exceptions/AppException';
import { EntityManager } from 'typeorm';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { AuditResult } from '@modules/AccessControl/Domain/Enums/AuditResult';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { SkuBarcodeDto } from '@modules/MasterData/Application/DTOs/SkuBarcodeDto';
import { ISkuBarcodeRepository } from '@modules/MasterData/Application/Interfaces/ISkuBarcodeRepository';
import { SkuBarcodeMapper } from '@modules/MasterData/Application/Mappers/SkuBarcodeMapper';
import { SkuBarcodeEntity } from '@modules/MasterData/Domain/Entities/SkuBarcodeEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { MobileScanEventDto } from '@modules/TaskExecution/Application/DTOs/MobileScanEventDto';
import { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { MobileScanEventDtoMapper } from '@modules/TaskExecution/Application/Mappers/MobileScanEventDtoMapper';
import { Gs1Parser } from '@modules/TaskExecution/Application/Services/Gs1Parser';
import { BuildMobileTaskAudit } from '@modules/TaskExecution/Application/UseCases/MobileTaskAudit';
import { AssertMobileTaskPermission } from '@modules/TaskExecution/Application/UseCases/MobileTaskPermission';
import { MobileScanEventEntity } from '@modules/TaskExecution/Domain/Entities/MobileScanEventEntity';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { MobileScanResult } from '@modules/TaskExecution/Domain/Enums/MobileScanResult';
import { MobileScanType } from '@modules/TaskExecution/Domain/Enums/MobileScanType';
import { MobileTaskStatus } from '@modules/TaskExecution/Domain/Enums/MobileTaskStatus';

export interface RecordMobileScanInput {
  TaskId: string;
  ScanType: MobileScanType;
  RawValue: string;
  ManualEntry?: boolean;
  ReasonCode?: string | null;
  DeviceCode?: string | null;
  SessionId?: string | null;
}

interface ScanPolicyPayload {
  MandatoryScanTypes?: string[];
  AllowManualOverride?: boolean;
}

interface BarcodeResolutionResult {
  Result: MobileScanResult;
  NormalizedValue: string;
  ParsedValueJson: Record<string, unknown>;
  Barcode?: SkuBarcodeDto;
  RejectionCode?: string;
  RejectionMessage?: string;
}

const TERMINAL_STATUSES = new Set<MobileTaskStatus>([MobileTaskStatus.Completed, MobileTaskStatus.Cancelled]);

export class RecordMobileScanUseCase {
  constructor(
    private readonly tasks: ITaskExecutionRepository,
    private readonly skuBarcodes: ISkuBarcodeRepository,
    private readonly permissionChecker: IPermissionChecker | undefined,
    private readonly audited: AuditedTransaction,
    private readonly reasonCatalog?: IReasonCodeCatalog,
  ) {}

  public async Execute(input: RecordMobileScanInput, context: AuditContext): Promise<MobileScanEventDto> {
    const actorUserId = context.ActorUserId;
    if (!actorUserId) {
      throw new ForbiddenAppException('Authentication required', { Reason: 'NO_USER' });
    }

    const task = await this.tasks.FindById(input.TaskId);
    if (!task) {
      throw new NotFoundException('Mobile task not found', { Id: input.TaskId });
    }
    await AssertMobileTaskPermission(this.permissionChecker, actorUserId, ActionCode.Update, task);
    if (TERMINAL_STATUSES.has(task.TaskStatus)) {
      throw new BusinessRuleException('Mobile task cannot accept scans in terminal status', {
        Reason: 'TASK_STATUS_NOT_SCANNABLE',
        TaskStatus: task.TaskStatus,
      });
    }

    if (input.ManualEntry) {
      return this.RecordManualEntry(input, task, context);
    }

    if (input.ScanType === MobileScanType.Item) {
      const resolution = await this.ResolveItemBarcode(input.RawValue, task);
      return this.tasks.RunInTransaction(async (manager) => {
        const lockedTask = await this.LoadScannableTaskForUpdate(input.TaskId, manager);
        const scan = this.BuildScan(input, lockedTask, actorUserId, {
          Result: resolution.Result,
          NormalizedValue: resolution.NormalizedValue,
          ParsedValueJson: resolution.ParsedValueJson,
          ResolvedObjectType: resolution.Barcode ? 'SKU' : null,
          ResolvedObjectId: resolution.Barcode?.SkuId ?? null,
          RejectionCode: resolution.RejectionCode ?? null,
          RejectionMessage: resolution.RejectionMessage ?? null,
        });
        const saved = await this.tasks.SaveScanEvent(scan, manager);
        return MobileScanEventDtoMapper.ToDto(saved);
      });
    }

    return this.tasks.RunInTransaction(async (manager) => {
      const lockedTask = await this.LoadScannableTaskForUpdate(input.TaskId, manager);
      const scan = this.BuildScan(input, lockedTask, actorUserId, {
        Result: MobileScanResult.Accepted,
        NormalizedValue: input.RawValue.trim(),
        ParsedValueJson: {},
      });
      return MobileScanEventDtoMapper.ToDto(await this.tasks.SaveScanEvent(scan, manager));
    });
  }

  private async RecordManualEntry(
    input: RecordMobileScanInput,
    task: MobileTaskEntity,
    context: AuditContext,
  ): Promise<MobileScanEventDto> {
    const actorUserId = context.ActorUserId;
    const policy = this.ReadPolicy(task);
    const mandatory = policy.MandatoryScanTypes?.includes(input.ScanType) ?? false;
    const allowManualOverride = policy.AllowManualOverride !== false;
    let reasonCodeId: string | null = null;

    if (mandatory && (!allowManualOverride || !input.ReasonCode)) {
      const scan = this.BuildScan(input, task, actorUserId, {
        Result: MobileScanResult.Rejected,
        NormalizedValue: input.RawValue.trim(),
        RejectionCode: allowManualOverride ? 'REASON_REQUIRED' : 'MANUAL_OVERRIDE_DISABLED',
        RejectionMessage: allowManualOverride
          ? 'ReasonCode is required for mandatory manual scan override'
          : 'Manual override is disabled by scan policy',
      });
      return this.RecordManualScanWithAudit(scan, task, context, AuditResult.Blocked, null);
    }

    if (input.ReasonCode && this.reasonCatalog) {
      const validated = await this.reasonCatalog.ValidateReason({
        ReasonCode: input.ReasonCode,
        Action: ActionCode.Update,
        ObjectType: ObjectType.MobileTask,
      });
      reasonCodeId = validated.ReasonCodeId;
    }

    const scan = this.BuildScan(input, task, actorUserId, {
      Result: MobileScanResult.ManualOverrideAccepted,
      NormalizedValue: input.RawValue.trim(),
      ReasonCode: input.ReasonCode ?? null,
    });
    return this.RecordManualScanWithAudit(scan, task, context, AuditResult.Success, reasonCodeId);
  }

  private async RecordManualScanWithAudit(
    scan: MobileScanEventEntity,
    task: MobileTaskEntity,
    context: AuditContext,
    result: AuditResult,
    reasonCodeId: string | null,
  ): Promise<MobileScanEventDto> {
    const saved = await this.audited.Run(async (manager) => {
      const lockedTask = await this.LoadScannableTaskForUpdate(task.Id, manager);
      scan.TaskCode = lockedTask.TaskCode;
      scan.WarehouseId = lockedTask.WarehouseId;
      scan.OwnerId = lockedTask.OwnerId;
      const persisted = await this.tasks.SaveScanEvent(scan, manager);
      return {
        result: MobileScanEventDtoMapper.ToDto(persisted),
        entry: BuildMobileTaskAudit(context, lockedTask, {
          Action: ActionCode.Update,
          ObjectCode: scan.Result === MobileScanResult.Rejected ? 'SCAN_OVERRIDE_DENIED' : 'SCAN_OVERRIDE',
          AfterJson: MobileScanEventDtoMapper.ToDto(persisted) as unknown as Record<string, unknown>,
          Result: result,
          ReasonCodeId: reasonCodeId,
          ReasonNote: scan.ReasonCode ?? scan.RejectionCode,
        }),
      };
    });
    return saved;
  }

  private async ResolveItemBarcode(rawValue: string, task: MobileTaskEntity): Promise<BarcodeResolutionResult> {
    const parsed = Gs1Parser.Parse(rawValue);
    const normalized = parsed.Gtin ?? rawValue.trim();
    if (parsed.InvalidFields?.includes('Quantity')) {
      return this.Rejected(normalized, parsed, 'INVALID_GS1_QUANTITY', 'GS1 quantity must be numeric');
    }
    const candidates = await this.skuBarcodes.FindCandidatesByValue(normalized);
    if (candidates.length === 0) {
      return this.Rejected(normalized, parsed, 'UNRESOLVED_BARCODE', 'Barcode could not be resolved');
    }

    const scopeCandidates = candidates.filter(
      (barcode) => barcode.OwnerId === task.OwnerId || barcode.OwnerId === null,
    );
    if (scopeCandidates.length === 0) {
      return this.Rejected(normalized, parsed, 'OWNER_SCOPE_MISMATCH', 'Barcode is outside task owner scope');
    }

    const ownerScopedCandidates = scopeCandidates.filter((barcode) => barcode.OwnerId === task.OwnerId);
    const resolutionCandidates =
      ownerScopedCandidates.length > 0
        ? ownerScopedCandidates
        : scopeCandidates.filter((barcode) => barcode.OwnerId === null);

    const valid: SkuBarcodeEntity[] = [];
    for (const candidate of resolutionCandidates) {
      const rejection = this.ValidateAlias(candidate);
      if (rejection) {
        if (resolutionCandidates.length === 1) {
          return this.Rejected(normalized, parsed, rejection.Code, rejection.Message);
        }
        continue;
      }
      valid.push(candidate);
    }

    if (valid.length === 0) {
      return this.Rejected(normalized, parsed, 'UNRESOLVED_BARCODE', 'No active and effective barcode alias found');
    }
    if (valid.length > 1) {
      return this.Rejected(normalized, parsed, 'AMBIGUOUS_BARCODE', 'Barcode resolves to multiple aliases in scope');
    }

    return {
      Result: MobileScanResult.Accepted,
      NormalizedValue: normalized,
      ParsedValueJson: parsed,
      Barcode: SkuBarcodeMapper.ToDto(valid[0]),
    };
  }

  private ValidateAlias(barcode: SkuBarcodeEntity): { Code: string; Message: string } | null {
    const now = new Date();
    if (barcode.Status !== MasterDataStatus.Active) {
      return { Code: 'ALIAS_INACTIVE', Message: 'Barcode alias is inactive' };
    }
    if (barcode.EffectiveFrom && barcode.EffectiveFrom > now) {
      return { Code: 'ALIAS_NOT_EFFECTIVE', Message: 'Barcode alias is not yet effective' };
    }
    if (barcode.EffectiveTo && barcode.EffectiveTo < now) {
      return { Code: 'ALIAS_EXPIRED', Message: 'Barcode alias is expired' };
    }
    return null;
  }

  private Rejected(
    normalizedValue: string,
    parsedValueJson: Record<string, unknown>,
    rejectionCode: string,
    rejectionMessage: string,
  ): BarcodeResolutionResult {
    return {
      Result: MobileScanResult.Rejected,
      NormalizedValue: normalizedValue,
      ParsedValueJson: parsedValueJson,
      RejectionCode: rejectionCode,
      RejectionMessage: rejectionMessage,
    };
  }

  private BuildScan(
    input: RecordMobileScanInput,
    task: MobileTaskEntity,
    actorUserId: string | null,
    result: {
      Result: MobileScanResult;
      NormalizedValue: string;
      ParsedValueJson?: Record<string, unknown>;
      ResolvedObjectType?: string | null;
      ResolvedObjectId?: string | null;
      RejectionCode?: string | null;
      RejectionMessage?: string | null;
      ReasonCode?: string | null;
    },
  ): MobileScanEventEntity {
    return new MobileScanEventEntity({
      TaskId: task.Id,
      TaskCode: task.TaskCode,
      WarehouseId: task.WarehouseId,
      OwnerId: task.OwnerId,
      ScanType: input.ScanType,
      RawValue: input.RawValue,
      NormalizedValue: result.NormalizedValue,
      Result: result.Result,
      ResolvedObjectType: result.ResolvedObjectType ?? null,
      ResolvedObjectId: result.ResolvedObjectId ?? null,
      ParsedValueJson: result.ParsedValueJson ?? {},
      RejectionCode: result.RejectionCode ?? null,
      RejectionMessage: result.RejectionMessage ?? null,
      ReasonCode: result.ReasonCode ?? input.ReasonCode ?? null,
      DeviceCode: input.DeviceCode ?? null,
      SessionId: input.SessionId ?? null,
      ActorUserId: actorUserId,
    });
  }

  private ReadPolicy(task: MobileTaskEntity): ScanPolicyPayload {
    const raw = task.TaskPayload?.ScanPolicy;
    if (!raw || typeof raw !== 'object') return {};
    const candidate = raw as ScanPolicyPayload;
    const validScanTypes = new Set<string>(Object.values(MobileScanType));
    return {
      MandatoryScanTypes: Array.isArray(candidate.MandatoryScanTypes)
        ? candidate.MandatoryScanTypes.filter((scanType) => validScanTypes.has(scanType))
        : [],
      AllowManualOverride:
        typeof candidate.AllowManualOverride === 'boolean' ? candidate.AllowManualOverride : undefined,
    };
  }

  private async LoadScannableTaskForUpdate(taskId: string, manager: EntityManager): Promise<MobileTaskEntity> {
    const task = await this.tasks.FindByIdForUpdate(taskId, manager);
    if (!task) {
      throw new NotFoundException('Mobile task not found', { Id: taskId });
    }
    if (TERMINAL_STATUSES.has(task.TaskStatus)) {
      throw new BusinessRuleException('Mobile task cannot accept scans in terminal status', {
        Reason: 'TASK_STATUS_NOT_SCANNABLE',
        TaskStatus: task.TaskStatus,
      });
    }
    return task;
  }
}
