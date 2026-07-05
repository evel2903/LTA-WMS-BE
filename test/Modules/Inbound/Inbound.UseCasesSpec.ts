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
import { CaptureInboundDiscrepancyUseCase } from '@modules/Inbound/Application/UseCases/CaptureInboundDiscrepancyUseCase';
import { ConfirmReceiptLineUseCase } from '@modules/Inbound/Application/UseCases/ConfirmReceiptLineUseCase';
import { CreateInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/CreateInboundPlanUseCase';
import { GetInboundOperationalStateUseCase } from '@modules/Inbound/Application/UseCases/GetInboundOperationalStateUseCase';
import { GetInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/GetInboundPlanUseCase';
import { ListInboundPlansUseCase } from '@modules/Inbound/Application/UseCases/ListInboundPlansUseCase';
import { RecordGateInUseCase } from '@modules/Inbound/Application/UseCases/RecordGateInUseCase';
import { EvaluateQcTaskUseCase } from '@modules/Inbound/Application/UseCases/EvaluateQcTaskUseCase';
import { ConfirmInboundLpnUseCase } from '@modules/Inbound/Application/UseCases/ConfirmInboundLpnUseCase';
import { ReleaseInboundToPutawayUseCase } from '@modules/Inbound/Application/UseCases/ReleaseInboundToPutawayUseCase';
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
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { PartnerEntity } from '@modules/PartnerMaster/Domain/Entities/PartnerEntity';
import { PartnerRiskLevel } from '@modules/PartnerMaster/Domain/Enums/PartnerRiskLevel';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
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

  public async FindById(id: string): Promise<{ Plan: InboundPlanEntity; Lines: InboundPlanLineEntity[] } | null> {
    const plan = this.Plans.find((item) => item.Id === id);
    if (!plan) return null;
    return { Plan: plan, Lines: this.Lines.filter((line) => line.InboundPlanId === id) };
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

const sku = () =>
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
  const skus = { FindById: jest.fn(async () => sku()) };
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
    uoms,
    coreFlows,
    integrations,
    profiles,
    ruleGate: emptyInboundRuleGate() as InboundRuleGate,
    reasonCatalog,
    controlExceptionCatalog,
    labelBlocking,
    permissionChecker,
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
    bundle.coreFlows as unknown as ICoreFlowRepository,
    bundle.integrations as unknown as IIntegrationRepository,
    bundle.profiles as unknown as IWarehouseProfileRepository,
    bundle.audited as unknown as AuditedTransaction,
  );

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
  it('creates inbound plan, lines, CoreFlow trace and InboundPlanReceived outbox event', async () => {
    const bundle = repoBundle();
    const result = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

    expect(result.Status).toBe(InboundPlanDocumentStatus.Planned);
    expect(result.GateInStatus).toBe(InboundGateInStatus.NotRecorded);
    expect(result.Lines).toHaveLength(1);
    expect(result.IsDuplicate).toBe(false);
    expect(bundle.inbound.CreateCalls).toBe(1);
    expect(bundle.coreFlows.CreateInstance).toHaveBeenCalledWith(
      expect.objectContaining({ CurrentStage: CoreFlowStageCode.Inbound }),
    );
    expect(bundle.integrations.CreateOutboxMessage).toHaveBeenCalledWith(
      expect.objectContaining({ EventType: 'InboundPlanReceived', Status: OutboxMessageStatus.Pending }),
      undefined,
    );
    expect(bundle.audited.Entries).toHaveLength(1);
    expect(bundle.audited.Entries[0]).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.InboundPlan,
      WarehouseId: 'warehouse-1',
      OwnerId: 'owner-1',
    });
  });

  it('dedupes duplicate source document by business key without double CoreFlow or outbox effect', async () => {
    const bundle = repoBundle();
    const useCase = createUseCase(bundle);

    await useCase.Execute(createRequest(), SystemAuditContext);
    const duplicate = await useCase.Execute(createRequest(), SystemAuditContext);

    expect(duplicate.IsDuplicate).toBe(true);
    expect(bundle.inbound.CreateCalls).toBe(1);
    expect(bundle.coreFlows.Instances).toHaveLength(1);
    expect(bundle.integrations.Outbox).toHaveLength(1);
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
    expect(bundle.coreFlows.Instances).toHaveLength(1);
    expect(bundle.integrations.Outbox).toHaveLength(1);
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

  it('records gate-in milestone on plan and CoreFlow', async () => {
    const bundle = repoBundle();
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);

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
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
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
    const created = await createUseCase(bundle).Execute(createRequest(), SystemAuditContext);
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
