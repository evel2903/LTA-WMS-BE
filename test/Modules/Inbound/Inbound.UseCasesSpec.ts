import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import {
  PermissionCheckContext,
  PermissionDecision,
} from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { InboundPlanDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { CancelInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/CancelInboundPlanUseCase';
import { CaptureInboundDiscrepancyUseCase } from '@modules/Inbound/Application/UseCases/CaptureInboundDiscrepancyUseCase';
import { ConfirmInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/ConfirmInboundPlanUseCase';
import { ConfirmReceiptLineUseCase } from '@modules/Inbound/Application/UseCases/ConfirmReceiptLineUseCase';
import { CreateInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/CreateInboundPlanUseCase';
import { UpdateInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/UpdateInboundPlanUseCase';
import { GetInboundOperationalStateUseCase } from '@modules/Inbound/Application/UseCases/GetInboundOperationalStateUseCase';
import { GetInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/GetInboundPlanUseCase';
import { ListInboundPlansUseCase } from '@modules/Inbound/Application/UseCases/ListInboundPlansUseCase';
import { RecordGateInUseCase } from '@modules/Inbound/Application/UseCases/RecordGateInUseCase';
import { EvaluateQcTaskUseCase } from '@modules/Inbound/Application/UseCases/EvaluateQcTaskUseCase';
import { ConfirmInboundLpnUseCase } from '@modules/Inbound/Application/UseCases/ConfirmInboundLpnUseCase';
import { ReleaseInboundToPutawayUseCase } from '@modules/Inbound/Application/UseCases/ReleaseInboundToPutawayUseCase';
import { ReleasePutawayTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/ReleasePutawayTaskUseCase';
import { ConfirmPutawayTaskUseCase } from '@modules/InventoryExecution/Application/UseCases/ConfirmPutawayTaskUseCase';
import { IPutawayTaskRepository } from '@modules/InventoryExecution/Application/Interfaces/IPutawayTaskRepository';
import { IInventoryTransactionRepository } from '@modules/InventoryExecution/Application/Interfaces/IInventoryTransactionRepository';
import { ILocationProfileRepository } from '@modules/MasterData/Application/Interfaces/ILocationProfileRepository';
import { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { PutawayTaskEntity } from '@modules/InventoryExecution/Domain/Entities/PutawayTaskEntity';
import { PutawayTaskStatus } from '@modules/InventoryExecution/Domain/Enums/PutawayTaskStatus';
import { InventoryMovementEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryMovementEntity';
import { InventoryTransactionEntity } from '@modules/InventoryExecution/Domain/Entities/InventoryTransactionEntity';
import { LocationProfileEntity } from '@modules/MasterData/Domain/Entities/LocationProfileEntity';
import { MobileTaskEntity } from '@modules/TaskExecution/Domain/Entities/MobileTaskEntity';
import { BuildEmptyPutawayRuleGate } from '@test/TestDoubles/InventoryExecution/PutawayRuleGateTestDoubles';
import { RecordQcResultUseCase } from '@modules/Inbound/Application/UseCases/RecordQcResultUseCase';
import { StartReceivingSessionUseCase } from '@modules/Inbound/Application/UseCases/StartReceivingSessionUseCase';
import { ValidateReceivingReadinessUseCase } from '@modules/Inbound/Application/UseCases/ValidateReceivingReadinessUseCase';
import { InboundPlanEntity } from '@modules/Inbound/Domain/Entities/InboundPlanEntity';
import { InboundPlanLineEntity } from '@modules/Inbound/Domain/Entities/InboundPlanLineEntity';
import { InboundDiscrepancyEntity } from '@modules/Inbound/Domain/Entities/InboundDiscrepancyEntity';
import { InboundLpnEntity } from '@modules/Inbound/Domain/Entities/InboundLpnEntity';
import { InboundPutawayReleaseEntity } from '@modules/Inbound/Domain/Entities/InboundPutawayReleaseEntity';
import { QcResultEntity } from '@modules/Inbound/Domain/Entities/QcResultEntity';
import { QcTaskEntity } from '@modules/Inbound/Domain/Entities/QcTaskEntity';
import { InboundDiscrepancyStatus } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyStatus';
import { InboundDiscrepancyToleranceDecision } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyToleranceDecision';
import { InboundDiscrepancyType } from '@modules/Inbound/Domain/Enums/InboundDiscrepancyType';
import { QcDispositionCode } from '@modules/Inbound/Domain/Enums/QcDispositionCode';
import { QcResultStatus } from '@modules/Inbound/Domain/Enums/QcResultStatus';
import { QcTaskStatus } from '@modules/Inbound/Domain/Enums/QcTaskStatus';
import { ReceiptEntity } from '@modules/Inbound/Domain/Entities/ReceiptEntity';
import { ReceiptLineEntity } from '@modules/Inbound/Domain/Entities/ReceiptLineEntity';
import { ReceivingSessionEntity } from '@modules/Inbound/Domain/Entities/ReceivingSessionEntity';
import { InboundGateInStatus } from '@modules/Inbound/Domain/Enums/InboundGateInStatus';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';
import { ReceiptLineDiscrepancySignal } from '@modules/Inbound/Domain/Enums/ReceiptLineDiscrepancySignal';
import { ReceiptLineStatus } from '@modules/Inbound/Domain/Enums/ReceiptLineStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { LocationEntity } from '@modules/MasterData/Domain/Entities/LocationEntity';
import { LocationStatus } from '@modules/MasterData/Domain/Enums/LocationStatus';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { PartnerEntity } from '@modules/PartnerMaster/Domain/Entities/PartnerEntity';
import { PartnerRiskLevel } from '@modules/PartnerMaster/Domain/Enums/PartnerRiskLevel';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { InventoryDimensionKeyService } from '@modules/MasterData/Application/Services/InventoryDimensionKeyService';
import {
  MakeInventoryStatus,
  MemoryInventoryBalanceRepository,
  MemoryInventoryDimensionRepository,
  MemoryInventoryStatusRepository,
} from '@test/Modules/MasterData/InventoryTestDoubles';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';
import { WarehouseProfileRuleEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileRuleEntity';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { ILocationRepository } from '@modules/MasterData/Application/Interfaces/ILocationRepository';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IPartnerRepository } from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { InboundRuleAttributeKeys, InboundRuleGate } from '@modules/Inbound/Application/Services/InboundRuleGate';
import { RuleResolver } from '@modules/WarehouseProfile/Application/Services/RuleResolver';
import { SeedRuleGroupCatalog } from '@modules/WarehouseProfile/Application/Services/RuleGroupCatalogSeed';
import {
  SeedInboundRuleBaseline,
  InboundBaselineProfileCode,
  InboundBaselineWarehouseTypeCode,
} from '@modules/WarehouseProfile/Application/Services/InboundRuleBaselineSeed';
import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { RuleDecision } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleDecision';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';
import {
  InMemoryRuleGroupRepository,
  InMemoryRuleDefinitionRepository,
  InMemoryWarehouseProfileRuleRepository,
} from '@test/TestDoubles/WarehouseProfile/RuleTestDoubles';
import { InMemoryWarehouseProfileRepository } from '@test/TestDoubles/WarehouseProfile/WarehouseProfileTestDoubles';
import { InMemoryWarehouseRepository } from '@test/TestDoubles/MasterData/MasterDataTestDoubles';

const now = new Date('2026-06-22T08:00:00.000Z');

class FakeInboundRepository implements IInboundPlanRepository {
  public Plans: InboundPlanEntity[] = [];
  public Lines: InboundPlanLineEntity[] = [];
  public CreateCalls = 0;
  public MissBusinessKeyOnce = false;
  public ThrowConflictOnCreate = false;

  public async Create(
    plan: InboundPlanEntity,
    lines: InboundPlanLineEntity[],
  ): Promise<{ Plan: InboundPlanEntity; Lines: InboundPlanLineEntity[] }> {
    this.CreateCalls += 1;
    if (this.ThrowConflictOnCreate) {
      this.ThrowConflictOnCreate = false;
      throw new ConflictException('Inbound plan already exists');
    }
    this.Plans.push(plan);
    this.Lines.push(...lines);
    return { Plan: plan, Lines: lines };
  }

  public async UpdatePlan(plan: InboundPlanEntity): Promise<InboundPlanEntity> {
    const index = this.Plans.findIndex((item) => item.Id === plan.Id);
    if (index >= 0) this.Plans[index] = plan;
    return plan;
  }

  public async ReplaceLines(planId: string, lines: InboundPlanLineEntity[]): Promise<InboundPlanLineEntity[]> {
    this.Lines = this.Lines.filter((line) => line.InboundPlanId !== planId);
    this.Lines.push(...lines);
    return lines;
  }

  public async FindById(id: string): Promise<{ Plan: InboundPlanEntity; Lines: InboundPlanLineEntity[] } | null> {
    const plan = this.Plans.find((item) => item.Id === id);
    if (!plan) return null;
    return { Plan: plan, Lines: this.Lines.filter((line) => line.InboundPlanId === id) };
  }

  public async FindByIdForUpdate(
    id: string,
  ): Promise<{ Plan: InboundPlanEntity; Lines: InboundPlanLineEntity[] } | null> {
    return this.FindById(id);
  }

  public async FindByBusinessKey(
    sourceSystem: string,
    sourceDocumentType: string,
    sourceDocumentNumber: string,
    ownerId: string,
    warehouseId: string,
  ): Promise<{ Plan: InboundPlanEntity; Lines: InboundPlanLineEntity[] } | null> {
    if (this.MissBusinessKeyOnce) {
      this.MissBusinessKeyOnce = false;
      return null;
    }
    const plan = this.Plans.find(
      (item) =>
        item.SourceSystem === sourceSystem &&
        item.SourceDocumentType === sourceDocumentType &&
        item.SourceDocumentNumber === sourceDocumentNumber &&
        item.OwnerId === ownerId &&
        item.WarehouseId === warehouseId,
    );
    if (!plan) return null;
    return { Plan: plan, Lines: this.Lines.filter((line) => line.InboundPlanId === plan.Id) };
  }

  public async List(
    skip: number,
    take: number,
    filter?: Parameters<IInboundPlanRepository['List']>[2],
  ): Promise<{ Items: Array<{ Plan: InboundPlanEntity; Lines: InboundPlanLineEntity[] }>; TotalItems: number }> {
    const candidates = this.Plans.filter((plan) => this.MatchFilter(plan, filter));
    const page = candidates.slice(skip, skip + take).map((plan) => ({
      Plan: plan,
      Lines: this.Lines.filter((line) => line.InboundPlanId === plan.Id),
    }));
    return { Items: page, TotalItems: candidates.length };
  }

  public async FindCandidates(
    filter?: Parameters<IInboundPlanRepository['FindCandidates']>[0],
  ): Promise<Array<{ Plan: InboundPlanEntity; Lines: InboundPlanLineEntity[] }>> {
    return this.Plans.filter((plan) => this.MatchFilter(plan, filter)).map((plan) => ({
      Plan: plan,
      Lines: this.Lines.filter((line) => line.InboundPlanId === plan.Id),
    }));
  }

  private MatchFilter(plan: InboundPlanEntity, filter?: Parameters<IInboundPlanRepository['FindCandidates']>[0]) {
    if (!filter) return true;
    if (filter.SourceSystem && plan.SourceSystem !== filter.SourceSystem) return false;
    if (filter.SourceDocumentNumber && plan.SourceDocumentNumber !== filter.SourceDocumentNumber) return false;
    if (filter.OwnerId && plan.OwnerId !== filter.OwnerId) return false;
    if (filter.WarehouseId && plan.WarehouseId !== filter.WarehouseId) return false;
    if (filter.Status && plan.Status !== filter.Status) return false;
    return true;
  }
}

class FakeReceivingRepository implements IReceivingRepository {
  public Sessions: ReceivingSessionEntity[] = [];
  public Receipts: ReceiptEntity[] = [];
  public Lines: ReceiptLineEntity[] = [];
  public Discrepancies: InboundDiscrepancyEntity[] = [];
  public Lpns: InboundLpnEntity[] = [];
  public PutawayReleases: InboundPutawayReleaseEntity[] = [];
  public QcTasks: QcTaskEntity[] = [];
  public QcResults: QcResultEntity[] = [];

  public async CreateSessionWithReceipt(
    session: ReceivingSessionEntity,
    receipt: ReceiptEntity,
  ): Promise<{ Session: ReceivingSessionEntity; Receipt: ReceiptEntity }> {
    const existingReceiptIndex = this.Receipts.findIndex((item) => item.Id === receipt.Id);
    if (existingReceiptIndex >= 0) this.Receipts[existingReceiptIndex] = receipt;
    else this.Receipts.push(receipt);
    if (
      this.Sessions.some(
        (item) => item.InboundPlanId === session.InboundPlanId && item.SessionKey === session.SessionKey,
      )
    ) {
      throw new ConflictException('Receiving session already exists');
    }
    this.Sessions.push(session);
    return { Session: session, Receipt: receipt };
  }

  public async FindOpenSessionByPlanAndKey(
    inboundPlanId: string,
    sessionKey: string,
  ): Promise<{ Session: ReceivingSessionEntity; Receipt: ReceiptEntity } | null> {
    const session = this.Sessions.find(
      (item) => item.InboundPlanId === inboundPlanId && item.SessionKey === sessionKey,
    );
    if (!session) return null;
    const receipt = this.Receipts.find((item) => item.Id === session.ReceiptId);
    if (!receipt) return null;
    return { Session: session, Receipt: receipt };
  }

  public async FindReceiptById(id: string): Promise<ReceiptEntity | null> {
    return this.Receipts.find((item) => item.Id === id) ?? null;
  }

  public async FindReceiptByInboundPlanId(inboundPlanId: string): Promise<ReceiptEntity | null> {
    return this.Receipts.find((item) => item.InboundPlanId === inboundPlanId) ?? null;
  }

  public async UpdateReceipt(receipt: ReceiptEntity): Promise<ReceiptEntity> {
    const index = this.Receipts.findIndex((item) => item.Id === receipt.Id);
    if (index >= 0) this.Receipts[index] = receipt;
    else this.Receipts.push(receipt);
    return receipt;
  }

  public async CreateReceiptLine(line: ReceiptLineEntity): Promise<ReceiptLineEntity> {
    if (this.Lines.some((item) => item.ReceiptId === line.ReceiptId && item.IdempotencyKey === line.IdempotencyKey)) {
      throw new ConflictException('Receipt line already exists');
    }
    this.Lines.push(line);
    return line;
  }

  public async FindReceiptLineByIdempotencyKey(
    receiptId: string,
    idempotencyKey: string,
  ): Promise<ReceiptLineEntity | null> {
    return this.Lines.find((item) => item.ReceiptId === receiptId && item.IdempotencyKey === idempotencyKey) ?? null;
  }

  public async FindReceiptLineById(id: string): Promise<ReceiptLineEntity | null> {
    return this.Lines.find((item) => item.Id === id) ?? null;
  }

  public async FindReceiptLineBySkuAndSerial(skuId: string, serialNumber: string): Promise<ReceiptLineEntity | null> {
    return this.Lines.find((item) => item.SkuId === skuId && item.SerialNumber === serialNumber) ?? null;
  }

  public async CreateInboundDiscrepancy(discrepancy: InboundDiscrepancyEntity): Promise<InboundDiscrepancyEntity> {
    if (
      this.Discrepancies.some(
        (item) => item.ReceiptId === discrepancy.ReceiptId && item.IdempotencyKey === discrepancy.IdempotencyKey,
      )
    ) {
      throw new ConflictException('Inbound discrepancy already exists');
    }
    this.Discrepancies.push(discrepancy);
    return discrepancy;
  }

  public async FindInboundDiscrepancyByIdempotencyKey(
    receiptId: string,
    idempotencyKey: string,
  ): Promise<InboundDiscrepancyEntity | null> {
    return (
      this.Discrepancies.find((item) => item.ReceiptId === receiptId && item.IdempotencyKey === idempotencyKey) ?? null
    );
  }

  public async ListInboundDiscrepancies(
    skip: number,
    take: number,
  ): Promise<{ Items: InboundDiscrepancyEntity[]; TotalItems: number }> {
    return { Items: this.Discrepancies.slice(skip, skip + take), TotalItems: this.Discrepancies.length };
  }

  public async CreateInboundLpn(lpn: InboundLpnEntity): Promise<InboundLpnEntity> {
    if (
      this.Lpns.some((item) => item.ReceiptLineId === lpn.ReceiptLineId && item.IdempotencyKey === lpn.IdempotencyKey)
    ) {
      throw new ConflictException('Inbound LPN already exists');
    }
    if (
      this.Lpns.some(
        (item) => item.WarehouseId === lpn.WarehouseId && item.OwnerId === lpn.OwnerId && item.LpnCode === lpn.LpnCode,
      )
    ) {
      throw new ConflictException('Inbound LPN scope already exists');
    }
    this.Lpns.push(lpn);
    return lpn;
  }

  public async FindInboundLpnById(id: string): Promise<InboundLpnEntity | null> {
    return this.Lpns.find((item) => item.Id === id) ?? null;
  }

  public async FindInboundLpnByReceiptLineId(receiptLineId: string): Promise<InboundLpnEntity | null> {
    return this.Lpns.find((item) => item.ReceiptLineId === receiptLineId) ?? null;
  }

  public async FindInboundLpnByIdempotencyKey(
    receiptLineId: string,
    idempotencyKey: string,
  ): Promise<InboundLpnEntity | null> {
    return (
      this.Lpns.find((item) => item.ReceiptLineId === receiptLineId && item.IdempotencyKey === idempotencyKey) ?? null
    );
  }

  public async FindInboundLpnByScopeCode(
    warehouseId: string,
    ownerId: string,
    lpnCode: string,
  ): Promise<InboundLpnEntity | null> {
    return (
      this.Lpns.find(
        (item) => item.WarehouseId === warehouseId && item.OwnerId === ownerId && item.LpnCode === lpnCode,
      ) ?? null
    );
  }

  public async CreateInboundPutawayRelease(release: InboundPutawayReleaseEntity): Promise<InboundPutawayReleaseEntity> {
    if (
      this.PutawayReleases.some(
        (item) => item.ReceiptLineId === release.ReceiptLineId && item.IdempotencyKey === release.IdempotencyKey,
      )
    ) {
      throw new ConflictException('Inbound putaway release already exists');
    }
    this.PutawayReleases.push(release);
    return release;
  }

  public async FindInboundPutawayReleaseById(id: string): Promise<InboundPutawayReleaseEntity | null> {
    return this.PutawayReleases.find((item) => item.Id === id) ?? null;
  }

  public async FindInboundPutawayReleaseByIdempotencyKey(
    receiptLineId: string,
    idempotencyKey: string,
  ): Promise<InboundPutawayReleaseEntity | null> {
    return (
      this.PutawayReleases.find(
        (item) => item.ReceiptLineId === receiptLineId && item.IdempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  public async CreateQcTask(task: QcTaskEntity): Promise<QcTaskEntity> {
    if (this.QcTasks.some((item) => item.ReceiptId === task.ReceiptId && item.IdempotencyKey === task.IdempotencyKey)) {
      throw new ConflictException('QC task already exists');
    }
    this.QcTasks.push(task);
    return task;
  }

  public async UpdateQcTask(task: QcTaskEntity): Promise<QcTaskEntity> {
    const index = this.QcTasks.findIndex((item) => item.Id === task.Id);
    if (index >= 0) this.QcTasks[index] = task;
    else this.QcTasks.push(task);
    return task;
  }

  public async FindQcTaskById(id: string): Promise<QcTaskEntity | null> {
    return this.QcTasks.find((item) => item.Id === id) ?? null;
  }

  public async FindQcTaskByIdempotencyKey(receiptId: string, idempotencyKey: string): Promise<QcTaskEntity | null> {
    return this.QcTasks.find((item) => item.ReceiptId === receiptId && item.IdempotencyKey === idempotencyKey) ?? null;
  }

  public async FindLatestQcTaskByReceiptLineId(receiptLineId: string): Promise<QcTaskEntity | null> {
    return (
      [...this.QcTasks]
        .filter((item) => item.ReceiptLineId === receiptLineId)
        .sort((a, b) => b.CreatedAt.getTime() - a.CreatedAt.getTime())[0] ?? null
    );
  }

  public async CreateQcResult(result: QcResultEntity): Promise<QcResultEntity> {
    if (
      this.QcResults.some((item) => item.QcTaskId === result.QcTaskId && item.IdempotencyKey === result.IdempotencyKey)
    ) {
      throw new ConflictException('QC result already exists');
    }
    this.QcResults.push(result);
    return result;
  }

  public async FindQcResultByIdempotencyKey(qcTaskId: string, idempotencyKey: string): Promise<QcResultEntity | null> {
    return this.QcResults.find((item) => item.QcTaskId === qcTaskId && item.IdempotencyKey === idempotencyKey) ?? null;
  }

  public async FindLatestQcResultByReceiptLineId(receiptLineId: string): Promise<QcResultEntity | null> {
    return (
      [...this.QcResults]
        .filter((item) => item.ReceiptLineId === receiptLineId)
        .sort((a, b) => b.RecordedAt.getTime() - a.RecordedAt.getTime())[0] ?? null
    );
  }

  public async ListReceivingSessionsByInboundPlanId(inboundPlanId: string): Promise<ReceivingSessionEntity[]> {
    return this.Sessions.filter((item) => item.InboundPlanId === inboundPlanId);
  }

  public async ListReceiptLinesByReceiptId(receiptId: string): Promise<ReceiptLineEntity[]> {
    return this.Lines.filter((item) => item.ReceiptId === receiptId);
  }

  public async ListQcTasksByReceiptId(receiptId: string): Promise<QcTaskEntity[]> {
    return this.QcTasks.filter((item) => item.ReceiptId === receiptId);
  }

  public async ListQcResultsByReceiptId(receiptId: string): Promise<QcResultEntity[]> {
    return this.QcResults.filter((item) => item.ReceiptId === receiptId);
  }

  public async ListInboundLpnsByReceiptId(receiptId: string): Promise<InboundLpnEntity[]> {
    return this.Lpns.filter((item) => item.ReceiptId === receiptId);
  }

  public async ListInboundPutawayReleasesByReceiptId(receiptId: string): Promise<InboundPutawayReleaseEntity[]> {
    return this.PutawayReleases.filter((item) => item.ReceiptId === receiptId);
  }

  public async ListInboundDiscrepanciesByReceiptId(receiptId: string): Promise<InboundDiscrepancyEntity[]> {
    return this.Discrepancies.filter((item) => item.ReceiptId === receiptId);
  }
}

class FakeExceptionCaseRepository implements IExceptionCaseRepository {
  public Cases: ExceptionCaseEntity[] = [];

  public async FindById(id: string): Promise<ExceptionCaseEntity | null> {
    return this.Cases.find((item) => item.Id === id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<ExceptionCaseEntity | null> {
    return this.FindById(id);
  }

  public async Create(entity: ExceptionCaseEntity): Promise<ExceptionCaseEntity> {
    this.Cases.push(entity);
    return entity;
  }

  public async Update(entity: ExceptionCaseEntity): Promise<ExceptionCaseEntity> {
    const index = this.Cases.findIndex((item) => item.Id === entity.Id);
    if (index >= 0) this.Cases[index] = entity;
    return entity;
  }

  public async List(): Promise<{ Items: ExceptionCaseEntity[]; TotalItems: number }> {
    return { Items: this.Cases, TotalItems: this.Cases.length };
  }
}

const supplier = () =>
  new PartnerEntity({
    Id: 'supplier-1',
    PartnerCode: 'SUP-A',
    PartnerName: 'Supplier A',
    PartnerType: PartnerType.Supplier,
    Status: PartnerStatus.Active,
    SourceSystem: 'ERP',
    ExternalReference: 'SUP-A',
    CreatedAt: now,
    UpdatedAt: now,
  });

const owner = () =>
  new OwnerEntity({
    Id: 'owner-1',
    OwnerCode: 'OWN-A',
    OwnerName: 'Owner A',
    Status: MasterDataStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
  });

const warehouse = () =>
  new WarehouseEntity({
    Id: 'warehouse-1',
    SiteId: 'site-1',
    WarehouseCode: 'WT-01',
    WarehouseName: 'Warehouse WT-01',
    WarehouseTypeCode: 'WT-01',
    Status: MasterDataStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
  });

const uom = () =>
  new UomEntity({
    Id: 'uom-1',
    UomCode: 'EA',
    UomName: 'Each',
    Status: MasterDataStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
  });

const sku = (overrides: Partial<ConstructorParameters<typeof SkuEntity>[0]> = {}) =>
  new SkuEntity({
    Id: 'sku-1',
    SkuCode: 'SKU-A',
    SkuName: 'SKU A',
    ItemClass: 'General',
    ItemStatus: SkuStatus.Active,
    BaseUomId: 'uom-1',
    InventoryUomId: 'uom-1',
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });

const location = (overrides: Partial<ConstructorParameters<typeof LocationEntity>[0]> = {}) =>
  new LocationEntity({
    Id: 'location-receiving-1',
    WarehouseId: 'warehouse-1',
    ZoneId: 'zone-receiving-1',
    LocationCode: 'RECEIVING',
    LocationName: 'Receiving Staging',
    LocationType: 'DOCK',
    LocationProfileId: 'profile-dock-1',
    LocationStatus: LocationStatus.Active,
    CreatedAt: now,
    UpdatedAt: now,
    ...overrides,
  });

const profile = (strategyPolicy: Record<string, unknown> = {}, thresholdPolicy: Record<string, unknown> = {}) =>
  new WarehouseProfileEntity({
    Id: 'profile-1',
    ProfileCode: 'WT01-PROFILE',
    ProfileName: 'WT01 Profile',
    WarehouseTypeCode: 'WT-01',
    Version: 1,
    Status: WarehouseProfileStatus.Active,
    WarehouseId: 'warehouse-1',
    OwnerId: 'owner-1',
    ScopeKey: 'warehouse-1:owner-1',
    EffectiveFrom: now,
    EffectiveTo: null,
    StrategyPolicy: strategyPolicy,
    ThresholdPolicy: thresholdPolicy,
    CreatedAt: now,
    UpdatedAt: now,
  });

/**
 * Real InboundRuleGate over a RuleResolver with NO rules seeded — every Decide() returns an empty
 * decision (Matched=false), so callers fall back to their previous hardcoded policy path. This is
 * the default gate in repoBundle: existing tests keep exercising the backward-compat path (ADR-5).
 */
const emptyInboundRuleGate = (): InboundRuleGate => {
  const groups = new InMemoryRuleGroupRepository();
  const definitions = new InMemoryRuleDefinitionRepository();
  const bindings = new InMemoryWarehouseProfileRuleRepository();
  const profiles = new InMemoryWarehouseProfileRepository();
  const warehouses = new InMemoryWarehouseRepository();
  warehouses.Seed(warehouse());
  const resolver = new RuleResolver(profiles, definitions, bindings, groups, new ConditionEvaluator());
  return new InboundRuleGate(resolver, warehouses);
};

/**
 * Stub IRuleResolver that returns ApprovalRequired=true ONLY when the LPN-specific Attributes
 * (lpnControlled/hasLpn) are present in the context — every other decision point sharing this same
 * bundle.ruleGate (gate-in, tolerance, QC) gets an empty decision so their own fallback paths stay
 * unaffected. No seeded R-INBOUND rule has ApprovalRequired ControlMode for LPN, so this stub is the
 * only way to exercise the `|| decision.ApprovalRequired` half of IRE-04's ruleLpnRequired OR
 * without inventing new seed data (out of scope for IRE-04).
 */
class ApprovalRequiredRuleResolver implements IRuleResolver {
  public async Resolve(context: RuleEvaluationContext): Promise<RuleDecision> {
    const isLpnContext = context.Attributes?.[InboundRuleAttributeKeys.LpnControlled] !== undefined;
    return {
      Winner: null,
      Allowed: true,
      ApprovalRequired: isLpnContext,
      OrderedCandidates: [],
      EffectivePriorities: {},
      ReasonReadiness: null,
    };
  }
}

const approvalRequiredInboundRuleGate = (): InboundRuleGate => {
  const warehouses = new InMemoryWarehouseRepository();
  warehouses.Seed(warehouse());
  return new InboundRuleGate(new ApprovalRequiredRuleResolver(), warehouses);
};

/**
 * Real InboundRuleGate over a RuleResolver with the WT-01 baseline rules seeded (IRE-00), bound to
 * a demo profile whose WarehouseId/OwnerId match the plans built by createRequest ('warehouse-1' /
 * 'owner-1'). Used by the IRE-02 rule-driven parity tests.
 */
const seededInboundRuleGate = async (): Promise<InboundRuleGate> => {
  const groups = new InMemoryRuleGroupRepository();
  await SeedRuleGroupCatalog(groups);
  const definitions = new InMemoryRuleDefinitionRepository();
  const bindings = new InMemoryWarehouseProfileRuleRepository();
  const profiles = new InMemoryWarehouseProfileRepository();
  await profiles.Create(
    new WarehouseProfileEntity({
      Id: 'wp-demo-ire02',
      ProfileCode: InboundBaselineProfileCode,
      ProfileName: 'Demo WT-01 (IRE-02 spec)',
      WarehouseTypeCode: InboundBaselineWarehouseTypeCode,
      WarehouseId: 'warehouse-1',
      OwnerId: 'owner-1',
      Version: 1,
      Status: WarehouseProfileStatus.Active,
      ScopeKey: 'warehouse-1:owner-1',
      EffectiveFrom: now,
      CreatedAt: now,
      UpdatedAt: now,
    }),
  );
  const seed = await SeedInboundRuleBaseline(groups, definitions, bindings, profiles);
  expect(seed.DefinitionsCreated).toBe(9);
  // Make seeded rules clock-independent: SeedInboundRuleBaseline stamps EffectiveFrom=2026-07-01,
  // but Decide() sets no EvaluatedAt so the resolver defaults to the wall clock. Pin the seeded
  // definitions to a safely-past date so these parity tests never flip on a machine/CI clock.
  const seededDefs = await definitions.List(0, 100, {});
  for (const def of seededDefs.Items) {
    def.EffectiveFrom = new Date('2020-01-01T00:00:00.000Z');
  }
  const warehouses = new InMemoryWarehouseRepository();
  warehouses.Seed(warehouse());
  const resolver = new RuleResolver(profiles, definitions, bindings, groups, new ConditionEvaluator());
  return new InboundRuleGate(resolver, warehouses);
};

const createRequest = () => ({
  SourceSystem: 'ERP',
  SourceDocumentType: 'ASN',
  SourceDocumentNumber: 'ASN-10001',
  SupplierId: 'supplier-1',
  OwnerId: 'owner-1',
  WarehouseId: 'warehouse-1',
  WarehouseProfileId: 'profile-1',
  ExpectedArrivalAt: now,
  Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 12, ExternalLineReference: '10' }],
});

const repoBundle = () => {
  const inbound = new FakeInboundRepository();
  const receiving = new FakeReceivingRepository();
  const exceptionCases = new FakeExceptionCaseRepository();
  const partners = { FindById: jest.fn<Promise<PartnerEntity | null>, [string]>(async () => supplier()) };
  const owners = { FindById: jest.fn(async () => owner()) };
  const warehouses = { FindById: jest.fn(async () => warehouse()) };
  const skus = { FindById: jest.fn<Promise<SkuEntity | null>, [string]>(async () => sku()) };
  const locations = {
    FindByWarehouseAndCode: jest.fn<Promise<LocationEntity | null>, [string, string]>(async (_warehouseId, code) =>
      location({ LocationCode: code }),
    ),
    FindById: jest.fn<Promise<LocationEntity | null>, [string]>(async (id) => location({ Id: id })),
  };
  const uoms = { FindById: jest.fn(async () => uom()) };
  const coreFlows = {
    Instances: [] as unknown[],
    Milestones: [] as unknown[],
    CreateInstance: jest.fn(async (instance) => {
      coreFlows.Instances.push(instance);
      return instance;
    }),
    CreateMilestone: jest.fn(async (milestone) => {
      coreFlows.Milestones.push(milestone);
      return milestone;
    }),
    FindInstanceByBusinessReference: jest.fn(async () => null),
    FindInstanceById: jest.fn(async () => ({ Id: 'core-flow-1', BusinessReference: 'ERP:ASN:ASN-10001' })),
  };
  const integrations = {
    Outbox: [] as unknown[],
    FindOutboxMessageByMessageId: jest.fn(async () => null),
    CreateOutboxMessage: jest.fn(async (message) => {
      integrations.Outbox.push(message);
      return message;
    }),
  };
  const profiles = { FindById: jest.fn(async () => profile()) };
  const reasonCatalog = {
    ValidateReason: jest.fn(async () => ({
      ReasonCodeId: 'reason-1',
      EvidenceRequired: false,
      ApprovalRequired: false,
    })),
  };
  const controlExceptionCatalog = {
    ValidateExceptionType: jest.fn(async () => ({
      Code: 'CTRL-EX-04',
      Severity: ControlExceptionSeverity.Medium,
    })),
  };
  const labelBlocking = {
    Execute: jest.fn(async () => ({
      Allowed: true,
      Blocked: false,
      Decision: 'NotRequired',
      RequiredLabelType: null,
      PolicyMode: 'None',
      OverrideAllowed: false,
      OverrideAccepted: false,
      Reason: 'No label blocking rule required for this action.',
      MatchedPrintJobId: null,
      MatchedPrintJobCode: null,
      ValidationDetails: {},
    })),
  };
  const permissionChecker = {
    Check: jest.fn<Promise<PermissionDecision>, [PermissionCheckContext]>(async () => ({ Allowed: true })),
  };
  const inventoryStatuses = new MemoryInventoryStatusRepository([
    MakeInventoryStatus({ Id: 'status-ready-for-putaway', StatusCode: 'READY_FOR_PUTAWAY' }),
    MakeInventoryStatus({ Id: 'status-available-ifb17', StatusCode: 'AVAILABLE' }),
  ]);
  const inventoryDimensions = new MemoryInventoryDimensionRepository();
  const inventoryBalances = new MemoryInventoryBalanceRepository();
  const dimensionKeyService = new InventoryDimensionKeyService();
  const auditEntries: unknown[] = [];
  const audited = {
    Entries: auditEntries,
    Run: jest.fn(async (work: Parameters<AuditedTransaction['Run']>[0]) => {
      const { result, entry } = await work(undefined as never);
      auditEntries.push(entry);
      return result;
    }),
  };
  return {
    inbound,
    receiving,
    exceptionCases,
    partners,
    owners,
    warehouses,
    skus,
    locations,
    uoms,
    coreFlows,
    integrations,
    profiles,
    ruleGate: emptyInboundRuleGate() as InboundRuleGate,
    reasonCatalog,
    controlExceptionCatalog,
    labelBlocking,
    permissionChecker,
    inventoryStatuses,
    inventoryDimensions,
    inventoryBalances,
    dimensionKeyService,
    audited,
  };
};

const createUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new CreateInboundPlanUseCase(
    bundle.inbound,
    bundle.partners as unknown as IPartnerRepository,
    bundle.owners as unknown as IOwnerRepository,
    bundle.warehouses as unknown as IWarehouseRepository,
    bundle.skus as unknown as ISkuRepository,
    bundle.uoms as unknown as IUomRepository,
    bundle.profiles as unknown as IWarehouseProfileRepository,
    bundle.audited as unknown as AuditedTransaction,
  );

const confirmInboundPlanUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new ConfirmInboundPlanUseCase(
    bundle.inbound,
    bundle.coreFlows as unknown as ICoreFlowRepository,
    bundle.integrations as unknown as IIntegrationRepository,
    bundle.audited as unknown as AuditedTransaction,
    bundle.permissionChecker,
  );

const updateInboundPlanUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new UpdateInboundPlanUseCase(
    bundle.inbound,
    bundle.partners as unknown as IPartnerRepository,
    bundle.owners as unknown as IOwnerRepository,
    bundle.warehouses as unknown as IWarehouseRepository,
    bundle.skus as unknown as ISkuRepository,
    bundle.uoms as unknown as IUomRepository,
    bundle.profiles as unknown as IWarehouseProfileRepository,
    bundle.audited as unknown as AuditedTransaction,
    bundle.permissionChecker,
  );

const cancelInboundPlanUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new CancelInboundPlanUseCase(
    bundle.inbound,
    bundle.audited as unknown as AuditedTransaction,
    bundle.permissionChecker,
  );

// IFB-24: real flow is Draft -> Confirm -> gate-in/receiving/... -- CoreFlowInstanceId
// is null until Confirm, so any test exercising CoreFlow milestones needs this,
// not just createUseCase(bundle).Execute(...) alone.
const createConfirmedPlan = async (bundle: ReturnType<typeof repoBundle>) => {
  const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
  return confirmInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);
};

const recordGateInUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new RecordGateInUseCase(
    bundle.inbound,
    bundle.coreFlows as unknown as ICoreFlowRepository,
    bundle.audited as unknown as AuditedTransaction,
    bundle.permissionChecker,
  );

const readinessUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new ValidateReceivingReadinessUseCase(
    bundle.inbound,
    bundle.profiles as unknown as IWarehouseProfileRepository,
    bundle.ruleGate,
    bundle.reasonCatalog,
    bundle.audited as unknown as AuditedTransaction,
    bundle.permissionChecker,
  );

const startReceivingUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new StartReceivingSessionUseCase(
    bundle.inbound,
    bundle.receiving,
    readinessUseCase(bundle),
    bundle.audited as unknown as AuditedTransaction,
    bundle.permissionChecker,
  );

const confirmReceiptLineUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new ConfirmReceiptLineUseCase(
    bundle.inbound,
    bundle.receiving,
    bundle.coreFlows as unknown as ICoreFlowRepository,
    bundle.integrations as unknown as IIntegrationRepository,
    bundle.reasonCatalog,
    readinessUseCase(bundle),
    bundle.skus as unknown as ISkuRepository,
    bundle.audited as unknown as AuditedTransaction,
    bundle.permissionChecker,
  );

const captureInboundDiscrepancyUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new CaptureInboundDiscrepancyUseCase(
    bundle.inbound,
    bundle.receiving,
    bundle.exceptionCases,
    bundle.controlExceptionCatalog as never,
    bundle.profiles as unknown as IWarehouseProfileRepository,
    bundle.ruleGate,
    bundle.coreFlows as unknown as ICoreFlowRepository,
    bundle.integrations as unknown as IIntegrationRepository,
    bundle.reasonCatalog,
    bundle.audited as unknown as AuditedTransaction,
    bundle.permissionChecker,
  );

const evaluateQcTaskUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new EvaluateQcTaskUseCase(
    bundle.inbound,
    bundle.receiving,
    bundle.profiles as unknown as IWarehouseProfileRepository,
    bundle.ruleGate,
    bundle.partners as unknown as IPartnerRepository,
    bundle.skus as unknown as ISkuRepository,
    bundle.coreFlows as unknown as ICoreFlowRepository,
    bundle.integrations as unknown as IIntegrationRepository,
    bundle.reasonCatalog,
    bundle.audited as unknown as AuditedTransaction,
    bundle.permissionChecker,
  );

const confirmInboundLpnUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new ConfirmInboundLpnUseCase(
    bundle.inbound,
    bundle.receiving,
    bundle.reasonCatalog,
    bundle.audited as unknown as AuditedTransaction,
    bundle.permissionChecker,
  );

const releaseInboundToPutawayUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new ReleaseInboundToPutawayUseCase(
    bundle.inbound,
    bundle.receiving,
    bundle.profiles as unknown as IWarehouseProfileRepository,
    bundle.ruleGate,
    bundle.labelBlocking as never,
    bundle.coreFlows as unknown as ICoreFlowRepository,
    bundle.integrations as unknown as IIntegrationRepository,
    bundle.reasonCatalog,
    bundle.skus as unknown as ISkuRepository,
    bundle.locations as unknown as ILocationRepository,
    bundle.inventoryDimensions,
    bundle.inventoryBalances,
    bundle.inventoryStatuses,
    bundle.dimensionKeyService,
    bundle.audited as unknown as AuditedTransaction,
    bundle.permissionChecker,
  );

const recordQcResultUseCase = (bundle: ReturnType<typeof repoBundle>) =>
  new RecordQcResultUseCase(
    bundle.inbound,
    bundle.receiving,
    bundle.coreFlows as unknown as ICoreFlowRepository,
    bundle.integrations as unknown as IIntegrationRepository,
    bundle.reasonCatalog,
    bundle.audited as unknown as AuditedTransaction,
    bundle.permissionChecker,
  );

describe('Inbound plan use cases', () => {
  // IFB-24: plans are born Draft, with no CoreFlow instance/outbox event yet --
  // those move to ConfirmInboundPlanUseCase (see the 'Confirm/Update/Cancel'
  // describe block below).
  it('creates inbound plan as Draft, lines persisted, no CoreFlow/outbox side effects yet', async () => {
    const bundle = repoBundle();
    const result = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    expect(result.Status).toBe(InboundPlanDocumentStatus.Draft);
    expect(result.CoreFlowInstanceId).toBeNull();
    expect(result.GateInStatus).toBe(InboundGateInStatus.NotRecorded);
    expect(result.Lines).toHaveLength(1);
    expect(result.IsDuplicate).toBe(false);
    expect(bundle.inbound.CreateCalls).toBe(1);
    expect(bundle.coreFlows.CreateInstance).not.toHaveBeenCalled();
    expect(bundle.integrations.CreateOutboxMessage).not.toHaveBeenCalled();
    expect(bundle.audited.Entries).toHaveLength(1);
    expect(bundle.audited.Entries[0]).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.InboundPlan,
      WarehouseId: 'warehouse-1',
      OwnerId: 'owner-1',
    });
  });

  it('dedupes duplicate source document by business key without a second plan', async () => {
    const bundle = repoBundle();
    const useCase = createUseCase(bundle);

    await useCase.Execute(createRequest(), SystemAuditContext);
    const duplicate = await useCase.Execute(createRequest(), SystemAuditContext);

    expect(duplicate.IsDuplicate).toBe(true);
    expect(bundle.inbound.CreateCalls).toBe(1);
    expect(bundle.audited.Entries).toHaveLength(2);
    expect(bundle.audited.Entries[1]).toMatchObject({ ReferenceType: 'InboundPlanDuplicate' });
  });

  it('returns existing inbound plan when unique conflict happens after duplicate precheck', async () => {
    const bundle = repoBundle();
    const useCase = createUseCase(bundle);

    const created = await useCase.Execute(createRequest(), SystemAuditContext);
    bundle.inbound.MissBusinessKeyOnce = true;
    bundle.inbound.ThrowConflictOnCreate = true;
    const duplicate = await useCase.Execute(createRequest(), SystemAuditContext);

    expect(duplicate.Id).toBe(created.Id);
    expect(duplicate.IsDuplicate).toBe(true);
    expect(bundle.inbound.CreateCalls).toBe(2);
    expect(bundle.inbound.Plans).toHaveLength(1);
  });

  it('rejects missing supplier before persistence and downstream effects', async () => {
    const bundle = repoBundle();
    bundle.partners.FindById.mockResolvedValue(null as never);

    await expect(createUseCase(bundle).Execute(createRequest(), SystemAuditContext)).rejects.toThrow(
      BusinessRuleException,
    );

    expect(bundle.inbound.CreateCalls).toBe(0);
    expect(bundle.coreFlows.CreateInstance).not.toHaveBeenCalled();
    expect(bundle.integrations.CreateOutboxMessage).not.toHaveBeenCalled();
  });

  it('rejects missing WarehouseProfile before persistence and downstream effects', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(null as never);

    await expect(createUseCase(bundle).Execute(createRequest(), SystemAuditContext)).rejects.toThrow(
      BusinessRuleException,
    );

    expect(bundle.inbound.CreateCalls).toBe(0);
    expect(bundle.coreFlows.CreateInstance).not.toHaveBeenCalled();
    expect(bundle.integrations.CreateOutboxMessage).not.toHaveBeenCalled();
  });
});

describe('IFB-24: Confirm/Update/Cancel inbound plan use cases', () => {
  it('confirms a Draft plan to Planned, creating the CoreFlow instance and InboundPlanReceived outbox event', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    const confirmed = await confirmInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    expect(confirmed.Status).toBe(InboundPlanDocumentStatus.Planned);
    expect(confirmed.CoreFlowInstanceId).not.toBeNull();
    expect(bundle.coreFlows.CreateInstance).toHaveBeenCalledWith(
      expect.objectContaining({ CurrentStage: CoreFlowStageCode.Inbound }),
      undefined,
    );
    expect(bundle.integrations.CreateOutboxMessage).toHaveBeenCalledWith(
      expect.objectContaining({ EventType: 'InboundPlanReceived', Status: OutboxMessageStatus.Pending }),
      undefined,
    );
    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.InboundPlan,
      ReferenceType: 'InboundPlanConfirm',
    });
  });

  it('rejects confirming a plan that is not Draft', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const useCase = confirmInboundPlanUseCase(bundle);
    await useCase.Execute({ Id: created.Id }, SystemAuditContext);

    await expect(useCase.Execute({ Id: created.Id }, SystemAuditContext)).rejects.toThrow(BusinessRuleException);
    // Confirming twice must not create a second CoreFlow instance or outbox event.
    expect(bundle.coreFlows.Instances).toHaveLength(1);
    expect(bundle.integrations.Outbox).toHaveLength(1);
  });

  it('replaces header and lines while Draft', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    const updated = await updateInboundPlanUseCase(bundle).Execute(
      {
        Id: created.Id,
        SourceSystem: 'ERP',
        SourceDocumentType: 'ASN',
        SourceDocumentNumber: 'ASN-10001',
        SupplierId: 'supplier-1',
        OwnerId: 'owner-1',
        WarehouseId: 'warehouse-1',
        WarehouseProfileId: 'profile-1',
        ExpectedArrivalAt: new Date('2026-07-01T00:00:00.000Z'),
        ExpectedUpdatedAt: created.UpdatedAt,
        Lines: [
          { LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 99, ExternalLineReference: 'edited-1' },
          { LineNumber: 2, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 5, ExternalLineReference: 'edited-2' },
        ],
      },
      SystemAuditContext,
    );

    expect(updated.ExpectedArrivalAt).toEqual(new Date('2026-07-01T00:00:00.000Z'));
    expect(updated.Lines).toHaveLength(2);
    expect(updated.Lines.map((line) => line.ExpectedQuantity).sort()).toEqual([5, 99]);
    // Full replace, not append/merge -- the original single line (qty 12, ref '10') must be gone.
    expect(bundle.inbound.Lines.filter((line) => line.InboundPlanId === created.Id)).toHaveLength(2);
    expect(bundle.inbound.Lines.some((line) => line.ExpectedQuantity === 12)).toBe(false);
    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.InboundPlan,
      ReferenceType: 'InboundPlan',
    });
  });

  it('rejects updating a plan that is not Draft', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    await confirmInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    await expect(
      updateInboundPlanUseCase(bundle).Execute(
        { Id: created.Id, ...createRequest(), ExpectedArrivalAt: new Date(), ExpectedUpdatedAt: created.UpdatedAt },
        SystemAuditContext,
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects updating into a business key already used by another plan', async () => {
    const bundle = repoBundle();
    const planA = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const planB = await createUseCase(bundle).Execute(
      { ...createRequest(), SourceDocumentNumber: 'ASN-10002' },
      SystemAuditContext,
    );

    await expect(
      updateInboundPlanUseCase(bundle).Execute(
        {
          Id: planB.Id,
          ...createRequest(),
          SourceDocumentNumber: 'ASN-10001',
          ExpectedUpdatedAt: planB.UpdatedAt,
        },
        SystemAuditContext,
      ),
    ).rejects.toThrow(ConflictException);
    expect(planA.Id).not.toBe(planB.Id);
  });

  it('soft-cancels a Draft plan to Cancelled', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    const cancelled = await cancelInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    expect(cancelled.Status).toBe(InboundPlanDocumentStatus.Cancelled);
    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      Action: ActionCode.DeleteCancel,
      ObjectType: ObjectType.InboundPlan,
      ReferenceType: 'InboundPlanCancel',
    });
  });

  it('rejects cancelling a plan that is not Draft', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    await confirmInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    await expect(cancelInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext)).rejects.toThrow(
      BusinessRuleException,
    );
  });
});

describe('IFB-24 review fix: permission scope, locked-transition, request validation', () => {
  it('rejects moving a plan into a Warehouse/Owner scope the actor has no Update grant on, even though the old scope is allowed', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    bundle.warehouses.FindById.mockResolvedValueOnce(
      new WarehouseEntity({
        Id: 'warehouse-2',
        SiteId: 'site-1',
        WarehouseCode: 'WT-02',
        WarehouseName: 'Warehouse WT-02',
        WarehouseTypeCode: 'WT-02',
        Status: MasterDataStatus.Active,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    bundle.permissionChecker.Check.mockImplementation(async (context) =>
      context.Scope?.WarehouseId === 'warehouse-2' ? { Allowed: false, Reason: 'OUT_OF_SCOPE' } : { Allowed: true },
    );

    await expect(
      updateInboundPlanUseCase(bundle).Execute(
        { Id: created.Id, ...createRequest(), WarehouseId: 'warehouse-2', ExpectedUpdatedAt: created.UpdatedAt },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(ForbiddenAppException);
    // Denied before any mutation -- the plan must be untouched.
    expect(bundle.inbound.Plans.find((plan) => plan.Id === created.Id)?.WarehouseId).toBe('warehouse-1');
  });

  it("evaluates Confirm's Draft-only guard against the locked read, not the earlier pre-check read (closes the concurrent-confirm race)", async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    // Simulate a concurrent winner: by the time this transaction acquires the lock,
    // another already-committed Confirm has moved the row to Planned. FindById (the
    // fail-fast pre-check) still sees the stale Draft snapshot it read earlier.
    const lockedPlan = bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!;
    const findByIdForUpdateSpy = jest.spyOn(bundle.inbound, 'FindByIdForUpdate').mockResolvedValueOnce({
      Plan: new InboundPlanEntity({ ...lockedPlan, Status: InboundPlanDocumentStatus.Planned }),
      Lines: [],
    });

    await expect(confirmInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext)).rejects.toThrow(
      BusinessRuleException,
    );
    expect(findByIdForUpdateSpy).toHaveBeenCalledWith(created.Id, undefined);
    // Must not create a second CoreFlow/outbox off the stale pre-check read.
    expect(bundle.coreFlows.Instances).toHaveLength(0);
    expect(bundle.integrations.Outbox).toHaveLength(0);
  });

  it("evaluates Update's Draft-only guard against the locked read, not the earlier pre-check read", async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const lockedPlan = bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!;
    jest.spyOn(bundle.inbound, 'FindByIdForUpdate').mockResolvedValueOnce({
      Plan: new InboundPlanEntity({ ...lockedPlan, Status: InboundPlanDocumentStatus.Planned }),
      Lines: [],
    });

    await expect(
      updateInboundPlanUseCase(bundle).Execute(
        { Id: created.Id, ...createRequest(), ExpectedUpdatedAt: created.UpdatedAt },
        SystemAuditContext,
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it("evaluates Cancel's Draft-only guard against the locked read, not the earlier pre-check read", async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const lockedPlan = bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!;
    jest.spyOn(bundle.inbound, 'FindByIdForUpdate').mockResolvedValueOnce({
      Plan: new InboundPlanEntity({ ...lockedPlan, Status: InboundPlanDocumentStatus.Planned }),
      Lines: [],
    });

    await expect(cancelInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext)).rejects.toThrow(
      BusinessRuleException,
    );
  });

  it('rejects a non-integer LineNumber', async () => {
    const bundle = repoBundle();
    await expect(
      createUseCase(bundle).Execute(
        { ...createRequest(), Lines: [{ LineNumber: 1.5, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 12 }] },
        SystemAuditContext,
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects duplicate LineNumbers within the same request', async () => {
    const bundle = repoBundle();
    await expect(
      updateInboundPlanUseCase(bundle).Execute(
        {
          Id: 'does-not-matter',
          ...createRequest(),
          ExpectedUpdatedAt: new Date().toISOString(),
          Lines: [
            { LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 12 },
            { LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 5 },
          ],
        },
        SystemAuditContext,
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects a blank/whitespace-only header field', async () => {
    const bundle = repoBundle();
    await expect(
      createUseCase(bundle).Execute({ ...createRequest(), SourceDocumentNumber: '   ' }, SystemAuditContext),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('preserves a concurrently-committed Confirm (Status/CoreFlowInstanceId) when recording gate-in -- closes the RecordGateIn lock-scope gap found by adversarial review', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    // A real (non-live-reference) snapshot -- the fake mutates entities in place, so
    // capturing the array element directly would "stay fresh" through Confirm's mutation
    // and defeat the point of this test (it must reflect the world BEFORE Confirm ran).
    // Rebuilt via the constructor (not a plain spread) so it keeps its entity methods.
    const stalePreCheckSnapshot = new InboundPlanEntity({
      ...bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!,
    });
    await confirmInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);
    // RecordGateInUseCase's fail-fast pre-check reads a STALE (pre-Confirm) snapshot --
    // simulating Confirm committing in the window between this call's pre-check and its
    // locked write.
    jest.spyOn(bundle.inbound, 'FindById').mockResolvedValueOnce({ Plan: stalePreCheckSnapshot, Lines: [] });

    const gateIn = await recordGateInUseCase(bundle).Execute(
      { Id: created.Id, GateInAt: now, GateReference: 'GATE-A-001' },
      SystemAuditContext,
    );

    expect(gateIn.Status).toBe(InboundPlanDocumentStatus.Planned);
    expect(gateIn.CoreFlowInstanceId).not.toBeNull();
    expect(gateIn.GateInStatus).toBe(InboundGateInStatus.Recorded);
  });

  it('preserves a concurrently-committed Confirm (Status/CoreFlowInstanceId) when accepting a gate-in readiness override -- closes the ValidateReceivingReadiness lock-scope gap found by adversarial review', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundGateInRequired: true, gateInOverrideAllowed: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    // A real (non-live-reference) snapshot -- the fake mutates entities in place, so
    // capturing the array element directly would "stay fresh" through Confirm's mutation
    // and defeat the point of this test (it must reflect the world BEFORE Confirm ran).
    // Rebuilt via the constructor (not a plain spread) so it keeps its entity methods.
    const stalePreCheckSnapshot = new InboundPlanEntity({
      ...bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!,
    });
    await confirmInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);
    jest.spyOn(bundle.inbound, 'FindById').mockResolvedValueOnce({ Plan: stalePreCheckSnapshot, Lines: [] });

    await readinessUseCase(bundle).Execute(
      { Id: created.Id, AttemptOverride: true, ReasonCode: 'RC-V1-HANDOFF' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const stored = await bundle.inbound.FindById(created.Id);
    expect(stored?.Plan.Status).toBe(InboundPlanDocumentStatus.Planned);
    expect(stored?.Plan.CoreFlowInstanceId).not.toBeNull();
    expect(stored?.Plan.GateInStatus).toBe(InboundGateInStatus.OverrideAccepted);
  });
});

describe('IFB-24 re-review fix: override race, non-HTTP validation gaps', () => {
  it('re-checks GateInStatus after acquiring the row lock so a concurrent RecordGateIn cannot be clobbered by a stale override', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundGateInRequired: true, gateInOverrideAllowed: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const lockedPlan = bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!;
    // Simulate a concurrent RecordGateIn winning the race: the outer Execute() unlocked
    // read (already captured before this mock) still saw gate-in as not-yet-recorded, so
    // it proceeded into the override path -- but by the time HandleOverride acquires its
    // row lock, gate-in has already been legitimately recorded for real.
    jest.spyOn(bundle.inbound, 'FindByIdForUpdate').mockResolvedValueOnce({
      Plan: new InboundPlanEntity({
        ...lockedPlan,
        GateInStatus: InboundGateInStatus.Recorded,
        GateInAt: now,
        GateReference: 'GATE-RACE-001',
      }),
      Lines: [],
    });
    const updatePlanSpy = jest.spyOn(bundle.inbound, 'UpdatePlan');

    const result = await readinessUseCase(bundle).Execute(
      { Id: created.Id, AttemptOverride: true, ReasonCode: 'RC-V1-HANDOFF' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(result.Decision).toBe('Allowed');
    expect(result.GateInRecorded).toBe(true);
    expect(result.OverrideAccepted).toBe(false);
    // Must not overwrite the legitimately-recorded gate-in with an override mutation.
    expect(updatePlanSpy).not.toHaveBeenCalled();
  });

  it('re-checks GateInStatus after acquiring the row lock so a concurrent duplicate override cannot be double-applied (symmetric OverrideAccepted case)', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundGateInRequired: true, gateInOverrideAllowed: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const lockedPlan = bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!;
    // Simulate a concurrent override winning the race instead of a RecordGateIn -- same
    // guard, symmetric target status.
    jest.spyOn(bundle.inbound, 'FindByIdForUpdate').mockResolvedValueOnce({
      Plan: new InboundPlanEntity({ ...lockedPlan, GateInStatus: InboundGateInStatus.OverrideAccepted }),
      Lines: [],
    });
    const updatePlanSpy = jest.spyOn(bundle.inbound, 'UpdatePlan');

    const result = await readinessUseCase(bundle).Execute(
      { Id: created.Id, AttemptOverride: true, ReasonCode: 'RC-V1-HANDOFF' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(result.Decision).toBe('OverrideAccepted');
    expect(result.OverrideAccepted).toBe(true);
    expect(updatePlanSpy).not.toHaveBeenCalled();
  });

  it('rejects a null line entry from a non-HTTP caller instead of throwing a raw TypeError', async () => {
    const bundle = repoBundle();
    await expect(
      createUseCase(bundle).Execute(
        { ...createRequest(), Lines: [null] as unknown as ReturnType<typeof createRequest>['Lines'] },
        SystemAuditContext,
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects NaN and Infinity ExpectedQuantity from a non-HTTP caller', async () => {
    const bundle = repoBundle();
    await expect(
      createUseCase(bundle).Execute(
        { ...createRequest(), Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: NaN }] },
        SystemAuditContext,
      ),
    ).rejects.toThrow(BusinessRuleException);
    await expect(
      createUseCase(bundle).Execute(
        {
          ...createRequest(),
          Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: Infinity }],
        },
        SystemAuditContext,
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects an Invalid Date ExpectedArrivalAt from a non-HTTP caller', async () => {
    const bundle = repoBundle();
    await expect(
      createUseCase(bundle).Execute({ ...createRequest(), ExpectedArrivalAt: 'not-a-real-date' }, SystemAuditContext),
    ).rejects.toThrow(BusinessRuleException);
  });
});

describe('IFB-24 second re-review fix: authorization TOCTOU on the locked aggregate', () => {
  // Every test here mocks FindByIdForUpdate to return the plan in a DIFFERENT
  // Warehouse than the real underlying plan (still warehouse-1, which the outer
  // pre-check permission call sees and allows) -- simulating a concurrent Update
  // moving the plan's scope in the race window between the outer pre-check and this
  // use case's own row lock. permissionChecker.Check is then made to deny ONLY
  // warehouse-2, so a rejection here can only come from a check against the LOCKED
  // aggregate, not the stale pre-check read.

  it('re-checks permission against the locked scope on Confirm', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const lockedPlan = bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!;
    jest.spyOn(bundle.inbound, 'FindByIdForUpdate').mockResolvedValueOnce({
      Plan: new InboundPlanEntity({ ...lockedPlan, WarehouseId: 'warehouse-2' }),
      Lines: [],
    });
    bundle.permissionChecker.Check.mockImplementation(async (context) =>
      context.Scope?.WarehouseId === 'warehouse-2' ? { Allowed: false, Reason: 'OUT_OF_SCOPE' } : { Allowed: true },
    );

    await expect(
      confirmInboundPlanUseCase(bundle).Execute({ Id: created.Id }, { ...SystemAuditContext, ActorUserId: 'user-1' }),
    ).rejects.toThrow(ForbiddenAppException);
    expect(bundle.coreFlows.Instances).toHaveLength(0);
    expect(bundle.integrations.Outbox).toHaveLength(0);
  });

  it('re-checks permission against the locked scope on Cancel', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const lockedPlan = bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!;
    jest.spyOn(bundle.inbound, 'FindByIdForUpdate').mockResolvedValueOnce({
      Plan: new InboundPlanEntity({ ...lockedPlan, WarehouseId: 'warehouse-2' }),
      Lines: [],
    });
    bundle.permissionChecker.Check.mockImplementation(async (context) =>
      context.Scope?.WarehouseId === 'warehouse-2' ? { Allowed: false, Reason: 'OUT_OF_SCOPE' } : { Allowed: true },
    );

    await expect(
      cancelInboundPlanUseCase(bundle).Execute({ Id: created.Id }, { ...SystemAuditContext, ActorUserId: 'user-1' }),
    ).rejects.toThrow(ForbiddenAppException);
    expect(bundle.inbound.Plans.find((plan) => plan.Id === created.Id)?.Status).toBe(InboundPlanDocumentStatus.Draft);
  });

  it('re-checks permission against the locked (leaving) scope on Update, on top of the old/new scope checks already run outside the lock', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const lockedPlan = bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!;
    // A THIRD scope (warehouse-3) that neither the old-scope nor the new-scope checks
    // outside the lock would ever see -- only reachable via the locked re-check.
    jest.spyOn(bundle.inbound, 'FindByIdForUpdate').mockResolvedValueOnce({
      Plan: new InboundPlanEntity({ ...lockedPlan, WarehouseId: 'warehouse-3' }),
      Lines: [],
    });
    bundle.permissionChecker.Check.mockImplementation(async (context) =>
      context.Scope?.WarehouseId === 'warehouse-3' ? { Allowed: false, Reason: 'OUT_OF_SCOPE' } : { Allowed: true },
    );

    await expect(
      updateInboundPlanUseCase(bundle).Execute(
        { Id: created.Id, ...createRequest(), ExpectedUpdatedAt: created.UpdatedAt },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(ForbiddenAppException);
  });

  it('re-checks permission against the locked scope on RecordGateIn', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const lockedPlan = bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!;
    jest.spyOn(bundle.inbound, 'FindByIdForUpdate').mockResolvedValueOnce({
      Plan: new InboundPlanEntity({ ...lockedPlan, WarehouseId: 'warehouse-2' }),
      Lines: [],
    });
    bundle.permissionChecker.Check.mockImplementation(async (context) =>
      context.Scope?.WarehouseId === 'warehouse-2' ? { Allowed: false, Reason: 'OUT_OF_SCOPE' } : { Allowed: true },
    );

    await expect(
      recordGateInUseCase(bundle).Execute(
        { Id: created.Id, GateInAt: now, GateReference: 'GATE-TOCTOU-001' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(ForbiddenAppException);
    expect(bundle.inbound.Plans.find((plan) => plan.Id === created.Id)?.GateInStatus).toBe(
      InboundGateInStatus.NotRecorded,
    );
  });

  it('re-checks Override permission against the locked scope on ValidateReceivingReadiness', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundGateInRequired: true, gateInOverrideAllowed: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const lockedPlan = bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!;
    jest.spyOn(bundle.inbound, 'FindByIdForUpdate').mockResolvedValueOnce({
      Plan: new InboundPlanEntity({ ...lockedPlan, WarehouseId: 'warehouse-2' }),
      Lines: [],
    });
    bundle.permissionChecker.Check.mockImplementation(async (context) =>
      context.Scope?.WarehouseId === 'warehouse-2' ? { Allowed: false, Reason: 'OUT_OF_SCOPE' } : { Allowed: true },
    );

    await expect(
      readinessUseCase(bundle).Execute(
        { Id: created.Id, AttemptOverride: true, ReasonCode: 'RC-V1-HANDOFF' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(ForbiddenAppException);
    expect(bundle.inbound.Plans.find((plan) => plan.Id === created.Id)?.GateInStatus).toBe(
      InboundGateInStatus.NotRecorded,
    );
  });
});

describe('IFB-24 third re-review fix: authorization TOCTOU part 2 (destination scope, profile/policy re-check)', () => {
  it('re-checks the destination Warehouse/Owner scope again inside the lock on Update, not just outside it', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    bundle.warehouses.FindById.mockResolvedValueOnce(
      new WarehouseEntity({
        Id: 'warehouse-2',
        SiteId: 'site-1',
        WarehouseCode: 'WT-02',
        WarehouseName: 'Warehouse WT-02',
        WarehouseTypeCode: 'WT-02',
        Status: MasterDataStatus.Active,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    // Simulate the actor's grant on warehouse-2 being revoked in the race window between
    // the outer (pre-lock) destination-scope check and the locked re-check added this
    // round: the FIRST Check call for warehouse-2 is allowed (so the outer check
    // legitimately passes and the code proceeds into the transaction), the SECOND --
    // which can only be the new locked re-check -- is denied.
    let warehouse2Calls = 0;
    bundle.permissionChecker.Check.mockImplementation(async (context) => {
      if (context.Scope?.WarehouseId === 'warehouse-2') {
        warehouse2Calls += 1;
        return warehouse2Calls === 1 ? { Allowed: true } : { Allowed: false, Reason: 'OUT_OF_SCOPE' };
      }
      return { Allowed: true };
    });

    await expect(
      updateInboundPlanUseCase(bundle).Execute(
        // WarehouseProfileId cleared -- profile-1 is scoped to warehouse-1, and this test
        // is specifically about the Warehouse/Owner scope re-check, not profile matching.
        {
          Id: created.Id,
          ...createRequest(),
          WarehouseId: 'warehouse-2',
          WarehouseProfileId: null,
          ExpectedUpdatedAt: created.UpdatedAt,
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(ForbiddenAppException);
    expect(warehouse2Calls).toBe(2);
    // Must not have partially applied the move.
    expect(bundle.inbound.Plans.find((plan) => plan.Id === created.Id)?.WarehouseId).toBe('warehouse-1');
  });

  it('re-resolves WarehouseProfile and re-checks the override-allowed policy again inside the lock on ValidateReceivingReadiness, not just outside it', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    // First resolve is Execute()'s own read (outside the lock) -- allowed, so the code
    // legitimately enters the override path. Second resolve is the new locked re-check
    // added this round -- simulates the profile's policy (or scope/active status) having
    // changed in the race window before the lock was acquired.
    bundle.profiles.FindById.mockResolvedValueOnce(
      profile({ inboundGateInRequired: true, gateInOverrideAllowed: true }),
    ).mockResolvedValueOnce(profile({ inboundGateInRequired: true, gateInOverrideAllowed: false }));

    await expect(
      readinessUseCase(bundle).Execute(
        { Id: created.Id, AttemptOverride: true, ReasonCode: 'RC-V1-HANDOFF' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
    const stored = await bundle.inbound.FindById(created.Id);
    expect(stored?.Plan.GateInStatus).toBe(InboundGateInStatus.NotRecorded);
  });
});

describe('IFB-24 fourth re-review fix: optimistic concurrency + stale-result/master-data', () => {
  it('rejects Update with a 409 when the plan was edited by someone else since the caller last read it, and does not overwrite their change', async () => {
    // The staleness check compares millisecond Date.getTime() values -- two back-to-back
    // in-memory Execute() calls can otherwise land in the SAME wall-clock millisecond
    // (observed as a flaky failure under a fast/warm full-suite run), so pin the system
    // clock and advance it explicitly between writers to make the mismatch deterministic.
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    try {
      jest.setSystemTime(new Date('2026-07-16T00:00:00.000Z'));
      const bundle = repoBundle();
      const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

      // Writer A: a real, successful Update -- bumps UpdatedAt.
      jest.setSystemTime(new Date('2026-07-16T00:00:01.000Z'));
      const afterA = await updateInboundPlanUseCase(bundle).Execute(
        {
          Id: created.Id,
          ...createRequest(),
          SourceDocumentNumber: 'ASN-10001-A',
          ExpectedUpdatedAt: created.UpdatedAt,
        },
        SystemAuditContext,
      );
      expect(afterA.SourceDocumentNumber).toBe('ASN-10001-A');

      // Writer B: opened their form from the SAME original snapshot as A (still echoing
      // created.UpdatedAt, now stale since A committed) -- must 409, not silently clobber A.
      jest.setSystemTime(new Date('2026-07-16T00:00:02.000Z'));
      await expect(
        updateInboundPlanUseCase(bundle).Execute(
          {
            Id: created.Id,
            ...createRequest(),
            SourceDocumentNumber: 'ASN-10001-B',
            ExpectedUpdatedAt: created.UpdatedAt,
          },
          SystemAuditContext,
        ),
      ).rejects.toThrow(ConflictException);

      const stored = await bundle.inbound.FindById(created.Id);
      expect(stored?.Plan.SourceDocumentNumber).toBe('ASN-10001-A');
    } finally {
      jest.useRealTimers();
    }
  });

  it('re-validates supplier/owner/warehouse freshness inside the lock on Update, rejecting a reference deactivated after the outer pre-check', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    // First call is Execute()'s own outer (pre-lock) read -- active, so the code
    // legitimately proceeds. Second call is the new locked re-check added this round --
    // simulates the supplier being deactivated in the race window before the lock.
    bundle.partners.FindById.mockResolvedValueOnce(supplier()).mockResolvedValueOnce(
      new PartnerEntity({ ...supplier(), Status: PartnerStatus.Inactive }),
    );

    await expect(
      updateInboundPlanUseCase(bundle).Execute(
        { Id: created.Id, ...createRequest(), ExpectedUpdatedAt: created.UpdatedAt },
        SystemAuditContext,
      ),
    ).rejects.toThrow(BusinessRuleException);

    // Must not have partially applied the edit.
    const stored = await bundle.inbound.FindById(created.Id);
    expect(stored?.Plan.UpdatedAt.getTime()).toBe(created.UpdatedAt.getTime());
  });

  it('re-validates each line SKU/UOM freshness inside the lock on Update, rejecting a line reference deactivated after the outer pre-check (adversarial-verify finding)', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    // First call to skus.FindById is the cheap pre-lock fail-fast ResolveLines call --
    // active, so the code legitimately proceeds. Second call is the fresh in-lock
    // re-resolution added by this fix -- simulates the line's SKU being deactivated in
    // the race window between that pre-lock read and the lock.
    bundle.skus.FindById.mockResolvedValueOnce(sku()).mockResolvedValueOnce(
      sku({ ItemStatus: SkuStatus.Discontinued }),
    );

    await expect(
      updateInboundPlanUseCase(bundle).Execute(
        { Id: created.Id, ...createRequest(), ExpectedUpdatedAt: created.UpdatedAt },
        SystemAuditContext,
      ),
    ).rejects.toThrow(BusinessRuleException);

    // Must not have replaced the lines with a reference to the now-inactive SKU.
    const stored = await bundle.inbound.FindById(created.Id);
    expect(stored?.Plan.UpdatedAt.getTime()).toBe(created.UpdatedAt.getTime());
    expect(stored?.Lines[0]?.SkuId).toBe('sku-1');
  });

  it('returns the readiness override result/audit built from the locked plan, not a stale pre-lock BusinessReference', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundGateInRequired: true, gateInOverrideAllowed: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const lockedPlan = bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!;
    // Simulate a concurrent Update changing the business reference in the race window
    // between Execute()'s unlocked read (which built the old pre-lock `result`) and
    // HandleOverride acquiring its own row lock.
    jest.spyOn(bundle.inbound, 'FindByIdForUpdate').mockResolvedValueOnce({
      Plan: new InboundPlanEntity({
        ...lockedPlan,
        SourceDocumentNumber: 'ASN-10001-RACED',
        BusinessReference: 'ERP:ASN:ASN-10001-RACED',
      }),
      Lines: [],
    });

    const result = await readinessUseCase(bundle).Execute(
      { Id: created.Id, AttemptOverride: true, ReasonCode: 'RC-V1-HANDOFF' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(result.Decision).toBe('OverrideAccepted');
    expect(result.BusinessReference).toBe('ERP:ASN:ASN-10001-RACED');
  });
});

describe('IFB-24 final re-review fix: Cancelled-status guard on operational endpoints + BusinessReference length cap', () => {
  it('rejects RecordGateIn on a Cancelled plan', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    await cancelInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    await expect(
      recordGateInUseCase(bundle).Execute(
        { Id: created.Id, GateInAt: now, GateReference: 'GATE-CANCELLED-1' },
        SystemAuditContext,
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects RecordGateIn when the plan is cancelled in the race window between the unlocked pre-check and the lock', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const lockedPlan = bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!;
    // Outer pre-check still sees Draft (legitimately proceeds); the locked re-fetch
    // simulates a concurrent Cancel that committed in between.
    jest.spyOn(bundle.inbound, 'FindByIdForUpdate').mockResolvedValueOnce({
      Plan: new InboundPlanEntity({ ...lockedPlan, Status: InboundPlanDocumentStatus.Cancelled }),
      Lines: [],
    });

    await expect(
      recordGateInUseCase(bundle).Execute(
        { Id: created.Id, GateInAt: now, GateReference: 'GATE-RACE-CANCELLED' },
        SystemAuditContext,
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects ValidateReceivingReadiness on a Cancelled plan', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    await cancelInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    await expect(readinessUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext)).rejects.toThrow(
      BusinessRuleException,
    );
  });

  it('rejects a readiness override when the plan is cancelled in the race window between the unlocked pre-check and the lock', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundGateInRequired: true, gateInOverrideAllowed: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const lockedPlan = bundle.inbound.Plans.find((plan) => plan.Id === created.Id)!;
    jest.spyOn(bundle.inbound, 'FindByIdForUpdate').mockResolvedValueOnce({
      Plan: new InboundPlanEntity({ ...lockedPlan, Status: InboundPlanDocumentStatus.Cancelled }),
      Lines: [],
    });

    await expect(
      readinessUseCase(bundle).Execute(
        { Id: created.Id, AttemptOverride: true, ReasonCode: 'RC-V1-HANDOFF' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects StartReceivingSession on a Cancelled plan (transitively, via the readiness check)', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    await cancelInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    await expect(
      startReceivingUseCase(bundle).Execute(
        { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects ConfirmReceiptLine on a Cancelled plan (transitively, via the readiness check) even though the receiving session was legitimately started while still Draft', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    // Cancel only requires Draft -- a plan can be cancelled AFTER a receiving session was
    // legitimately opened against it while still Draft (this story's own scope decision
    // deliberately allows receiving to start on Draft).
    await cancelInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    await expect(
      confirmReceiptLineUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          InboundPlanLineId: created.Lines[0].Id,
          ActualQuantity: 12,
          IdempotencyKey: 'receipt-line-cancelled-plan',
          ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects ConfirmInboundLpn on a Cancelled plan', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-lpn-cancelled',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await cancelInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    await expect(
      confirmInboundLpnUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          LpnCode: 'LPN-CANCELLED-1',
          IdempotencyKey: 'lpn-cancelled-1',
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects ReleaseInboundToPutaway on a Cancelled plan', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-release-cancelled',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    // Complete the normal QC/LPN prerequisites BEFORE cancelling, so a rejection below can
    // only come from the Cancelled check, not from a missing-prerequisite guard.
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'qc-release-cancelled' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    await confirmInboundLpnUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        LpnCode: 'LPN-RELEASE-CANCELLED-1',
        IdempotencyKey: 'lpn-release-cancelled',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await cancelInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          CurrentLocationCode: 'RCV-01',
          ReasonCode: 'RC-V1-HANDOFF',
          IdempotencyKey: 'release-cancelled-1',
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects CaptureInboundDiscrepancy on a Cancelled plan', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-disc-cancelled',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await cancelInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    await expect(
      captureInboundDiscrepancyUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          DiscrepancyType: InboundDiscrepancyType.DamagedGoods,
          ReasonCode: 'RC-V1-DISCREPANCY',
          EvidenceRefs: ['photo://dock/cancelled'],
          IdempotencyKey: 'disc-cancelled-1',
        },
        { ...SystemAuditContext, ActorUserId: 'supervisor-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects EvaluateQcTask on a Cancelled plan', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-qc-eval-cancelled',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await cancelInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    await expect(
      evaluateQcTaskUseCase(bundle).Execute(
        { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'qc-eval-cancelled-1' },
        { ...SystemAuditContext, ActorUserId: 'qc-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects RecordQcResult on a Cancelled plan', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundQcRequired: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-qc-result-cancelled',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const task = await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'qc-task-result-cancelled' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    await cancelInboundPlanUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    await expect(
      recordQcResultUseCase(bundle).Execute(
        {
          QcTaskId: task.Id,
          ResultStatus: QcResultStatus.Passed,
          DispositionCode: QcDispositionCode.Release,
          InspectedQuantity: 12,
          AcceptedQuantity: 12,
          RejectedQuantity: 0,
          IdempotencyKey: 'qc-result-cancelled-1',
        },
        { ...SystemAuditContext, ActorUserId: 'qc-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it("rejects Create when the concatenated BusinessReference exceeds CoreFlow's 100-char column limit", async () => {
    const bundle = repoBundle();
    const longNumber = 'X'.repeat(96); // "ERP:ASN:" (8) + 96 = 104 chars, over the 100 cap
    await expect(
      createUseCase(bundle).Execute({ ...createRequest(), SourceDocumentNumber: longNumber }, SystemAuditContext),
    ).rejects.toThrow(BusinessRuleException);
  });

  it("rejects Update when the concatenated BusinessReference exceeds CoreFlow's 100-char column limit", async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const longNumber = 'X'.repeat(96);

    await expect(
      updateInboundPlanUseCase(bundle).Execute(
        { Id: created.Id, ...createRequest(), SourceDocumentNumber: longNumber, ExpectedUpdatedAt: created.UpdatedAt },
        SystemAuditContext,
      ),
    ).rejects.toThrow(BusinessRuleException);
  });
});

describe('Inbound plan operational flow (gate-in, receiving, QC, discrepancy, release)', () => {
  it('records gate-in milestone on plan and CoreFlow', async () => {
    const bundle = repoBundle();
    const created = await createConfirmedPlan(bundle);

    const gateIn = await recordGateInUseCase(bundle).Execute(
      {
        Id: created.Id,
        GateInAt: new Date('2026-06-22T09:00:00.000Z'),
        GateReference: 'GATE-A-001',
        VehicleNumber: '51C-12345',
        DriverName: 'Driver A',
        EvidenceRefs: ['photo://gate-a-001'],
      },
      SystemAuditContext,
    );

    expect(gateIn.GateInStatus).toBe(InboundGateInStatus.Recorded);
    expect(bundle.coreFlows.CreateMilestone).toHaveBeenCalledWith(
      expect.objectContaining({
        StageCode: CoreFlowStageCode.Inbound,
        StepCode: CoreFlowStepCode.GateInRecorded,
        MilestoneStatus: WorkflowMilestoneStatus.Completed,
      }),
      undefined,
    );
    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.InboundPlan,
      ReferenceType: 'InboundGateIn',
    });
  });

  it('keeps repeated gate-in idempotent for same reference and rejects a different repeated reference', async () => {
    const bundle = repoBundle();
    const created = await createConfirmedPlan(bundle);
    const gateInUseCase = recordGateInUseCase(bundle);

    await gateInUseCase.Execute({ Id: created.Id, GateInAt: now, GateReference: 'GATE-A-001' }, SystemAuditContext);
    const repeated = await gateInUseCase.Execute(
      { Id: created.Id, GateInAt: now, GateReference: 'GATE-A-001' },
      SystemAuditContext,
    );

    expect(repeated.GateInStatus).toBe(InboundGateInStatus.Recorded);
    expect(bundle.coreFlows.Milestones).toHaveLength(1);
    await expect(
      gateInUseCase.Execute({ Id: created.Id, GateInAt: now, GateReference: 'GATE-A-002' }, SystemAuditContext),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('blocks receiving readiness when profile requires gate-in and allows after gate-in is recorded', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundGateInRequired: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const readiness = readinessUseCase(bundle);

    const blocked = await readiness.Execute({ Id: created.Id }, SystemAuditContext);
    expect(blocked.Allowed).toBe(false);
    expect(blocked.Blocked).toBe(true);
    expect(blocked.GateInRequired).toBe(true);

    await recordGateInUseCase(bundle).Execute(
      { Id: created.Id, GateInAt: now, GateReference: 'GATE-A-001' },
      SystemAuditContext,
    );
    const allowed = await readiness.Execute({ Id: created.Id }, SystemAuditContext);
    expect(allowed.Allowed).toBe(true);
    expect(allowed.GateInRecorded).toBe(true);
  });

  it('fails receiving readiness closed when persisted WarehouseProfile cannot be resolved', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    bundle.profiles.FindById.mockResolvedValue(null as never);

    await expect(readinessUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext)).rejects.toThrow(
      BusinessRuleException,
    );
  });

  it('allows gate-in readiness override only with CoreFlow override permission and reason', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundGateInRequired: true, gateInOverrideAllowed: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    const result = await readinessUseCase(bundle).Execute(
      { Id: created.Id, AttemptOverride: true, ReasonCode: 'RC-V1-HANDOFF' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(result.Allowed).toBe(true);
    expect(result.OverrideAccepted).toBe(true);
    expect(bundle.permissionChecker.Check).toHaveBeenCalledWith(
      expect.objectContaining({ Action: ActionCode.Override, ObjectType: ObjectType.CoreFlow }),
    );
    const stored = await bundle.inbound.FindById(created.Id);
    expect(stored?.Plan.GateInStatus).toBe(InboundGateInStatus.OverrideAccepted);
    const afterOverride = await readinessUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);
    expect(afterOverride.Decision).toBe('OverrideAccepted');
    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      Action: ActionCode.Override,
      ObjectType: ObjectType.CoreFlow,
      ReasonCodeId: 'reason-1',
    });
  });

  it('rejects gate-in readiness override when WarehouseProfile does not allow it', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundGateInRequired: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    await expect(
      readinessUseCase(bundle).Execute(
        { Id: created.Id, AttemptOverride: true, ReasonCode: 'RC-V1-HANDOFF' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('lists inbound plans with default PageSize 50 and max PageSize 100 clamp', async () => {
    const bundle = repoBundle();
    const created = (await createUseCase(bundle).Execute(createRequest(), SystemAuditContext)) as InboundPlanDto;
    expect(await new GetInboundPlanUseCase(bundle.inbound).Execute(created.Id)).toMatchObject({ Id: created.Id });

    const listUseCase = new ListInboundPlansUseCase(bundle.inbound);
    const defaultPage = await listUseCase.Execute({});
    const clampedPage = await listUseCase.Execute({ Page: 1, PageSize: 500 });

    expect(defaultPage.Meta.PageSize).toBe(50);
    expect(clampedPage.Meta.PageSize).toBe(100);
  });

  it('starts receiving session and receipt idempotently after readiness is allowed', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const useCase = startReceivingUseCase(bundle);

    const first = await useCase.Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1', DeviceCode: 'rf-01' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const duplicate = await useCase.Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1', DeviceCode: 'rf-01' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(first.ReceiptNumber).toBe('ASN-10001-RCPT');
    expect(duplicate.IsDuplicate).toBe(true);
    expect(bundle.receiving.Sessions).toHaveLength(1);
    expect(bundle.receiving.Receipts).toHaveLength(1);
    expect(bundle.permissionChecker.Check).toHaveBeenCalledWith(
      expect.objectContaining({ Action: ActionCode.Create, ObjectType: ObjectType.Receipt }),
    );
    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.Receipt,
      ReferenceType: 'ReceivingSession',
    });
  });

  it('records scan-confirmed receipt line with scan evidence, outbox, CoreFlow milestone and idempotency', async () => {
    const bundle = repoBundle();
    const created = await createConfirmedPlan(bundle);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const planLine = created.Lines[0];

    const useCase = confirmReceiptLineUseCase(bundle);
    const scanEvidence = {
      RawValue: '01012345678901281726010110LOT-A',
      ScanEventId: 'scan-event-1',
      ScanResult: 'Accepted' as const,
      ResolvedSkuId: 'sku-1',
      ResolvedUomId: 'uom-1',
    };
    const line = await useCase.Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: planLine.Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-1',
        ScanEvidence: scanEvidence,
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const duplicate = await useCase.Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: planLine.Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-1',
        ScanEvidence: scanEvidence,
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await expect(
      useCase.Execute(
        {
          ReceiptId: session.ReceiptId,
          InboundPlanLineId: planLine.Id,
          ActualQuantity: 11,
          IdempotencyKey: 'receipt-line-1',
          ScanEvidence: scanEvidence,
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(ConflictException);

    expect(line.Status).toBe(ReceiptLineStatus.Received);
    expect(line.ActualQuantity).toBe(12);
    expect(line.ReceivedBy).toBe('user-1');
    expect(line.ScanEvidenceJson).toMatchObject({ ScanEventId: 'scan-event-1', RawValue: expect.any(String) });
    expect(duplicate.IsDuplicate).toBe(true);
    expect(bundle.receiving.Lines).toHaveLength(1);
    expect(bundle.integrations.Outbox).toHaveLength(2);
    expect(bundle.integrations.Outbox[1]).toMatchObject({ EventType: 'ReceiptLineReceived' });
    expect(bundle.coreFlows.CreateMilestone).toHaveBeenCalledWith(
      expect.objectContaining({ StepCode: CoreFlowStepCode.ReceiptLineReceived }),
      undefined,
    );
  });

  it('requires reason and override permission for manual receipt confirm and records discrepancy signal', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const planLine = created.Lines[0];
    const useCase = confirmReceiptLineUseCase(bundle);

    await expect(
      useCase.Execute(
        {
          ReceiptId: session.ReceiptId,
          InboundPlanLineId: planLine.Id,
          ActualQuantity: 10,
          ManualConfirm: true,
          IdempotencyKey: 'manual-line-missing-reason',
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    const line = await useCase.Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: planLine.Id,
        ActualQuantity: 10,
        ManualConfirm: true,
        ReasonCode: 'RC-V1-MANUAL-SCAN',
        ReasonNote: 'Barcode unreadable',
        IdempotencyKey: 'manual-line-1',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(line.Status).toBe(ReceiptLineStatus.Discrepancy);
    expect(line.DiscrepancySignals).toContain(ReceiptLineDiscrepancySignal.QuantityVariance);
    expect(line.ReasonCodeId).toBe('reason-1');
    expect(bundle.permissionChecker.Check).toHaveBeenCalledWith(
      expect.objectContaining({ Action: ActionCode.Override, ObjectType: ObjectType.Receipt }),
    );
    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      Action: ActionCode.Override,
      ObjectType: ObjectType.Receipt,
      ReasonCodeId: 'reason-1',
      ReferenceType: 'ReceiptLine',
    });
  });

  it('records wrong SKU discrepancy when scan evidence resolves away from the expected plan line', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const planLine = created.Lines[0];

    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: planLine.Id,
        ActualQuantity: 12,
        IdempotencyKey: 'wrong-sku-scan-1',
        ScanEvidence: {
          RawValue: 'wrong-sku-barcode',
          ScanResult: 'Accepted',
          ResolvedSkuId: 'sku-other',
          ResolvedUomId: 'uom-1',
        },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(line.Status).toBe(ReceiptLineStatus.Discrepancy);
    expect(line.DiscrepancySignals).toContain(ReceiptLineDiscrepancySignal.WrongSku);
    expect(bundle.integrations.Outbox[bundle.integrations.Outbox.length - 1]).toMatchObject({
      EventType: 'ReceiptLineReceived',
      Payload: expect.objectContaining({
        DiscrepancySignals: expect.arrayContaining([ReceiptLineDiscrepancySignal.WrongSku]),
      }),
    });
  });

  it('captures Lot/Expiry/Serial on receipt line confirm and threads them through release to putaway (IDC-01)', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        LotNumber: 'LOT-IDC01',
        ExpiryDate: '2027-01-31',
        SerialNumber: 'SER-IDC01',
        IdempotencyKey: 'idc01-capture-line-1',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(line.LotNumber).toBe('LOT-IDC01');
    expect(line.ExpiryDate?.toISOString().slice(0, 10)).toBe('2027-01-31');
    expect(line.SerialNumber).toBe('SER-IDC01');

    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'idc01-capture-qc-1' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    const release = await releaseInboundToPutawayUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'idc01-capture-release-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(release.LotNumber).toBe('LOT-IDC01');
    expect(release.ExpiryDate?.toISOString().slice(0, 10)).toBe('2027-01-31');
    expect(release.SerialNumber).toBe('SER-IDC01');
  });

  it('leaves Lot/Expiry/Serial null end-to-end when not captured (IDC-01 backward-compat)', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'idc01-no-capture-line-1',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(line.LotNumber).toBeNull();
    expect(line.ExpiryDate).toBeNull();
    expect(line.SerialNumber).toBeNull();

    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'idc01-no-capture-qc-1' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    const release = await releaseInboundToPutawayUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'idc01-no-capture-release-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(release.LotNumber).toBeNull();
    expect(release.ExpiryDate).toBeNull();
    expect(release.SerialNumber).toBeNull();
  });

  it('rejects a calendar-invalid ExpiryDate instead of silently rolling it forward (IDC-01)', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await expect(
      confirmReceiptLineUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          InboundPlanLineId: created.Lines[0].Id,
          ActualQuantity: 12,
          ExpiryDate: '2027-02-30',
          IdempotencyKey: 'idc01-bad-calendar-date-1',
          ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('flags an idempotent retry that drops a previously-captured LotNumber as a payload mismatch (IDC-01)', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        LotNumber: 'LOT-ORIGINAL',
        IdempotencyKey: 'idc01-retry-drops-lot-1',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await expect(
      confirmReceiptLineUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          InboundPlanLineId: created.Lines[0].Id,
          ActualQuantity: 12,
          IdempotencyKey: 'idc01-retry-drops-lot-1',
          ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('blocks receipt line confirm missing SerialNumber when the SKU has SerialControlled=true (IDC-02)', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await expect(
      confirmReceiptLineUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          InboundPlanLineId: created.Lines[0].Id,
          ActualQuantity: 12,
          IdempotencyKey: 'idc02-missing-serial-1',
          ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('blocks receipt line confirm with ActualQuantity > 1 when the SKU has SerialControlled=true, even with a SerialNumber given (IFB-14)', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await expect(
      confirmReceiptLineUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          InboundPlanLineId: created.Lines[0].Id,
          ActualQuantity: 3,
          SerialNumber: 'SN-IFB14-001',
          IdempotencyKey: 'ifb14-multi-unit-serial-1',
          ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('allows receipt line confirm with ActualQuantity = 1 when the SKU has SerialControlled=true (IFB-14)', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 1,
        SerialNumber: 'SN-IFB14-002',
        IdempotencyKey: 'ifb14-single-unit-serial-1',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(line.SerialNumber).toBe('SN-IFB14-002');
    // IFB-20: 1 of 12 expected units received so far is not (yet) a provable variance.
    expect(line.Status).toBe(ReceiptLineStatus.Received);
    expect(line.DiscrepancySignals).not.toContain(ReceiptLineDiscrepancySignal.QuantityVariance);
  });

  it('IFB-20: does not flag QuantityVariance on any unit while cumulative received stays at or under ExpectedQuantity for a SerialControlled SKU', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(
      {
        ...createRequest(),
        Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 3, ExternalLineReference: '10' }],
      },
      SystemAuditContext,
    );
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const useCase = confirmReceiptLineUseCase(bundle);
    const confirmUnit = (serialNumber: string, idempotencyKey: string) =>
      useCase.Execute(
        {
          ReceiptId: session.ReceiptId,
          InboundPlanLineId: created.Lines[0].Id,
          ActualQuantity: 1,
          SerialNumber: serialNumber,
          IdempotencyKey: idempotencyKey,
          ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      );

    const unit1 = await confirmUnit('SN-IFB20-001', 'ifb20-unit-1');
    const unit2 = await confirmUnit('SN-IFB20-002', 'ifb20-unit-2');
    const unit3 = await confirmUnit('SN-IFB20-003', 'ifb20-unit-3');

    for (const unit of [unit1, unit2, unit3]) {
      expect(unit.Status).toBe(ReceiptLineStatus.Received);
      expect(unit.DiscrepancySignals).not.toContain(ReceiptLineDiscrepancySignal.QuantityVariance);
    }
  });

  it('IFB-20: flags QuantityVariance once cumulative received exceeds ExpectedQuantity for a SerialControlled SKU (over-receipt)', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(
      {
        ...createRequest(),
        Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 3, ExternalLineReference: '10' }],
      },
      SystemAuditContext,
    );
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const useCase = confirmReceiptLineUseCase(bundle);
    const confirmUnit = (serialNumber: string, idempotencyKey: string) =>
      useCase.Execute(
        {
          ReceiptId: session.ReceiptId,
          InboundPlanLineId: created.Lines[0].Id,
          ActualQuantity: 1,
          SerialNumber: serialNumber,
          IdempotencyKey: idempotencyKey,
          ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      );

    const unit1 = await confirmUnit('SN-IFB20-OVER-001', 'ifb20-over-unit-1');
    const unit2 = await confirmUnit('SN-IFB20-OVER-002', 'ifb20-over-unit-2');
    const unit3 = await confirmUnit('SN-IFB20-OVER-003', 'ifb20-over-unit-3');

    // Review fix: assert units 1-3 are clean WITHIN this test so it proves the over-receipt
    // branch specifically (cumulative > expected), independent of the sibling "no false
    // positive" test -- otherwise this test can't distinguish correct over-receipt detection
    // from the pre-fix bug of unconditionally flagging every serial-controlled unit.
    for (const unit of [unit1, unit2, unit3]) {
      expect(unit.Status).toBe(ReceiptLineStatus.Received);
      expect(unit.DiscrepancySignals).not.toContain(ReceiptLineDiscrepancySignal.QuantityVariance);
    }

    const unit4 = await confirmUnit('SN-IFB20-OVER-004', 'ifb20-over-unit-4');

    expect(unit4.Status).toBe(ReceiptLineStatus.Discrepancy);
    expect(unit4.DiscrepancySignals).toContain(ReceiptLineDiscrepancySignal.QuantityVariance);
  });

  it("IFB-20 review fix: a substituted-SKU receipt line does not inflate the cumulative count used for the correct SKU's over-receipt check", async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(
      {
        ...createRequest(),
        Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 1, ExternalLineReference: '10' }],
      },
      SystemAuditContext,
    );
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const useCase = confirmReceiptLineUseCase(bundle);

    // Unit 1: scanned as a DIFFERENT (substituted) SKU -- flagged WrongSku on its own line,
    // unrelated to the quantity-variance logic under test here.
    const substituted = await useCase.Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        SkuId: 'sku-2',
        ActualQuantity: 1,
        SerialNumber: 'SN-IFB20-SUBSTITUTE',
        IdempotencyKey: 'ifb20-substitute-unit',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    expect(substituted.DiscrepancySignals).toContain(ReceiptLineDiscrepancySignal.WrongSku);

    // Unit 2: correct SKU (default, sku-1), ActualQuantity=1 == ExpectedQuantity=1. Without the
    // SkuId filter, the substituted line's quantity would wrongly count toward sku-1's cumulative
    // total (1 substituted + 1 this = 2 > 1 expected), falsely flagging QuantityVariance here.
    const correct = await useCase.Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 1,
        SerialNumber: 'SN-IFB20-CORRECT',
        IdempotencyKey: 'ifb20-correct-unit',
        ScanEvidence: { RawValue: 'barcode-2', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(correct.Status).toBe(ReceiptLineStatus.Received);
    expect(correct.DiscrepancySignals).not.toContain(ReceiptLineDiscrepancySignal.QuantityVariance);
  });

  it('blocks receipt line confirm reusing a SerialNumber already received for the same SKU (IFB-15)', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 1,
        SerialNumber: 'SN-IFB15-DUP',
        IdempotencyKey: 'ifb15-first-unit-1',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await expect(
      confirmReceiptLineUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          InboundPlanLineId: created.Lines[0].Id,
          ActualQuantity: 1,
          SerialNumber: 'SN-IFB15-DUP',
          IdempotencyKey: 'ifb15-second-unit-reusing-serial-1',
          ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('allows the same SerialNumber to be received for a DIFFERENT SKU (IFB-15, scoped by SkuId)', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockImplementation(async (id: string) => sku({ Id: id, SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(
      {
        ...createRequest(),
        Lines: [
          { LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 1, ExternalLineReference: '10' },
          { LineNumber: 2, SkuId: 'sku-2', UomId: 'uom-1', ExpectedQuantity: 1, ExternalLineReference: '20' },
        ],
      },
      SystemAuditContext,
    );
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 1,
        SerialNumber: 'SN-IFB15-SHARED',
        IdempotencyKey: 'ifb15-sku1-shared-serial-1',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const secondLine = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[1].Id,
        ActualQuantity: 1,
        SerialNumber: 'SN-IFB15-SHARED',
        IdempotencyKey: 'ifb15-sku2-shared-serial-1',
        ScanEvidence: { RawValue: 'barcode-2', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(secondLine.SerialNumber).toBe('SN-IFB15-SHARED');
  });

  it('allows an idempotent retry of the same payload even though its SerialNumber matches its own prior confirm (IFB-15)', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const requestPayload = {
      ReceiptId: session.ReceiptId,
      InboundPlanLineId: created.Lines[0].Id,
      ActualQuantity: 1,
      SerialNumber: 'SN-IFB15-RETRY',
      IdempotencyKey: 'ifb15-retry-same-payload-1',
      ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
    };

    await confirmReceiptLineUseCase(bundle).Execute(requestPayload, {
      ...SystemAuditContext,
      ActorUserId: 'user-1',
    });
    const retried = await confirmReceiptLineUseCase(bundle).Execute(requestPayload, {
      ...SystemAuditContext,
      ActorUserId: 'user-1',
    });

    expect(retried.SerialNumber).toBe('SN-IFB15-RETRY');
    expect(retried.IsDuplicate).toBe(true);
  });

  it('blocks receipt line confirm missing LotNumber when the SKU has LotControlled=true (IDC-02)', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ LotControlled: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await expect(
      confirmReceiptLineUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          InboundPlanLineId: created.Lines[0].Id,
          ActualQuantity: 12,
          IdempotencyKey: 'idc02-missing-lot-1',
          ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('blocks receipt line confirm missing ExpiryDate when the SKU has ExpiryControlled=true (IDC-02)', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ ExpiryControlled: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await expect(
      confirmReceiptLineUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          InboundPlanLineId: created.Lines[0].Id,
          ActualQuantity: 12,
          IdempotencyKey: 'idc02-missing-expiry-1',
          ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('allows receipt line confirm when the SKU has no control flags set — regression guard (IDC-02)', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'idc02-no-flags-1',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(line.Status).toBe(ReceiptLineStatus.Received);
  });

  it('rejects receipt line confirm when the SKU cannot be resolved — fail-closed (IDC-02)', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    // Plan/line creation above needs the SKU to resolve normally; only the confirm-line call itself
    // exercises the fail-closed path.
    bundle.skus.FindById.mockResolvedValue(null);

    await expect(
      confirmReceiptLineUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          InboundPlanLineId: created.Lines[0].Id,
          ActualQuantity: 12,
          IdempotencyKey: 'idc02-sku-not-found-1',
          ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('allows release without LPN when the SKU has no control flags set — regression guard (IDC-02)', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'idc02-release-no-flags-line',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'idc02-release-no-flags-qc' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    const release = await releaseInboundToPutawayUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'idc02-release-no-flags-release' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(release.InventoryStatusCode).toBe('READY_FOR_PUTAWAY');
  });

  it('requires LPN at release when the SKU has LpnControlled=true, even though profile/rule do not require it (IDC-02)', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ LpnControlled: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'idc02-sku-lpn-required-line',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'idc02-sku-lpn-required-qc' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'idc02-sku-lpn-required-release' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects release when the SKU cannot be resolved — fail-closed (IDC-02)', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'idc02-release-sku-not-found-line',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'idc02-release-sku-not-found-qc' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    bundle.skus.FindById.mockResolvedValue(null);

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'idc02-release-sku-not-found-rel' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('rejects receipt line confirm when Receipt Update permission is denied without side effects', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const planLine = created.Lines[0];
    const outboxBefore = bundle.integrations.Outbox.length;
    bundle.permissionChecker.Check.mockImplementation(async (context) =>
      context.ObjectType === ObjectType.Receipt && context.Action === ActionCode.Update
        ? { Allowed: false, Reason: 'OUT_OF_SCOPE' }
        : { Allowed: true },
    );

    await expect(
      confirmReceiptLineUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          InboundPlanLineId: planLine.Id,
          ActualQuantity: 12,
          IdempotencyKey: 'denied-line-1',
          ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(ForbiddenAppException);

    expect(bundle.receiving.Lines).toHaveLength(0);
    expect(bundle.integrations.Outbox).toHaveLength(outboxBefore);
    expect(bundle.coreFlows.CreateMilestone).not.toHaveBeenCalledWith(
      expect.objectContaining({ StepCode: CoreFlowStepCode.ReceiptLineReceived }),
      expect.anything(),
    );
  });

  it('blocks receiving session and line confirmation when gate-in readiness is blocked', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundGateInRequired: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    await expect(
      startReceivingUseCase(bundle).Execute(
        { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('captures receipt-line discrepancy, links ExceptionCase, emits event and dedupes retry', async () => {
    const bundle = repoBundle();
    const created = await createConfirmedPlan(bundle);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 14,
        IdempotencyKey: 'receipt-line-disc-1',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const useCase = captureInboundDiscrepancyUseCase(bundle);
    const discrepancy = await useCase.Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        DiscrepancyType: InboundDiscrepancyType.QuantityVariance,
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['photo://dock/over-qty-1'],
        EvidenceJson: { ExpectedQuantity: 12, ActualQuantity: 14 },
        IdempotencyKey: 'disc-1',
      },
      { ...SystemAuditContext, ActorUserId: 'supervisor-1' },
    );
    const duplicate = await useCase.Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        DiscrepancyType: InboundDiscrepancyType.QuantityVariance,
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['photo://dock/retry'],
        IdempotencyKey: 'disc-1',
      },
      { ...SystemAuditContext, ActorUserId: 'supervisor-1' },
    );
    bundle.permissionChecker.Check.mockImplementation(async (context) =>
      context.ObjectType === ObjectType.ExceptionCase ? { Allowed: false, Reason: 'OUT_OF_SCOPE' } : { Allowed: true },
    );
    const duplicateWithoutCreatePermission = await useCase.Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        DiscrepancyType: InboundDiscrepancyType.QuantityVariance,
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['photo://dock/retry-without-create-permission'],
        IdempotencyKey: 'disc-1',
      },
      { ...SystemAuditContext, ActorUserId: 'supervisor-1' },
    );
    await expect(
      useCase.Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          DiscrepancyType: InboundDiscrepancyType.DamagedGoods,
          ReasonCode: 'RC-V1-DISCREPANCY',
          EvidenceRefs: ['photo://dock/different-command'],
          IdempotencyKey: 'disc-1',
        },
        { ...SystemAuditContext, ActorUserId: 'supervisor-1' },
      ),
    ).rejects.toThrow(ConflictException);

    expect(discrepancy.Status).toBe(InboundDiscrepancyStatus.PendingApproval);
    expect(discrepancy.ToleranceDecision).toBe(InboundDiscrepancyToleranceDecision.OverTolerancePendingApproval);
    expect(discrepancy.ExceptionState).toBe(ExceptionState.Detected);
    expect(discrepancy.ExpectedQuantity).toBe(12);
    expect(discrepancy.ActualQuantity).toBe(14);
    expect(duplicate.IsDuplicate).toBe(true);
    expect(duplicateWithoutCreatePermission.IsDuplicate).toBe(true);
    expect(bundle.receiving.Discrepancies).toHaveLength(1);
    expect(bundle.exceptionCases.Cases).toHaveLength(1);
    expect(
      bundle.integrations.Outbox.filter((item) => (item as { EventType?: string }).EventType === 'DiscrepancyRecorded'),
    ).toHaveLength(1);
    expect(
      bundle.coreFlows.Milestones.filter(
        (item) => (item as { StepCode?: CoreFlowStepCode }).StepCode === CoreFlowStepCode.DiscrepancyRecorded,
      ),
    ).toHaveLength(1);
    expect(bundle.exceptionCases.Cases[0]).toMatchObject({
      ReferenceType: 'ReceiptLine',
      ReferenceId: line.Id,
      WarehouseId: 'warehouse-1',
      OwnerId: 'owner-1',
    });
    expect(bundle.integrations.Outbox[bundle.integrations.Outbox.length - 1]).toMatchObject({
      EventType: 'DiscrepancyRecorded',
      Payload: expect.objectContaining({ ExceptionCaseId: discrepancy.ExceptionCaseId }),
    });
    expect(bundle.coreFlows.Milestones[bundle.coreFlows.Milestones.length - 1]).toMatchObject({
      StepCode: CoreFlowStepCode.DiscrepancyRecorded,
    });
    expect(
      bundle.audited.Entries.filter(
        (item) => (item as { ReferenceType?: string }).ReferenceType === 'InboundDiscrepancy',
      ),
    ).toHaveLength(1);
  });

  it('returns existing discrepancy when concurrent retry loses the unique insert race', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 14,
        IdempotencyKey: 'receipt-line-disc-race',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const originalCreate = bundle.receiving.CreateInboundDiscrepancy.bind(bundle.receiving);
    bundle.receiving.CreateInboundDiscrepancy = jest.fn(async (discrepancy: InboundDiscrepancyEntity) => {
      bundle.receiving.Discrepancies.push(discrepancy);
      throw new ConflictException('Inbound discrepancy already exists');
    });

    const duplicate = await captureInboundDiscrepancyUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        DiscrepancyType: InboundDiscrepancyType.QuantityVariance,
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['photo://dock/over-qty-race'],
        IdempotencyKey: 'disc-race',
      },
      { ...SystemAuditContext, ActorUserId: 'supervisor-1' },
    );

    expect(duplicate.IsDuplicate).toBe(true);
    expect(bundle.receiving.Discrepancies).toHaveLength(1);
    bundle.receiving.CreateInboundDiscrepancy = originalCreate;
  });

  it('routes explicit damaged-goods discrepancy with evidence even when quantity matches', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-damaged-1',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const discrepancy = await captureInboundDiscrepancyUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        DiscrepancyType: InboundDiscrepancyType.DamagedGoods,
        ReasonCode: 'RC-V1-DISCREPANCY',
        ReasonNote: 'Carton crushed at dock',
        EvidenceRefs: ['photo://dock/damaged-carton-1'],
        IdempotencyKey: 'disc-damaged-1',
      },
      { ...SystemAuditContext, ActorUserId: 'supervisor-1' },
    );

    expect(line.DiscrepancySignals).toHaveLength(0);
    expect(discrepancy.DiscrepancyType).toBe(InboundDiscrepancyType.DamagedGoods);
    expect(discrepancy.ToleranceDecision).toBe(InboundDiscrepancyToleranceDecision.NotApplicable);
    expect(discrepancy.Status).toBe(InboundDiscrepancyStatus.Routed);
    expect(bundle.exceptionCases.Cases[0]).toMatchObject({
      ReferenceType: 'ReceiptLine',
      ReferenceId: line.Id,
      WarehouseId: 'warehouse-1',
      OwnerId: 'owner-1',
      EvidenceRefs: expect.arrayContaining(['photo://dock/damaged-carton-1']),
    });
  });

  it('rejects discrepancy type that does not match receipt-line signals', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 14,
        IdempotencyKey: 'receipt-line-type-mismatch',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await expect(
      captureInboundDiscrepancyUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          DiscrepancyType: InboundDiscrepancyType.WrongSku,
          ReasonCode: 'RC-V1-DISCREPANCY',
          EvidenceRefs: ['photo://dock/type-mismatch'],
          IdempotencyKey: 'disc-type-mismatch',
        },
        { ...SystemAuditContext, ActorUserId: 'supervisor-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(bundle.receiving.Discrepancies).toHaveLength(0);
    expect(bundle.exceptionCases.Cases).toHaveLength(0);
  });

  it('rejects discrepancy capture without reason or evidence and leaves no side effects', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 14,
        IdempotencyKey: 'receipt-line-disc-2',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await expect(
      captureInboundDiscrepancyUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          DiscrepancyType: InboundDiscrepancyType.QuantityVariance,
          ReasonCode: '',
          IdempotencyKey: 'disc-no-reason',
        },
        { ...SystemAuditContext, ActorUserId: 'supervisor-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(bundle.receiving.Discrepancies).toHaveLength(0);
    expect(bundle.exceptionCases.Cases).toHaveLength(0);
    expect(
      bundle.integrations.Outbox.filter((item) => (item as { EventType?: string }).EventType === 'DiscrepancyRecorded'),
    ).toHaveLength(0);
  });

  it('denies discrepancy capture when ExceptionCase create permission fails without side effects', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 14,
        IdempotencyKey: 'receipt-line-disc-3',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    bundle.permissionChecker.Check.mockImplementation(async (context) =>
      context.ObjectType === ObjectType.ExceptionCase ? { Allowed: false, Reason: 'OUT_OF_SCOPE' } : { Allowed: true },
    );

    await expect(
      captureInboundDiscrepancyUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          DiscrepancyType: InboundDiscrepancyType.QuantityVariance,
          ReasonCode: 'RC-V1-DISCREPANCY',
          EvidenceRefs: ['photo://dock/over-qty-1'],
          IdempotencyKey: 'disc-denied',
        },
        { ...SystemAuditContext, ActorUserId: 'supervisor-1' },
      ),
    ).rejects.toThrow(ForbiddenAppException);

    expect(bundle.receiving.Discrepancies).toHaveLength(0);
    expect(bundle.exceptionCases.Cases).toHaveLength(0);
  });

  it('denies discrepancy capture when Receipt update permission fails without side effects', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 14,
        IdempotencyKey: 'receipt-line-disc-receipt-denied',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    bundle.permissionChecker.Check.mockImplementation(async (context) =>
      context.ObjectType === ObjectType.Receipt ? { Allowed: false, Reason: 'OUT_OF_SCOPE' } : { Allowed: true },
    );

    await expect(
      captureInboundDiscrepancyUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          DiscrepancyType: InboundDiscrepancyType.QuantityVariance,
          ReasonCode: 'RC-V1-DISCREPANCY',
          EvidenceRefs: ['photo://dock/over-qty-1'],
          IdempotencyKey: 'disc-receipt-denied',
        },
        { ...SystemAuditContext, ActorUserId: 'supervisor-1' },
      ),
    ).rejects.toThrow(ForbiddenAppException);

    expect(bundle.receiving.Discrepancies).toHaveLength(0);
    expect(bundle.exceptionCases.Cases).toHaveLength(0);
    expect(
      bundle.integrations.Outbox.filter((item) => (item as { EventType?: string }).EventType === 'DiscrepancyRecorded'),
    ).toHaveLength(0);
    expect(
      bundle.coreFlows.Milestones.filter(
        (item) => (item as { StepCode?: CoreFlowStepCode }).StepCode === CoreFlowStepCode.DiscrepancyRecorded,
      ),
    ).toHaveLength(0);
    expect(
      bundle.audited.Entries.filter(
        (item) => (item as { ReferenceType?: string }).ReferenceType === 'InboundDiscrepancy',
      ),
    ).toHaveLength(0);
  });

  it('marks over-tolerance discrepancy hard blocked when WarehouseProfile policy requests hard block', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(
      profile({ receivingOverToleranceMode: 'hard_block' }, { receivingOverTolerancePercent: 5 }),
    );
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 14,
        IdempotencyKey: 'receipt-line-disc-4',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const discrepancy = await captureInboundDiscrepancyUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        DiscrepancyType: InboundDiscrepancyType.QuantityVariance,
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['photo://dock/over-qty-1'],
        IdempotencyKey: 'disc-hard-block',
      },
      { ...SystemAuditContext, ActorUserId: 'supervisor-1' },
    );

    expect(discrepancy.Status).toBe(InboundDiscrepancyStatus.Blocked);
    expect(discrepancy.ToleranceDecision).toBe(InboundDiscrepancyToleranceDecision.OverToleranceHardBlocked);
    expect(discrepancy.Severity).toBe(ControlExceptionSeverity.High);
  });

  it('creates QC task when profile requires QC and never marks inventory Available before QC result', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundQcRequired: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-qc-required',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const useCase = evaluateQcTaskUseCase(bundle);
    const task = await useCase.Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        IdempotencyKey: 'qc-task-required',
      },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    const duplicate = await useCase.Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        IdempotencyKey: 'qc-task-required',
      },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    expect(task.Required).toBe(true);
    expect(task.TaskStatus).toBe(QcTaskStatus.PendingQc);
    expect(task.TriggerReason).toBe('WarehouseProfile');
    expect(task.InventoryStatusCode).toBe('PENDING_QC');
    expect(task.InventoryStatusCode).not.toBe('AVAILABLE');
    expect(duplicate.IsDuplicate).toBe(true);
    expect(bundle.receiving.QcTasks).toHaveLength(1);
    expect(
      bundle.integrations.Outbox.filter((item) => (item as { EventType?: string }).EventType === 'QCRequired'),
    ).toHaveLength(1);
  });

  it('records skipped QC trace and QcCompleted skipped milestone when profile does not require QC', async () => {
    const bundle = repoBundle();
    const created = await createConfirmedPlan(bundle);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-qc-skipped',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const task = await evaluateQcTaskUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        IdempotencyKey: 'qc-task-skipped',
      },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    expect(task.Required).toBe(false);
    expect(task.TaskStatus).toBe(QcTaskStatus.NotRequired);
    expect(task.InventoryStatusCode).toBe('READY_FOR_PUTAWAY');
    expect(task.InventoryStatusCode).not.toBe('AVAILABLE');
    expect(
      bundle.integrations.Outbox.filter((item) => (item as { EventType?: string }).EventType === 'QCRequired'),
    ).toHaveLength(0);
    expect(
      bundle.coreFlows.Milestones.filter(
        (item) =>
          (item as { StepCode?: CoreFlowStepCode; MilestoneStatus?: WorkflowMilestoneStatus }).StepCode ===
            CoreFlowStepCode.QcCompleted &&
          (item as { MilestoneStatus?: WorkflowMilestoneStatus }).MilestoneStatus === WorkflowMilestoneStatus.Skipped,
      ),
    ).toHaveLength(1);
  });

  it('records QC pass result, closes task and emits QCResultRecorded idempotently', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundQcRequired: true }));
    const created = await createConfirmedPlan(bundle);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-qc-pass',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const task = await evaluateQcTaskUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        IdempotencyKey: 'qc-task-pass',
      },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    const useCase = recordQcResultUseCase(bundle);
    const result = await useCase.Execute(
      {
        QcTaskId: task.Id,
        ResultStatus: QcResultStatus.Passed,
        DispositionCode: QcDispositionCode.Release,
        InspectedQuantity: 12,
        AcceptedQuantity: 12,
        RejectedQuantity: 0,
        IdempotencyKey: 'qc-result-pass',
      },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    const duplicate = await useCase.Execute(
      {
        QcTaskId: task.Id,
        ResultStatus: QcResultStatus.Passed,
        DispositionCode: QcDispositionCode.Release,
        InspectedQuantity: 12,
        AcceptedQuantity: 12,
        RejectedQuantity: 0,
        IdempotencyKey: 'qc-result-pass',
      },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    await expect(
      useCase.Execute(
        {
          QcTaskId: task.Id,
          ResultStatus: QcResultStatus.Passed,
          DispositionCode: QcDispositionCode.Release,
          InspectedQuantity: 12,
          AcceptedQuantity: 12,
          RejectedQuantity: 0,
          IdempotencyKey: 'qc-result-pass-second',
        },
        { ...SystemAuditContext, ActorUserId: 'qc-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(result.TaskStatus).toBe(QcTaskStatus.Closed);
    expect(result.TargetInventoryStatusCode).toBe('READY_FOR_PUTAWAY');
    expect(result.TargetInventoryStatusCode).not.toBe('AVAILABLE');
    expect(duplicate.IsDuplicate).toBe(true);
    expect(bundle.receiving.QcResults).toHaveLength(1);
    expect(
      bundle.integrations.Outbox.filter((item) => (item as { EventType?: string }).EventType === 'QCResultRecorded'),
    ).toHaveLength(1);
    expect(
      bundle.coreFlows.Milestones.filter(
        (item) => (item as { StepCode?: CoreFlowStepCode }).StepCode === CoreFlowStepCode.QcCompleted,
      ),
    ).toHaveLength(1);
  });

  it('records split QC fail disposition with reason, evidence and blocked target status', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundQcRequired: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-qc-split',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const task = await evaluateQcTaskUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        IdempotencyKey: 'qc-task-split',
      },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    const result = await recordQcResultUseCase(bundle).Execute(
      {
        QcTaskId: task.Id,
        ResultStatus: QcResultStatus.Failed,
        DispositionCode: QcDispositionCode.Quarantine,
        InspectedQuantity: 12,
        AcceptedQuantity: 8,
        RejectedQuantity: 4,
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['photo://qc/damaged-4'],
        EvidenceJson: { AcceptedQuantity: 8, RejectedQuantity: 4 },
        IdempotencyKey: 'qc-result-split',
      },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    expect(result.TaskStatus).toBe(QcTaskStatus.Dispositioned);
    expect(result.AcceptedInventoryStatusCode).toBe('READY_FOR_PUTAWAY');
    expect(result.RejectedInventoryStatusCode).toBe('QUARANTINE');
    expect(result.TargetInventoryStatusCode).toBe('QUARANTINE');
    expect(result.TargetInventoryStatusCode).not.toBe('AVAILABLE');
    expect(bundle.receiving.QcTasks[0].InventoryStatusCode).toBe('QUARANTINE');
    expect(
      bundle.audited.Entries.filter((item) => (item as { ReferenceType?: string }).ReferenceType === 'QcResult'),
    ).toHaveLength(1);
  });

  it('rejects QC fail disposition without reason/evidence and leaves no side effects', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundQcRequired: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-qc-reject',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const task = await evaluateQcTaskUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        IdempotencyKey: 'qc-task-reject',
      },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    await expect(
      recordQcResultUseCase(bundle).Execute(
        {
          QcTaskId: task.Id,
          ResultStatus: QcResultStatus.Failed,
          DispositionCode: QcDispositionCode.Quarantine,
          InspectedQuantity: 12,
          AcceptedQuantity: 8,
          RejectedQuantity: 4,
          IdempotencyKey: 'qc-result-reject',
        },
        { ...SystemAuditContext, ActorUserId: 'qc-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(bundle.receiving.QcResults).toHaveLength(0);
    expect(
      bundle.integrations.Outbox.filter((item) => (item as { EventType?: string }).EventType === 'QCResultRecorded'),
    ).toHaveLength(0);
    expect(bundle.receiving.QcTasks[0].TaskStatus).toBe(QcTaskStatus.PendingQc);
  });

  it('denies QC create and update permissions without side effects', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundQcRequired: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-qc-denied',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    bundle.permissionChecker.Check.mockImplementation(async (context) =>
      context.ObjectType === ObjectType.QcTask && context.Action === ActionCode.Create
        ? { Allowed: false, Reason: 'OUT_OF_SCOPE' }
        : { Allowed: true },
    );

    await expect(
      evaluateQcTaskUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          IdempotencyKey: 'qc-task-create-denied',
        },
        { ...SystemAuditContext, ActorUserId: 'qc-1' },
      ),
    ).rejects.toThrow(ForbiddenAppException);

    expect(bundle.receiving.QcTasks).toHaveLength(0);
    expect(
      bundle.integrations.Outbox.filter((item) => (item as { EventType?: string }).EventType === 'QCRequired'),
    ).toHaveLength(0);

    bundle.permissionChecker.Check.mockResolvedValue({ Allowed: true });
    const task = await evaluateQcTaskUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        IdempotencyKey: 'qc-task-update-denied',
      },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    bundle.permissionChecker.Check.mockImplementation(async (context) =>
      context.ObjectType === ObjectType.QcTask && context.Action === ActionCode.Update
        ? { Allowed: false, Reason: 'OUT_OF_SCOPE' }
        : { Allowed: true },
    );

    await expect(
      recordQcResultUseCase(bundle).Execute(
        {
          QcTaskId: task.Id,
          ResultStatus: QcResultStatus.Passed,
          DispositionCode: QcDispositionCode.Release,
          InspectedQuantity: 12,
          AcceptedQuantity: 12,
          RejectedQuantity: 0,
          IdempotencyKey: 'qc-result-update-denied',
        },
        { ...SystemAuditContext, ActorUserId: 'qc-1' },
      ),
    ).rejects.toThrow(ForbiddenAppException);

    expect(bundle.receiving.QcResults).toHaveLength(0);
    expect(
      bundle.integrations.Outbox.filter((item) => (item as { EventType?: string }).EventType === 'QCResultRecorded'),
    ).toHaveLength(0);
  });

  it('confirms LPN/SSCC with Receipt update permission, audit trace, uniqueness and idempotency', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-lpn',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const useCase = confirmInboundLpnUseCase(bundle);
    const lpn = await useCase.Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        LpnCode: ' lpn-0001 ',
        SsccCode: '003456789012345678',
        IdempotencyKey: 'lpn-confirm-1',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const duplicate = await useCase.Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        LpnCode: 'LPN-0001',
        SsccCode: '003456789012345678',
        IdempotencyKey: 'lpn-confirm-1',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await expect(
      useCase.Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          LpnCode: 'LPN-0001',
          IdempotencyKey: 'lpn-confirm-conflict',
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(ConflictException);

    expect(lpn.LpnCode).toBe('LPN-0001');
    expect(lpn.SsccCode).toBe('003456789012345678');
    expect(lpn.Quantity).toBe(12);
    expect(duplicate.IsDuplicate).toBe(true);
    expect(bundle.receiving.Lpns).toHaveLength(1);
    expect(bundle.permissionChecker.Check).toHaveBeenCalledWith(
      expect.objectContaining({ Action: ActionCode.Update, ObjectType: ObjectType.Receipt }),
    );
    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.Receipt,
      ReferenceType: 'InboundLpn',
    });
  });

  it('blocks release to putaway when profile requires LPN and receipt line has no LPN', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundLpnRequired: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-release-no-lpn',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'qc-release-no-lpn' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          IdempotencyKey: 'release-no-lpn',
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(bundle.receiving.PutawayReleases).toHaveLength(0);
    expect(
      bundle.integrations.Outbox.filter(
        (item) => (item as { EventType?: string }).EventType === 'InboundReleasedToPutaway',
      ),
    ).toHaveLength(0);
    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.Receipt,
      ReferenceType: 'InboundPutawayReleaseBlocked',
    });
  });

  it('releases READY_FOR_PUTAWAY receipt line to putaway with label validation, outbox and CoreFlow milestone', async () => {
    const bundle = repoBundle();
    const created = await createConfirmedPlan(bundle);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-release-ready',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'qc-release-ready' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    const lpn = await confirmInboundLpnUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        LpnCode: 'LPN-READY-1',
        IdempotencyKey: 'lpn-release-ready',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const useCase = releaseInboundToPutawayUseCase(bundle);
    const release = await useCase.Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        CurrentLocationCode: 'RCV-01',
        ReasonCode: 'RC-V1-HANDOFF',
        IdempotencyKey: 'release-ready',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const duplicate = await useCase.Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        CurrentLocationCode: 'RCV-01',
        ReasonCode: 'RC-V1-HANDOFF',
        IdempotencyKey: 'release-ready',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await expect(
      useCase.Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          CurrentLocationCode: 'STAGE-01',
          IdempotencyKey: 'release-ready',
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(ConflictException);

    expect(release.InboundLpnId).toBe(lpn.Id);
    expect(release.LpnCode).toBe('LPN-READY-1');
    expect(release.InventoryStatusCode).toBe('READY_FOR_PUTAWAY');
    expect(release.InventoryStatusCode).not.toBe('AVAILABLE');
    expect(release.CurrentLocationCode).toBe('RCV-01');
    expect(release.ReasonCodeId).toBe('reason-1');
    expect(duplicate.IsDuplicate).toBe(true);
    expect(bundle.receiving.PutawayReleases).toHaveLength(1);
    expect(bundle.reasonCatalog.ValidateReason).toHaveBeenCalledWith({
      ReasonCode: 'RC-V1-HANDOFF',
      Action: ActionCode.Update,
      ObjectType: ObjectType.Receipt,
    });
    expect(bundle.labelBlocking.Execute).toHaveBeenCalledWith(
      expect.objectContaining({ DownstreamAction: 'putaway', BusinessObjectType: 'ReceiptLine' }),
      expect.objectContaining({ ActorUserId: 'user-1' }),
    );
    expect(
      bundle.integrations.Outbox.filter(
        (item) => (item as { EventType?: string }).EventType === 'InboundReleasedToPutaway',
      ),
    ).toHaveLength(1);
    expect(
      bundle.coreFlows.Milestones.filter(
        (item) => (item as { StepCode?: CoreFlowStepCode }).StepCode === CoreFlowStepCode.InboundReleasedToPutaway,
      ),
    ).toHaveLength(1);
  });

  it('resolves CurrentLocationId by warehouse+code when the release request omits it (IFB-13)', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-release-no-location',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'qc-release-no-location' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    await confirmInboundLpnUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        LpnCode: 'LPN-NO-LOCATION-1',
        IdempotencyKey: 'lpn-release-no-location',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const release = await releaseInboundToPutawayUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        IdempotencyKey: 'release-no-location',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    // IFB-13 root fix: CurrentLocationId used to default to null independently of
    // CurrentLocationCode defaulting to 'RECEIVING' -- a release created this way could never be
    // putaway-confirmed later. It must now resolve to a real location id via warehouse+code lookup.
    expect(release.CurrentLocationCode).toBe('RECEIVING');
    expect(release.CurrentLocationId).toBe('location-receiving-1');
    expect(release.CurrentLocationId).not.toBeNull();
    expect(bundle.locations.FindByWarehouseAndCode).toHaveBeenCalledWith(created.WarehouseId, 'RECEIVING');
  });

  it('fails release loudly (not silently with a null id) when no location matches the current-location code (IFB-13)', async () => {
    const bundle = repoBundle();
    bundle.locations.FindByWarehouseAndCode.mockResolvedValueOnce(null);
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-release-unresolvable-location',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'qc-release-unresolvable-location' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    await confirmInboundLpnUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        LpnCode: 'LPN-UNRESOLVABLE-1',
        IdempotencyKey: 'lpn-release-unresolvable-location',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          IdempotencyKey: 'release-unresolvable-location',
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(bundle.receiving.PutawayReleases).toHaveLength(0);
  });

  it('fails release loudly when the current-location code resolves to an INACTIVE location, not just a missing one (IFB-13 dual-review patch)', async () => {
    const bundle = repoBundle();
    bundle.locations.FindByWarehouseAndCode.mockResolvedValueOnce(
      location({ LocationStatus: LocationStatus.Inactive }),
    );
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-release-inactive-location',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'qc-release-inactive-location' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    await confirmInboundLpnUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        LpnCode: 'LPN-INACTIVE-LOCATION-1',
        IdempotencyKey: 'lpn-release-inactive-location',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          IdempotencyKey: 'release-inactive-location',
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(bundle.receiving.PutawayReleases).toHaveLength(0);
  });

  it('accepts a caller-supplied CurrentLocationId once it is verified to exist, belong to the release warehouse, and be Active (IFB-17 review-fix)', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-release-supplied-location',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'qc-release-supplied-location' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    const release = await releaseInboundToPutawayUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        CurrentLocationId: 'location-dock-2',
        IdempotencyKey: 'release-supplied-location',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(bundle.locations.FindById).toHaveBeenCalledWith('location-dock-2');
    expect(release.CurrentLocationId).toBe('location-dock-2');
  });

  it('rejects a caller-supplied CurrentLocationId that does not exist, instead of trusting it as-is (IFB-17 review-fix)', async () => {
    const bundle = repoBundle();
    bundle.locations.FindById.mockResolvedValueOnce(null);
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-release-bogus-location',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'qc-release-bogus-location' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          CurrentLocationId: 'location-does-not-exist',
          IdempotencyKey: 'release-bogus-location',
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(bundle.receiving.PutawayReleases).toHaveLength(0);
  });

  it('rejects a caller-supplied CurrentLocationId that belongs to a different warehouse than the receipt (IFB-17 review-fix)', async () => {
    const bundle = repoBundle();
    bundle.locations.FindById.mockResolvedValueOnce(
      location({ Id: 'location-other-warehouse', WarehouseId: 'warehouse-other' }),
    );
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-release-cross-warehouse-location',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'qc-release-cross-warehouse-location' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          CurrentLocationId: 'location-other-warehouse',
          IdempotencyKey: 'release-cross-warehouse-location',
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(bundle.receiving.PutawayReleases).toHaveLength(0);
  });

  it('rejects a caller-supplied CurrentLocationId that resolves to an INACTIVE location (IFB-17 review-fix)', async () => {
    const bundle = repoBundle();
    bundle.locations.FindById.mockResolvedValueOnce(
      location({ Id: 'location-inactive-supplied', LocationStatus: LocationStatus.Inactive }),
    );
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-release-inactive-supplied-location',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        IdempotencyKey: 'qc-release-inactive-supplied-location',
      },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          CurrentLocationId: 'location-inactive-supplied',
          IdempotencyKey: 'release-inactive-supplied-location',
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(bundle.receiving.PutawayReleases).toHaveLength(0);
  });

  it('blocks release while QC target is pending or blocked and does not emit putaway event', async () => {
    const bundle = repoBundle();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundQcRequired: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-release-pending-qc',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'qc-release-pending' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    await confirmInboundLpnUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        LpnCode: 'LPN-PENDING-QC',
        IdempotencyKey: 'lpn-release-pending',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        {
          ReceiptId: session.ReceiptId,
          ReceiptLineId: line.Id,
          IdempotencyKey: 'release-pending-qc',
        },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(bundle.receiving.PutawayReleases).toHaveLength(0);
    expect(
      bundle.integrations.Outbox.filter(
        (item) => (item as { EventType?: string }).EventType === 'InboundReleasedToPutaway',
      ),
    ).toHaveLength(0);
  });
});

describe('GetInboundOperationalStateUseCase (IRM-01)', () => {
  const operationalStateUseCase = (bundle: ReturnType<typeof repoBundle>) =>
    new GetInboundOperationalStateUseCase(bundle.inbound, bundle.receiving, bundle.permissionChecker);

  it('throws when the inbound plan does not exist', async () => {
    const bundle = repoBundle();
    await expect(operationalStateUseCase(bundle).Execute('missing-plan', 'user-1')).rejects.toThrow();
  });

  it('denies the read when the actor lacks permission', async () => {
    const bundle = repoBundle();
    const created = (await createUseCase(bundle).Execute(createRequest(), SystemAuditContext)) as InboundPlanDto;
    bundle.permissionChecker.Check.mockResolvedValue({ Allowed: false } as never);
    await expect(operationalStateUseCase(bundle).Execute(created.Id, 'user-1')).rejects.toThrow();
  });

  it('returns an empty aggregate when receiving has not started', async () => {
    const bundle = repoBundle();
    const created = (await createUseCase(bundle).Execute(createRequest(), SystemAuditContext)) as InboundPlanDto;
    const state = await operationalStateUseCase(bundle).Execute(created.Id, 'user-1');
    expect(state).toMatchObject({
      InboundPlanId: created.Id,
      ReceivingSessions: [],
      ReceiptLines: [],
      QcTasks: [],
      QcResults: [],
      Lpns: [],
      Releases: [],
      Discrepancies: [],
    });
  });

  it('aggregates persisted operational progress keyed by inbound plan', async () => {
    const bundle = repoBundle();
    const created = (await createUseCase(bundle).Execute(createRequest(), SystemAuditContext)) as InboundPlanDto;
    const planId = created.Id;
    const receiptId = 'receipt-1';
    bundle.receiving.Receipts.push({
      Id: receiptId,
      InboundPlanId: planId,
      ReceiptNumber: 'RC-1',
    } as unknown as ReceiptEntity);
    bundle.receiving.Sessions.push({
      Id: 'session-1',
      InboundPlanId: planId,
      ReceiptId: receiptId,
      StartedAt: new Date(),
    } as unknown as ReceivingSessionEntity);
    bundle.receiving.Lines.push({
      Id: 'line-1',
      ReceiptId: receiptId,
      InboundPlanId: planId,
      InboundPlanLineId: 'plan-line-1',
      Status: 'Received',
      ActualQuantity: 5,
      DiscrepancySignals: [],
    } as unknown as ReceiptLineEntity);
    bundle.receiving.QcTasks.push({
      Id: 'qc-task-1',
      ReceiptId: receiptId,
      ReceiptLineId: 'line-1',
      InboundPlanLineId: 'plan-line-1',
      TaskStatus: 'Dispositioned',
      Required: true,
    } as unknown as QcTaskEntity);
    bundle.receiving.QcResults.push({
      Id: 'qc-result-1',
      QcTaskId: 'qc-task-1',
      ReceiptId: receiptId,
      ReceiptLineId: 'line-1',
    } as unknown as QcResultEntity);
    bundle.receiving.Lpns.push({
      Id: 'lpn-1',
      ReceiptId: receiptId,
      ReceiptLineId: 'line-1',
      LpnCode: 'LPN-1',
    } as unknown as InboundLpnEntity);
    bundle.receiving.PutawayReleases.push({
      Id: 'release-1',
      ReceiptId: receiptId,
      ReceiptLineId: 'line-1',
      InventoryStatusCode: 'AVAILABLE',
    } as unknown as InboundPutawayReleaseEntity);
    bundle.receiving.Discrepancies.push({
      Id: 'discrepancy-1',
      ReceiptId: receiptId,
      ReceiptLineId: 'line-1',
      DiscrepancyType: 'QuantityVariance',
      Status: 'Routed',
    } as unknown as InboundDiscrepancyEntity);

    const state = await operationalStateUseCase(bundle).Execute(planId, 'user-1');

    expect(state.InboundPlanId).toBe(planId);
    expect(state.ReceivingSessions).toHaveLength(1);
    expect(state.ReceiptLines).toHaveLength(1);
    expect(state.ReceiptLines[0].Id).toBe('line-1');
    expect(state.QcTasks).toHaveLength(1);
    expect(state.QcResults).toHaveLength(1);
    expect(state.QcResults[0].TaskStatus).toBe('Dispositioned');
    expect(state.Lpns[0].LpnCode).toBe('LPN-1');
    expect(state.Releases[0].InventoryStatusCode).toBe('AVAILABLE');
    expect(state.Discrepancies).toHaveLength(1);
    expect(state.Discrepancies[0].Status).toBe('Routed');
  });
});

describe('IRE-02 rule-driven gate-in + tolerance (real RuleResolver + seeded WT-01)', () => {
  const startAndConfirmLine = async (bundle: ReturnType<typeof repoBundle>, actualQuantity: number) => {
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: actualQuantity,
        IdempotencyKey: 'ire02-line-1',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    return { created, session, line };
  };

  const captureQuantityVariance = (bundle: ReturnType<typeof repoBundle>, receiptId: string, receiptLineId: string) =>
    captureInboundDiscrepancyUseCase(bundle).Execute(
      {
        ReceiptId: receiptId,
        ReceiptLineId: receiptLineId,
        DiscrepancyType: InboundDiscrepancyType.QuantityVariance,
        ReasonCode: 'RC-V1-DISCREPANCY',
        EvidenceRefs: ['photo://dock/ire02'],
        IdempotencyKey: 'ire02-disc-1',
      },
      { ...SystemAuditContext, ActorUserId: 'supervisor-1' },
    );

  it('tolerance: seeded RULE-IN-TOL-01 (overUnderPct > 5) drives PendingApproval even when the profile threshold (50%) would allow it', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    // Fallback would say WithinTolerance (16.7% <= 50%); the rule must override to PendingApproval.
    bundle.profiles.FindById.mockResolvedValue(profile({}, { receivingOverTolerancePercent: 50 }));
    const { session, line } = await startAndConfirmLine(bundle, 14); // expected 12 → 16.7%

    const discrepancy = await captureQuantityVariance(bundle, session.ReceiptId, line.Id);

    expect(discrepancy.ToleranceDecision).toBe(InboundDiscrepancyToleranceDecision.OverTolerancePendingApproval);
    expect(discrepancy.Status).toBe(InboundDiscrepancyStatus.PendingApproval);
    // IRE-09: the winning rule's code must be persisted on the discrepancy record for audit.
    expect(discrepancy.RuleCode).toBe('RULE-IN-TOL-01');
  });

  it('tolerance backward-compat: empty decision → previous threshold logic (16.7% <= 50%) → WithinTolerance/Routed', async () => {
    const bundle = repoBundle(); // default empty gate
    bundle.profiles.FindById.mockResolvedValue(profile({}, { receivingOverTolerancePercent: 50 }));
    const { session, line } = await startAndConfirmLine(bundle, 14);

    const discrepancy = await captureQuantityVariance(bundle, session.ReceiptId, line.Id);

    expect(discrepancy.ToleranceDecision).toBe(InboundDiscrepancyToleranceDecision.WithinTolerance);
    expect(discrepancy.Status).toBe(InboundDiscrepancyStatus.Routed);
    // IRE-09: no rule consulted on the fallback path, so RuleCode must be null (not stale/omitted).
    expect(discrepancy.RuleCode).toBeNull();
  });

  it('tolerance boundary expectedQuantity=0: overUnderPct formula yields exactly 100 (guarded via fallback threshold 50)', async () => {
    // Run on the FALLBACK path (empty gate) with threshold=50 so the exact computed overUnderPct is
    // what the comparison hinges on: 100 > 50 → over-tolerance. A wrong expected===0 branch (e.g. 6)
    // would give 6 <= 50 → WithinTolerance and fail this test — so it truly guards the formula.
    const bundle = repoBundle(); // default empty gate → fallback threshold path
    bundle.profiles.FindById.mockResolvedValue(profile({}, { receivingOverTolerancePercent: 50 }));
    const { session, line } = await startAndConfirmLine(bundle, 14);
    // Force the stored receipt line to the expected=0 boundary (actual > expected still holds).
    const storedLine = bundle.receiving.Lines.find((item) => item.Id === line.Id)!;
    storedLine.ExpectedQuantity = 0;
    storedLine.ActualQuantity = 3;

    const discrepancy = await captureQuantityVariance(bundle, session.ReceiptId, line.Id);

    expect(discrepancy.ToleranceDecision).toBe(InboundDiscrepancyToleranceDecision.OverTolerancePendingApproval);
  });

  it('gate-in: a plan with no linked WarehouseProfile is NOT newly gated by a scope-matching rule (ADR-5, override stays reachable)', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    // No plan-linked profile: pre-migration this plan was never gated; the scope rule must not gate it.
    const created = await createUseCase(bundle).Execute(
      { ...createRequest(), WarehouseProfileId: undefined },
      SystemAuditContext,
    );
    bundle.inbound.Plans[0].ExpectedArrivalAt = null; // would satisfy RULE-IN-GATE-01 if consulted

    const readiness = await readinessUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    expect(readiness.Allowed).toBe(true);
    expect(readiness.GateInRequired).toBe(false);
  });

  it('gate-in: seeded RULE-IN-GATE-01 (no appointment) forces gate-in required even when policy does not', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.profiles.FindById.mockResolvedValue(profile({})); // no inboundGateInRequired policy
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    // No appointment → hasAppointment=false → RULE-IN-GATE-01 fires.
    bundle.inbound.Plans[0].ExpectedArrivalAt = null;

    const readiness = await readinessUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    expect(readiness.Blocked).toBe(true);
    expect(readiness.GateInRequired).toBe(true);
  });

  it('gate-in backward-compat: empty decision + no policy → gate-in not required → Allowed', async () => {
    const bundle = repoBundle(); // default empty gate
    bundle.profiles.FindById.mockResolvedValue(profile({}));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    bundle.inbound.Plans[0].ExpectedArrivalAt = null;

    const readiness = await readinessUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    expect(readiness.Allowed).toBe(true);
    expect(readiness.GateInRequired).toBe(false);
  });

  it('IRE-09: gate-in Decision is ApprovalRequired (not Blocked) and persists RuleCode when RULE-IN-GATE-01 (ApprovalRequired mode) fires', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.profiles.FindById.mockResolvedValue(profile({})); // no inboundGateInRequired policy
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    // No appointment → hasAppointment=false → RULE-IN-GATE-01 (ApprovalRequired mode) fires.
    bundle.inbound.Plans[0].ExpectedArrivalAt = null;

    const readiness = await readinessUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    expect(readiness.Blocked).toBe(true); // not Allowed — approval is still required before receiving
    expect(readiness.Decision).toBe('ApprovalRequired');
    expect(readiness.RuleCode).toBe('RULE-IN-GATE-01');
  });

  it('IRE-09: gate-in Decision is Blocked with RuleCode null when the policy-fallback path gates (no rule matched)', async () => {
    const bundle = repoBundle(); // default empty gate — no rule ever matches
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundGateInRequired: true }));
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    const readiness = await readinessUseCase(bundle).Execute({ Id: created.Id }, SystemAuditContext);

    expect(readiness.Blocked).toBe(true);
    expect(readiness.Decision).toBe('Blocked');
    expect(readiness.RuleCode).toBeNull();
  });

  it('IRE-07: ruleGate.Decide() is called with SkuId for the tolerance check — a future SKU-scoped RULE-IN-TOL-01 variant would be able to match', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.profiles.FindById.mockResolvedValue(profile({}, { receivingOverTolerancePercent: 50 }));
    const { session, line } = await startAndConfirmLine(bundle, 14); // expected 12 → 16.7%

    const decideSpy = jest.spyOn(bundle.ruleGate, 'Decide');
    await captureQuantityVariance(bundle, session.ReceiptId, line.Id);

    expect(decideSpy).toHaveBeenCalledWith(expect.objectContaining({ SkuId: 'sku-1' }));
  });

  it('IRE-07: a SKU-scoped rule variant genuinely fires when line.SkuId matches its scope — proves the threaded value is load-bearing, not just plumbing', async () => {
    const groups = new InMemoryRuleGroupRepository();
    await SeedRuleGroupCatalog(groups);
    const rInboundGroup = await groups.FindByCode('R-INBOUND');
    const definitions = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    const skuScopedProfile = new WarehouseProfileEntity({
      Id: 'wp-demo-ire07',
      ProfileCode: InboundBaselineProfileCode,
      ProfileName: 'Demo WT-01 (IRE-07 SKU-scoped test)',
      WarehouseTypeCode: InboundBaselineWarehouseTypeCode,
      WarehouseId: 'warehouse-1',
      OwnerId: 'owner-1',
      Version: 1,
      Status: WarehouseProfileStatus.Active,
      ScopeKey: 'warehouse-1:owner-1',
      EffectiveFrom: new Date('2020-01-01T00:00:00.000Z'),
      CreatedAt: now,
      UpdatedAt: now,
    });
    await profiles.Create(skuScopedProfile);
    // Scoped to SkuId='sku-1' (matches createRequest()'s line) — a mismatching SKU could never
    // reach this assertion at all, so a HardBlock firing here can ONLY be explained by the SkuId
    // this diff now threads through actually driving the rule's scope match.
    const skuScopedRule = new RuleDefinitionEntity({
      Id: randomUUID(),
      RuleCode: 'RULE-IN-TOL-SKU-TEST',
      RuleName: 'SKU-scoped tolerance test rule (IRE-07)',
      RuleGroupId: rInboundGroup!.Id,
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.HardBlock,
      WarehouseTypeCode: InboundBaselineWarehouseTypeCode,
      SkuId: 'sku-1',
      ScopeKey: 'warehouse-1:owner-1:sku-1',
      ConditionJson: { Operator: 'ALL', Predicates: [{ Field: 'overUnderPct', Comparator: 'GT', Value: 0 }] },
      ActionJson: { Type: 'BLOCK', Params: { Message: 'IRE-07 SKU-scoped test rule' } },
      Status: RuleStatus.Active,
      EffectiveFrom: new Date('2020-01-01T00:00:00.000Z'),
      CreatedAt: now,
      UpdatedAt: now,
    });
    await definitions.Create(skuScopedRule);
    await bindings.Create(
      new WarehouseProfileRuleEntity({
        Id: randomUUID(),
        WarehouseProfileId: skuScopedProfile.Id,
        RuleDefinitionId: skuScopedRule.Id,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    const warehouses = new InMemoryWarehouseRepository();
    warehouses.Seed(warehouse());
    const resolver = new RuleResolver(profiles, definitions, bindings, groups, new ConditionEvaluator());
    const ruleGate = new InboundRuleGate(resolver, warehouses);

    const bundle = repoBundle();
    bundle.ruleGate = ruleGate;
    bundle.profiles.FindById.mockResolvedValue(profile({}, { receivingOverTolerancePercent: 50 }));
    const { session, line } = await startAndConfirmLine(bundle, 14); // expected 12 → line.SkuId='sku-1'

    const discrepancy = await captureQuantityVariance(bundle, session.ReceiptId, line.Id);

    expect(discrepancy.ToleranceDecision).toBe(InboundDiscrepancyToleranceDecision.OverToleranceHardBlocked);
  });

  it('IRE-08 null-profile skip: a plan with no WarehouseProfileId never calls the rule gate for tolerance and falls back to the (default 0%) threshold unchanged', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    const created = await createUseCase(bundle).Execute(
      { ...createRequest(), WarehouseProfileId: undefined },
      SystemAuditContext,
    );
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 14, // expected 12 → 16.7% over, would satisfy RULE-IN-TOL-01 (>5%) if consulted
        IdempotencyKey: 'ire08-tol-null-profile-line',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const decideSpy = jest.spyOn(bundle.ruleGate, 'Decide');
    const discrepancy = await captureQuantityVariance(bundle, session.ReceiptId, line.Id);

    // profiles.FindById is never mocked to resolve for this plan, so the fallback threshold defaults
    // to 0% — WithinTolerance would be wrong (16.7% > 0%); the pre-migration default-approval
    // fallback fires instead, exactly as it would have before the rule engine existed.
    expect(discrepancy.ToleranceDecision).toBe(InboundDiscrepancyToleranceDecision.OverTolerancePendingApproval);
    expect(decideSpy).not.toHaveBeenCalled();
  });
});

describe('IRE-03 rule-driven QC trigger (real RuleResolver + seeded WT-01, Partner.RiskLevel)', () => {
  const highRiskSupplier = () => Object.assign(supplier(), { RiskLevel: PartnerRiskLevel.High });

  const mediumRiskSupplier = () => Object.assign(supplier(), { RiskLevel: PartnerRiskLevel.Medium });

  const lowRiskSupplier = () => Object.assign(supplier(), { RiskLevel: PartnerRiskLevel.Low });

  const startAndConfirmLine = async (bundle: ReturnType<typeof repoBundle>) => {
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'ire03-line-1',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    return { session, line };
  };

  it('supplier-risk: seeded RULE-QC-TRIG-01 (supplierRisk=high) drives QC required even when profile/SKU do not', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.partners.FindById.mockResolvedValue(highRiskSupplier());
    bundle.profiles.FindById.mockResolvedValue(profile({})); // no inboundQcRequired/qcSamplePercent
    const { session, line } = await startAndConfirmLine(bundle);

    const task = await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire03-qc-1' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    expect(task.Required).toBe(true);
    expect(task.TriggerReason).toBe('WarehouseProfile');
    expect(task.TaskStatus).toBe(QcTaskStatus.PendingQc);
    expect(task.TriggerPolicyJson?.RuleCode).toBe('RULE-QC-TRIG-01');
    expect(bundle.partners.FindById).toHaveBeenCalledWith('supplier-1');
  });

  it('supplier lookup miss: FindById resolves null, QC evaluates without throwing and the rule does not trigger', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.profiles.FindById.mockResolvedValue(profile({})); // no policy trigger either
    // Default FindById (supplier()) satisfies plan-creation's active-supplier check; the supplier
    // is only "missing" once QC evaluation re-looks it up (e.g. deleted between plan and QC).
    const { session, line } = await startAndConfirmLine(bundle);
    bundle.partners.FindById.mockResolvedValue(null);

    const task = await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire03-qc-5' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    expect(task.Required).toBe(false);
    expect(task.TriggerReason).toBe('NotRequired');
  });

  it('backward-compat: empty decision (default gate) falls back to previous profile key-check unchanged', async () => {
    const bundle = repoBundle(); // default empty gate
    bundle.partners.FindById.mockResolvedValue(lowRiskSupplier());
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundQcRequired: true }));
    const { session, line } = await startAndConfirmLine(bundle);

    const task = await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire03-qc-2' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    expect(task.Required).toBe(true);
    expect(task.TriggerReason).toBe('WarehouseProfile');
    expect(task.TriggerPolicyJson?.RuleRequiresQc).toBe(false);
  });

  it('OR-combine: rule does not match (low risk) but ForceRequired still triggers QC (3 unchanged trigger sources preserved)', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.partners.FindById.mockResolvedValue(lowRiskSupplier());
    bundle.profiles.FindById.mockResolvedValue(profile({})); // no policy trigger either
    const { session, line } = await startAndConfirmLine(bundle);

    const task = await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire03-qc-3', ForceRequired: true },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    expect(task.Required).toBe(true);
    expect(task.TriggerReason).toBe('Forced');
  });

  it('OR-combine: rule match (high risk) does not clobber a simultaneously-true ForceRequired trigger', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.partners.FindById.mockResolvedValue(highRiskSupplier());
    bundle.profiles.FindById.mockResolvedValue(profile({})); // no policy trigger
    const { session, line } = await startAndConfirmLine(bundle);

    const task = await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire03-qc-4', ForceRequired: true },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    expect(task.Required).toBe(true);
    expect(task.TriggerReason).toBe('Forced');
    expect(task.TriggerPolicyJson?.RuleRequiresQc).toBe(true);
  });

  it('IRE-08 null-profile skip: a plan with no WarehouseProfileId never calls the rule gate for QC trigger and falls back to SKU/discrepancy signals unchanged', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.partners.FindById.mockResolvedValue(highRiskSupplier()); // would satisfy RULE-QC-TRIG-01 if consulted
    const created = await createUseCase(bundle).Execute(
      { ...createRequest(), WarehouseProfileId: undefined },
      SystemAuditContext,
    );
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'ire08-qc-null-profile-line',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const decideSpy = jest.spyOn(bundle.ruleGate, 'Decide');
    const task = await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire08-qc-null-profile' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    expect(task.Required).toBe(false);
    expect(task.TriggerReason).toBe('NotRequired');
    expect(decideSpy).not.toHaveBeenCalled();
  });

  it('IRE-10 rule-driven sampling: seeded RULE-QC-SAMPLE-01 (supplierRisk=medium) sets samplePercent=20, persists SamplingPercent and triggers QC', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.partners.FindById.mockResolvedValue(mediumRiskSupplier());
    bundle.profiles.FindById.mockResolvedValue(profile({})); // no ThresholdPolicy.qcSamplePercent fallback
    const { session, line } = await startAndConfirmLine(bundle);

    const task = await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire10-qc-sample-1' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    expect(task.Required).toBe(true);
    expect(task.TriggerReason).toBe('SamplingPolicy');
    expect(task.TriggerPolicyJson?.RuleCode).toBe('RULE-QC-SAMPLE-01');
    expect(task.SamplingPercent).toBe(20);
  });

  it('IRE-10 backward-compat: no rule match falls back to ThresholdPolicy.qcSamplePercent unchanged, and the fallback percent is persisted (previously discarded)', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.partners.FindById.mockResolvedValue(lowRiskSupplier()); // matches no seeded QC rule
    bundle.profiles.FindById.mockResolvedValue(profile({}, { qcSamplePercent: 15 }));
    const { session, line } = await startAndConfirmLine(bundle);

    const task = await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire10-qc-sample-2' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    expect(task.Required).toBe(true);
    expect(task.TriggerReason).toBe('SamplingPolicy');
    expect(task.TriggerPolicyJson?.RuleCode).toBeNull();
    expect(task.SamplingPercent).toBe(15);
  });

  it('IRE-10 regression: RULE-QC-TRIG-01 (supplierRisk=high, REQUIRE_APPROVAL) has no samplingPercent Param, so SamplingPercent stays null unaffected by the new ActionParams field', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.partners.FindById.mockResolvedValue(highRiskSupplier());
    bundle.profiles.FindById.mockResolvedValue(profile({})); // no ThresholdPolicy.qcSamplePercent fallback
    const { session, line } = await startAndConfirmLine(bundle);

    const task = await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire10-qc-sample-3' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    expect(task.Required).toBe(true);
    expect(task.TriggerPolicyJson?.RuleCode).toBe('RULE-QC-TRIG-01');
    expect(task.SamplingPercent).toBeNull();
  });

  it('IRE-10 double-fallback: no rule matches AND no ThresholdPolicy.qcSamplePercent set → SamplingPercent stays null (not just Required=false)', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.partners.FindById.mockResolvedValue(lowRiskSupplier()); // matches no seeded QC rule
    bundle.profiles.FindById.mockResolvedValue(profile({})); // no ThresholdPolicy.qcSamplePercent either
    const { session, line } = await startAndConfirmLine(bundle);

    const task = await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire10-qc-sample-4' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    expect(task.Required).toBe(false);
    expect(task.SamplingPercent).toBeNull();
  });
});

describe('IRE-04 rule-driven LPN required (real RuleResolver + seeded WT-01)', () => {
  const startAndConfirmLineForRelease = async (bundle: ReturnType<typeof repoBundle>, idempotencyKey: string) => {
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: `${idempotencyKey}-line`,
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: `${idempotencyKey}-qc` },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    return { session, line };
  };

  it('rule-driven: blocks release when profile.StrategyPolicy.lpnControlled=true (new key) even though legacy inboundLpnRequired/lpnRequired are unset', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.profiles.FindById.mockResolvedValue(profile({ lpnControlled: true }));
    const { session, line } = await startAndConfirmLineForRelease(bundle, 'ire04-lpn-rule');

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire04-lpn-rule-release' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      AfterJson: expect.objectContaining({ RequiredBy: 'Rule' }),
    });
  });

  it('rule-driven: an ApprovalRequired (not just Blocked) decision also drives ruleLpnRequired', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = approvalRequiredInboundRuleGate();
    bundle.profiles.FindById.mockResolvedValue(profile({}));
    const { session, line } = await startAndConfirmLineForRelease(bundle, 'ire04-lpn-approval');

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire04-lpn-approval-release' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      AfterJson: expect.objectContaining({ RequiredBy: 'Rule' }),
    });
  });

  it('backward-compat: rule does not match (lpnControlled unset) but legacy inboundLpnRequired still blocks via fallback, even with a seeded rule gate', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.profiles.FindById.mockResolvedValue(profile({ inboundLpnRequired: true }));
    const { session, line } = await startAndConfirmLineForRelease(bundle, 'ire04-lpn-fallback');

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire04-lpn-fallback-release' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      AfterJson: expect.objectContaining({ RequiredBy: 'WarehouseProfile' }),
    });
  });

  it('null-profile skip: a plan with no WarehouseProfileId never calls the rule gate for LPN and is never blocked', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    const created = await createUseCase(bundle).Execute(
      { ...createRequest(), WarehouseProfileId: null },
      SystemAuditContext,
    );
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: 'ire04-lpn-null-profile-line',
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire04-lpn-null-profile-qc' },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

    // Spy installed only around the release call — evaluateQcTaskUseCase above legitimately calls
    // Decide() on this same shared bundle.ruleGate for its own supplierRisk check.
    const decideSpy = jest.spyOn(bundle.ruleGate, 'Decide');
    const release = await releaseInboundToPutawayUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire04-lpn-null-profile-release' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(release.InventoryStatusCode).toBe('READY_FOR_PUTAWAY');
    expect(decideSpy).not.toHaveBeenCalled();
  });

  it('IRE-07: ruleGate.Decide() is called with SkuId — a future SKU-scoped RULE-LPN-REQ-01 variant would be able to match', async () => {
    const bundle = repoBundle();
    bundle.ruleGate = await seededInboundRuleGate();
    bundle.profiles.FindById.mockResolvedValue(profile({ lpnControlled: true }));
    const { session, line } = await startAndConfirmLineForRelease(bundle, 'ire07-lpn-skuid');

    const decideSpy = jest.spyOn(bundle.ruleGate, 'Decide');
    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire07-lpn-skuid-release' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);

    expect(decideSpy).toHaveBeenCalledWith(expect.objectContaining({ SkuId: 'sku-1' }));
  });

  it('IRE-09: RuleCode is persisted on the release record for a matched rule even when it is non-blocking (Matched does not require Blocked/ApprovalRequired)', async () => {
    // RULE-LPN-REQ-01 (the baseline seed rule) requires hasLpn=false to fire, so it can never match on
    // a successful (LPN-present) release — a custom AutoSuggestion rule proves RuleCode is captured
    // from any winning rule, not just a blocking one (same pattern as IRE-07's SKU-scoped test rule).
    const groups = new InMemoryRuleGroupRepository();
    await SeedRuleGroupCatalog(groups);
    const rInboundGroup = await groups.FindByCode('R-INBOUND');
    const definitions = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();
    const profiles = new InMemoryWarehouseProfileRepository();
    const lpnScopedProfile = new WarehouseProfileEntity({
      Id: 'wp-demo-ire09-lpn',
      ProfileCode: InboundBaselineProfileCode,
      ProfileName: 'Demo WT-01 (IRE-09 LPN RuleCode test)',
      WarehouseTypeCode: InboundBaselineWarehouseTypeCode,
      WarehouseId: 'warehouse-1',
      OwnerId: 'owner-1',
      Version: 1,
      Status: WarehouseProfileStatus.Active,
      ScopeKey: 'warehouse-1:owner-1',
      EffectiveFrom: new Date('2020-01-01T00:00:00.000Z'),
      CreatedAt: now,
      UpdatedAt: now,
    });
    await profiles.Create(lpnScopedProfile);
    const nonBlockingLpnRule = new RuleDefinitionEntity({
      Id: randomUUID(),
      RuleCode: 'RULE-IN-LPN-SUGGEST-TEST',
      RuleName: 'Non-blocking LPN suggestion test rule (IRE-09)',
      RuleGroupId: rInboundGroup!.Id,
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.AutoSuggestion,
      WarehouseTypeCode: InboundBaselineWarehouseTypeCode,
      ScopeKey: 'warehouse-1:owner-1',
      ConditionJson: { Operator: 'ALL', Predicates: [{ Field: 'hasLpn', Comparator: 'EQ', Value: true }] },
      ActionJson: { Type: 'SUGGEST', Params: { Message: 'IRE-09 non-blocking LPN test rule' } },
      Status: RuleStatus.Active,
      EffectiveFrom: new Date('2020-01-01T00:00:00.000Z'),
      CreatedAt: now,
      UpdatedAt: now,
    });
    await definitions.Create(nonBlockingLpnRule);
    await bindings.Create(
      new WarehouseProfileRuleEntity({
        Id: randomUUID(),
        WarehouseProfileId: lpnScopedProfile.Id,
        RuleDefinitionId: nonBlockingLpnRule.Id,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );
    const warehouses = new InMemoryWarehouseRepository();
    warehouses.Seed(warehouse());
    const resolver = new RuleResolver(profiles, definitions, bindings, groups, new ConditionEvaluator());
    const ruleGate = new InboundRuleGate(resolver, warehouses);

    const bundle = repoBundle();
    bundle.ruleGate = ruleGate;
    bundle.profiles.FindById.mockResolvedValue(profile({}));
    const { session, line } = await startAndConfirmLineForRelease(bundle, 'ire09-lpn-suggest-rulecode');
    await confirmInboundLpnUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        ReceiptLineId: line.Id,
        LpnCode: 'LPN-IRE09',
        IdempotencyKey: 'ire09-lpn-suggest-rulecode-lpn',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const release = await releaseInboundToPutawayUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ire09-lpn-suggest-rulecode-release' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(release.RuleCode).toBe('RULE-IN-LPN-SUGGEST-TEST');
  });
});

class MemoryPutawayTaskRepository implements IPutawayTaskRepository {
  public tasks: PutawayTaskEntity[] = [];

  public async Create(task: PutawayTaskEntity): Promise<PutawayTaskEntity> {
    this.tasks.push(task);
    return task;
  }

  public async FindById(id: string): Promise<PutawayTaskEntity | null> {
    return this.tasks.find((task) => task.Id === id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<PutawayTaskEntity | null> {
    return this.FindById(id);
  }

  public async FindByInboundPutawayReleaseId(inboundPutawayReleaseId: string): Promise<PutawayTaskEntity | null> {
    return this.tasks.find((task) => task.InboundPutawayReleaseId === inboundPutawayReleaseId) ?? null;
  }

  public async FindByIdempotencyKey(
    inboundPutawayReleaseId: string,
    idempotencyKey: string,
  ): Promise<PutawayTaskEntity | null> {
    return (
      this.tasks.find(
        (task) => task.InboundPutawayReleaseId === inboundPutawayReleaseId && task.IdempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  public async Save(task: PutawayTaskEntity): Promise<PutawayTaskEntity> {
    const index = this.tasks.findIndex((item) => item.Id === task.Id);
    if (index >= 0) this.tasks[index] = task;
    else this.tasks.push(task);
    return task;
  }

  public async List(
    skip: number,
    take: number,
    filter: Parameters<IPutawayTaskRepository['List']>[2] = {},
  ): Promise<{ Items: PutawayTaskEntity[]; TotalItems: number }> {
    let items = this.tasks;
    if (filter?.WarehouseId) items = items.filter((task) => task.WarehouseId === filter.WarehouseId);
    return { Items: items.slice(skip, skip + take), TotalItems: items.length };
  }
}

class MemoryInventoryTransactionRepository implements IInventoryTransactionRepository {
  public transactions: InventoryTransactionEntity[] = [];
  public movements: InventoryMovementEntity[] = [];

  public async CreateTransaction(transaction: InventoryTransactionEntity): Promise<InventoryTransactionEntity> {
    this.transactions.push(transaction);
    return transaction;
  }

  public async CreateMovement(movement: InventoryMovementEntity): Promise<InventoryMovementEntity> {
    this.movements.push(movement);
    return movement;
  }

  public async SaveTransaction(transaction: InventoryTransactionEntity): Promise<InventoryTransactionEntity> {
    const index = this.transactions.findIndex((item) => item.Id === transaction.Id);
    if (index >= 0) this.transactions[index] = transaction;
    else this.transactions.push(transaction);
    return transaction;
  }

  public async FindTransactionByIdempotencyKey(
    putawayTaskId: string,
    idempotencyKey: string,
  ): Promise<InventoryTransactionEntity | null> {
    return (
      this.transactions.find(
        (transaction) => transaction.PutawayTaskId === putawayTaskId && transaction.IdempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  public async FindTransactionByTypeAndIdempotencyKey(): Promise<InventoryTransactionEntity | null> {
    return null;
  }

  public async FindMovementByTransactionId(transactionId: string): Promise<InventoryMovementEntity | null> {
    return this.movements.find((movement) => movement.InventoryTransactionId === transactionId) ?? null;
  }
}

class FakeTaskExecutionRepository implements ITaskExecutionRepository {
  public tasks = new Map<string, MobileTaskEntity>();

  public async FindCandidates(): Promise<MobileTaskEntity[]> {
    return [...this.tasks.values()];
  }

  public async FindById(id: string): Promise<MobileTaskEntity | null> {
    return this.tasks.get(id) ?? null;
  }

  public async FindByIdForUpdate(id: string): Promise<MobileTaskEntity | null> {
    return this.FindById(id);
  }

  public async FindBySourceDocument(): Promise<MobileTaskEntity | null> {
    return null;
  }

  public async FindScanEventsByTaskId(): Promise<never[]> {
    return [];
  }

  public async Save(task: MobileTaskEntity): Promise<MobileTaskEntity> {
    this.tasks.set(task.Id, task);
    return task;
  }

  public async SaveScanEvent<T>(scan: T): Promise<T> {
    return scan;
  }

  public async RunInTransaction<T>(work: (manager: never) => Promise<T>): Promise<T> {
    return work(undefined as never);
  }
}

describe('IFB-17 release-to-putaway creates the READY_FOR_PUTAWAY dimension/balance', () => {
  const startAndConfirmLineForRelease = async (bundle: ReturnType<typeof repoBundle>, idempotencyKey: string) => {
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const line = await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        ActualQuantity: 12,
        IdempotencyKey: `${idempotencyKey}-line`,
        ScanEvidence: { RawValue: 'barcode-1', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: `${idempotencyKey}-qc` },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );
    return { session, line };
  };

  it('creates exactly one READY_FOR_PUTAWAY dimension and balance with QtyOnHand equal to the released quantity', async () => {
    const bundle = repoBundle();
    const { session, line } = await startAndConfirmLineForRelease(bundle, 'ifb17-create');

    await releaseInboundToPutawayUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ifb17-create-release' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(bundle.inventoryDimensions.dimensions.size).toBe(1);
    const dimension = [...bundle.inventoryDimensions.dimensions.values()][0];
    expect(dimension.InventoryStatusId).toBe('status-ready-for-putaway');
    expect(dimension.SkuId).toBe('sku-1');
    expect(bundle.inventoryBalances.balances.size).toBe(1);
    const balance = [...bundle.inventoryBalances.balances.values()][0];
    expect(balance.DimensionId).toBe(dimension.Id);
    expect(balance.QtyOnHand).toBe(12);
  });

  it('does not create a second dimension/balance or double the quantity on an idempotent retry', async () => {
    const bundle = repoBundle();
    const { session, line } = await startAndConfirmLineForRelease(bundle, 'ifb17-retry');

    const request = { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ifb17-retry-release' };
    const context = { ...SystemAuditContext, ActorUserId: 'user-1' };
    const first = await releaseInboundToPutawayUseCase(bundle).Execute(request, context);
    const second = await releaseInboundToPutawayUseCase(bundle).Execute(request, context);

    expect(second.Id).toBe(first.Id);
    expect(bundle.inventoryDimensions.dimensions.size).toBe(1);
    expect(bundle.inventoryBalances.balances.size).toBe(1);
    const balance = [...bundle.inventoryBalances.balances.values()][0];
    expect(balance.QtyOnHand).toBe(12);
  });

  it('accumulates onto the same balance (does not overwrite) when two different releases hash to the same dimension', async () => {
    const bundle = repoBundle();
    // Two separate receipt lines for the same SKU/warehouse/location/UOM, neither carrying a
    // Lot/Serial -- both resolve to the identical dimension key, so their releases (each its
    // own IdempotencyKey) must ADD onto the one shared balance instead of replacing it.
    const { session: session1, line: line1 } = await startAndConfirmLineForRelease(bundle, 'ifb17-accum-a');
    const { line: line2 } = await startAndConfirmLineForRelease(bundle, 'ifb17-accum-b');

    await releaseInboundToPutawayUseCase(bundle).Execute(
      { ReceiptId: session1.ReceiptId, ReceiptLineId: line1.Id, IdempotencyKey: 'ifb17-accum-release-a' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    await releaseInboundToPutawayUseCase(bundle).Execute(
      { ReceiptId: session1.ReceiptId, ReceiptLineId: line2.Id, IdempotencyKey: 'ifb17-accum-release-b' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(bundle.inventoryDimensions.dimensions.size).toBe(1);
    expect(bundle.inventoryBalances.balances.size).toBe(1);
    const balance = [...bundle.inventoryBalances.balances.values()][0];
    expect(balance.QtyOnHand).toBe(24);
  });

  it('lets a putaway task confirm successfully end to end without any dimension pre-seeded by the test (release -> putaway release -> confirm)', async () => {
    const bundle = repoBundle();
    const { session, line } = await startAndConfirmLineForRelease(bundle, 'ifb17-e2e');

    const release = await releaseInboundToPutawayUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line.Id, IdempotencyKey: 'ifb17-e2e-release' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    // Confirmed by the previous 2 tests: exactly this dimension/balance now exists, created by
    // ReleaseInboundToPutawayUseCase itself -- nothing here manually seeds it (the whole point of
    // IFB-17: before the fix, this next step always failed with "Source inventory dimension not
    // found for putaway confirmation" on a genuinely fresh SKU/location).
    const putawayTasks = new MemoryPutawayTaskRepository();
    const locationProfile = new LocationProfileEntity({
      Id: 'profile-dock-1',
      ProfileCode: 'STORAGE',
      ProfileName: 'Storage',
      LocationType: 'Storage',
      Status: MasterDataStatus.Active,
      CreatedAt: now,
      UpdatedAt: now,
    });
    const targetLocation = new LocationEntity({
      Id: 'location-target-1',
      WarehouseId: 'warehouse-1',
      ZoneId: 'zone-target-1',
      LocationCode: 'A-01',
      LocationName: 'Aisle A-01',
      LocationType: 'Storage',
      LocationProfileId: 'profile-dock-1',
      LocationStatus: LocationStatus.Active,
      CapacityQty: 100,
      CreatedAt: now,
      UpdatedAt: now,
    });
    const putawayLocations = {
      FindByWarehouseAndCode: bundle.locations.FindByWarehouseAndCode,
      FindById: jest.fn(async (id: string) => (id === targetLocation.Id ? targetLocation : null)),
      List: jest.fn(async () => ({ Items: [targetLocation], TotalItems: 1 })),
    };
    const locationProfiles = { FindById: jest.fn(async () => locationProfile) };
    const taskExecution = new FakeTaskExecutionRepository();
    const inventoryTransactions = new MemoryInventoryTransactionRepository();

    const releasePutawayTaskUseCase = new ReleasePutawayTaskUseCase(
      putawayTasks,
      bundle.receiving as unknown as IReceivingRepository,
      putawayLocations as unknown as ILocationRepository,
      bundle.skus as unknown as ISkuRepository,
      locationProfiles as unknown as ILocationProfileRepository,
      BuildEmptyPutawayRuleGate('warehouse-1'),
      bundle.integrations as unknown as IIntegrationRepository,
      taskExecution,
      bundle.reasonCatalog,
      bundle.audited as unknown as AuditedTransaction,
      bundle.permissionChecker,
    );

    const releasedTaskDto = await releasePutawayTaskUseCase.Execute(
      {
        InboundPutawayReleaseId: release.Id,
        TargetLocationId: targetLocation.Id,
        IdempotencyKey: 'ifb17-e2e-putaway-release',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const confirmPutawayTaskUseCase = new ConfirmPutawayTaskUseCase(
      putawayTasks,
      inventoryTransactions,
      bundle.inventoryStatuses,
      bundle.inventoryDimensions,
      bundle.inventoryBalances,
      bundle.integrations as unknown as IIntegrationRepository,
      taskExecution,
      bundle.dimensionKeyService,
      bundle.reasonCatalog,
      bundle.audited as unknown as AuditedTransaction,
      bundle.permissionChecker,
    );

    const result = await confirmPutawayTaskUseCase.Execute(
      releasedTaskDto.Id,
      {
        SourceLocationScan: releasedTaskDto.SourceLocationCode as string,
        TargetLocationScan: releasedTaskDto.TargetLocationCode,
        IdempotencyKey: 'ifb17-e2e-confirm',
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(result.PutawayTask.TaskStatus).toBe(PutawayTaskStatus.Confirmed);
    expect(result.SourceBalance.QtyOnHand).toBe(0);
    expect(result.TargetBalance.QtyOnHand).toBe(12);
  });
});

describe('IFB-21 release blocked for SerialControlled plan line until fully received', () => {
  const confirmSerialUnit = async (
    bundle: ReturnType<typeof repoBundle>,
    receiptId: string,
    planLineId: string,
    serialNumber: string,
    idempotencyKey: string,
  ) =>
    confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: receiptId,
        InboundPlanLineId: planLineId,
        ActualQuantity: 1,
        SerialNumber: serialNumber,
        IdempotencyKey: idempotencyKey,
        ScanEvidence: { RawValue: `barcode-${idempotencyKey}`, ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

  const evaluateQcForLine = async (
    bundle: ReturnType<typeof repoBundle>,
    receiptId: string,
    lineId: string,
    idempotencyKey: string,
  ) =>
    evaluateQcTaskUseCase(bundle).Execute(
      { ReceiptId: receiptId, ReceiptLineId: lineId, IdempotencyKey: idempotencyKey },
      { ...SystemAuditContext, ActorUserId: 'qc-1' },
    );

  it('blocks release when only 1 of 3 expected units has been received for a SerialControlled SKU', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(
      {
        ...createRequest(),
        Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 3, ExternalLineReference: '10' }],
      },
      SystemAuditContext,
    );
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const line1 = await confirmSerialUnit(
      bundle,
      session.ReceiptId,
      created.Lines[0].Id,
      'SN-IFB21-1',
      'ifb21-block-unit-1',
    );
    await evaluateQcForLine(bundle, session.ReceiptId, line1.Id, 'ifb21-block-qc-1');

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        { ReceiptId: session.ReceiptId, ReceiptLineId: line1.Id, IdempotencyKey: 'ifb21-block-release-1' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('allows release for each unit once all 3 expected units of a SerialControlled SKU have been received', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(
      {
        ...createRequest(),
        Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 3, ExternalLineReference: '10' }],
      },
      SystemAuditContext,
    );
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const line1 = await confirmSerialUnit(
      bundle,
      session.ReceiptId,
      created.Lines[0].Id,
      'SN-IFB21-FULL-1',
      'ifb21-full-unit-1',
    );
    const line2 = await confirmSerialUnit(
      bundle,
      session.ReceiptId,
      created.Lines[0].Id,
      'SN-IFB21-FULL-2',
      'ifb21-full-unit-2',
    );
    const line3 = await confirmSerialUnit(
      bundle,
      session.ReceiptId,
      created.Lines[0].Id,
      'SN-IFB21-FULL-3',
      'ifb21-full-unit-3',
    );
    await evaluateQcForLine(bundle, session.ReceiptId, line1.Id, 'ifb21-full-qc-1');
    await evaluateQcForLine(bundle, session.ReceiptId, line2.Id, 'ifb21-full-qc-2');
    await evaluateQcForLine(bundle, session.ReceiptId, line3.Id, 'ifb21-full-qc-3');

    const release1 = await releaseInboundToPutawayUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line1.Id, IdempotencyKey: 'ifb21-full-release-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const release2 = await releaseInboundToPutawayUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line2.Id, IdempotencyKey: 'ifb21-full-release-2' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );
    const release3 = await releaseInboundToPutawayUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line3.Id, IdempotencyKey: 'ifb21-full-release-3' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(release1.InventoryStatusCode).toBe('READY_FOR_PUTAWAY');
    expect(release2.InventoryStatusCode).toBe('READY_FOR_PUTAWAY');
    expect(release3.InventoryStatusCode).toBe('READY_FOR_PUTAWAY');
  });

  it("review fix: a substituted-SKU receipt line does not count toward the correct SKU's cumulative quantity for release", async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(
      {
        ...createRequest(),
        Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 2, ExternalLineReference: '10' }],
      },
      SystemAuditContext,
    );
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    // Unit 1: scanned as a DIFFERENT (substituted) SKU on the same plan line -- must not count
    // toward sku-1's cumulative received quantity. Without the SkuId filter, this unit plus the
    // one correct-SKU unit below would wrongly sum to 2 (== ExpectedQuantity), incorrectly
    // allowing release when only 1 of 2 expected sku-1 units has actually been received.
    await confirmReceiptLineUseCase(bundle).Execute(
      {
        ReceiptId: session.ReceiptId,
        InboundPlanLineId: created.Lines[0].Id,
        SkuId: 'sku-2',
        ActualQuantity: 1,
        SerialNumber: 'SN-IFB21-SUBSTITUTE',
        IdempotencyKey: 'ifb21-sku-scope-substitute-unit',
        ScanEvidence: { RawValue: 'barcode-substitute', ScanResult: 'Accepted' },
      },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const correctLine = await confirmSerialUnit(
      bundle,
      session.ReceiptId,
      created.Lines[0].Id,
      'SN-IFB21-SKU-SCOPE-CORRECT',
      'ifb21-sku-scope-correct-unit',
    );
    await evaluateQcForLine(bundle, session.ReceiptId, correctLine.Id, 'ifb21-sku-scope-qc');

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        { ReceiptId: session.ReceiptId, ReceiptLineId: correctLine.Id, IdempotencyKey: 'ifb21-sku-scope-release' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('blocks release when 2 of 3 expected units have been received for a SerialControlled SKU', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(
      {
        ...createRequest(),
        Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 3, ExternalLineReference: '10' }],
      },
      SystemAuditContext,
    );
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const line1 = await confirmSerialUnit(
      bundle,
      session.ReceiptId,
      created.Lines[0].Id,
      'SN-IFB21-2OF3-1',
      'ifb21-2of3-unit-1',
    );
    const line2 = await confirmSerialUnit(
      bundle,
      session.ReceiptId,
      created.Lines[0].Id,
      'SN-IFB21-2OF3-2',
      'ifb21-2of3-unit-2',
    );
    await evaluateQcForLine(bundle, session.ReceiptId, line1.Id, 'ifb21-2of3-qc-1');
    await evaluateQcForLine(bundle, session.ReceiptId, line2.Id, 'ifb21-2of3-qc-2');

    await expect(
      releaseInboundToPutawayUseCase(bundle).Execute(
        { ReceiptId: session.ReceiptId, ReceiptLineId: line2.Id, IdempotencyKey: 'ifb21-2of3-release' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      ),
    ).rejects.toThrow(BusinessRuleException);
  });

  it('includes the expected and cumulative quantity in both the thrown exception and the audit-blocked entry when release is blocked for an incomplete SerialControlled line', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(
      {
        ...createRequest(),
        Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 3, ExternalLineReference: '10' }],
      },
      SystemAuditContext,
    );
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const line1 = await confirmSerialUnit(
      bundle,
      session.ReceiptId,
      created.Lines[0].Id,
      'SN-IFB21-PAYLOAD-1',
      'ifb21-payload-unit-1',
    );
    await evaluateQcForLine(bundle, session.ReceiptId, line1.Id, 'ifb21-payload-qc-1');

    let caught: unknown;
    try {
      await releaseInboundToPutawayUseCase(bundle).Execute(
        { ReceiptId: session.ReceiptId, ReceiptLineId: line1.Id, IdempotencyKey: 'ifb21-payload-release' },
        { ...SystemAuditContext, ActorUserId: 'user-1' },
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BusinessRuleException);
    expect((caught as BusinessRuleException).Details).toMatchObject({
      ExpectedQuantity: 3,
      CumulativeActualQuantity: 1,
    });
    expect(bundle.audited.Entries[bundle.audited.Entries.length - 1]).toMatchObject({
      AfterJson: expect.objectContaining({
        Decision: 'Blocked',
        ReceiptLineId: line1.Id,
        ExpectedQuantity: 3,
        CumulativeActualQuantity: 1,
      }),
    });
  });

  it('allows release once cumulative received quantity exceeds ExpectedQuantity for a SerialControlled SKU (over-receipt)', async () => {
    const bundle = repoBundle();
    bundle.skus.FindById.mockResolvedValue(sku({ SerialControlled: true }));
    const created = await createUseCase(bundle).Execute(
      {
        ...createRequest(),
        Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 2, ExternalLineReference: '10' }],
      },
      SystemAuditContext,
    );
    const session = await startReceivingUseCase(bundle).Execute(
      { InboundPlanId: created.Id, SessionKey: 'dock-1:user-1' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    const line1 = await confirmSerialUnit(
      bundle,
      session.ReceiptId,
      created.Lines[0].Id,
      'SN-IFB21-OVER-1',
      'ifb21-over-unit-1',
    );
    const line2 = await confirmSerialUnit(
      bundle,
      session.ReceiptId,
      created.Lines[0].Id,
      'SN-IFB21-OVER-2',
      'ifb21-over-unit-2',
    );
    // Unit 3 pushes the running total to 3 (over-receipt against ExpectedQuantity=2), which trips
    // ConfirmReceiptLineUseCase's own QuantityVariance signal (IFB-20) and would force this unit's
    // own QC decision into a permanent PENDING_QC -- irrelevant to the release guard under test here,
    // so it is deliberately left un-QC'd/un-released. Unit 2 (received while cumulative was still
    // <= ExpectedQuantity) has no discrepancy signal and is the one released below, to isolate the
    // release guard's own cumulative-vs-expected comparison (3 > 2) from the unrelated QC gate.
    await confirmSerialUnit(bundle, session.ReceiptId, created.Lines[0].Id, 'SN-IFB21-OVER-3', 'ifb21-over-unit-3');
    await evaluateQcForLine(bundle, session.ReceiptId, line1.Id, 'ifb21-over-qc-1');
    await evaluateQcForLine(bundle, session.ReceiptId, line2.Id, 'ifb21-over-qc-2');

    const release2 = await releaseInboundToPutawayUseCase(bundle).Execute(
      { ReceiptId: session.ReceiptId, ReceiptLineId: line2.Id, IdempotencyKey: 'ifb21-over-release-2' },
      { ...SystemAuditContext, ActorUserId: 'user-1' },
    );

    expect(release2.InventoryStatusCode).toBe('READY_FOR_PUTAWAY');
  });
});
