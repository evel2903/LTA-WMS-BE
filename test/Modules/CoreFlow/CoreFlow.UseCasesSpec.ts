import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { StubAuditedTransaction } from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';
import { CreateCoreFlowInstanceUseCase } from '@modules/CoreFlow/Application/UseCases/CreateCoreFlowInstanceUseCase';
import { CreateWorkflowHandoffUseCase } from '@modules/CoreFlow/Application/UseCases/CreateWorkflowHandoffUseCase';
import { GetCoreFlowInstanceUseCase } from '@modules/CoreFlow/Application/UseCases/GetCoreFlowInstanceUseCase';
import { RecordWorkflowMilestoneUseCase } from '@modules/CoreFlow/Application/UseCases/RecordWorkflowMilestoneUseCase';
import { ResolveCoreFlowInstanceUseCase } from '@modules/CoreFlow/Application/UseCases/ResolveCoreFlowInstanceUseCase';
import { SkipCoreFlowStepUseCase } from '@modules/CoreFlow/Application/UseCases/SkipCoreFlowStepUseCase';
import {
  ICoreFlowRepository,
  WorkflowMilestoneListFilter,
} from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { CoreFlowInstanceEntity } from '@modules/CoreFlow/Domain/Entities/CoreFlowInstanceEntity';
import { WorkflowHandoffEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowHandoffEntity';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { CoreFlowInstanceStatus } from '@modules/CoreFlow/Domain/Enums/CoreFlowInstanceStatus';
import { WorkflowHandoffStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowHandoffStatus';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';

class FakeCoreFlowRepository implements ICoreFlowRepository {
  public readonly Instances = new Map<string, CoreFlowInstanceEntity>();
  public readonly Milestones: WorkflowMilestoneEntity[] = [];
  public readonly Handoffs: WorkflowHandoffEntity[] = [];

  public async CreateInstance(instance: CoreFlowInstanceEntity): Promise<CoreFlowInstanceEntity> {
    this.Instances.set(instance.Id, instance);
    return instance;
  }

  public async UpdateInstance(instance: CoreFlowInstanceEntity): Promise<CoreFlowInstanceEntity> {
    this.Instances.set(instance.Id, instance);
    return instance;
  }

  public async FindInstanceById(id: string): Promise<CoreFlowInstanceEntity | null> {
    return this.Instances.get(id) ?? null;
  }

  public async FindInstanceByBusinessReference(
    businessReference: string,
    warehouseCode?: string,
    ownerCode?: string,
  ): Promise<CoreFlowInstanceEntity | null> {
    return (
      [...this.Instances.values()].find(
        (instance) =>
          instance.BusinessReference === businessReference &&
          (!warehouseCode || instance.WarehouseCode === warehouseCode) &&
          (!ownerCode || instance.OwnerCode === ownerCode),
      ) ?? null
    );
  }

  public async CreateMilestone(milestone: WorkflowMilestoneEntity): Promise<WorkflowMilestoneEntity> {
    this.Milestones.push(milestone);
    return milestone;
  }

  public async ListMilestones(filter: WorkflowMilestoneListFilter): Promise<WorkflowMilestoneEntity[]> {
    return this.Milestones.filter(
      (milestone) =>
        milestone.CoreFlowInstanceId === filter.CoreFlowInstanceId &&
        (!filter.StageCode || milestone.StageCode === filter.StageCode) &&
        (!filter.StepCode || milestone.StepCode === filter.StepCode),
    );
  }

  public async CreateHandoff(handoff: WorkflowHandoffEntity): Promise<WorkflowHandoffEntity> {
    this.Handoffs.push(handoff);
    return handoff;
  }
}

const ctx: AuditContext = {
  ActorUserId: 'u1',
  ActorRoleCodes: ['WMS_ADMIN'],
  ActorType: ActorType.User,
  CorrelationId: 'corr-1',
  RequestId: 'req-1',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest',
};

const reasonCatalog = {
  ValidateReason: jest.fn().mockResolvedValue({
    ReasonCodeId: 'reason-1',
    EvidenceRequired: true,
    ApprovalRequired: false,
  }),
};

describe('CoreFlow use cases', () => {
  beforeEach(() => {
    reasonCatalog.ValidateReason.mockClear();
  });

  it('creates and resolves a CoreFlow instance by business reference and correlation', async () => {
    const repo = new FakeCoreFlowRepository();
    const audit = new StubAuditedTransaction();

    const created = await new CreateCoreFlowInstanceUseCase(repo, audit as unknown as AuditedTransaction).Execute(
      {
        BusinessReference: 'IB-2026-0001',
        SourceSystem: 'ERP',
        WarehouseCode: 'WT-01-A',
        OwnerCode: 'OWNER-A',
        CorrelationId: 'corr-core-1',
      },
      ctx,
    );

    expect(created.BusinessReference).toBe('IB-2026-0001');
    expect(created.CorrelationId).toBe('corr-core-1');
    expect(created.CurrentStage).toBe(CoreFlowStageCode.Inbound);
    expect(created.Status).toBe(CoreFlowInstanceStatus.Active);

    const resolved = await new ResolveCoreFlowInstanceUseCase(repo).Execute({
      BusinessReference: 'IB-2026-0001',
      WarehouseCode: 'WT-01-A',
      OwnerCode: 'OWNER-A',
    });
    expect(resolved.Id).toBe(created.Id);
    expect(audit.Entries[0]).toMatchObject({
      Action: ActionCode.Create,
      ObjectType: ObjectType.CoreFlow,
      ObjectCode: 'IB-2026-0001',
    });
  });

  it('throws not found for missing CoreFlow instance', async () => {
    await expect(
      new GetCoreFlowInstanceUseCase(new FakeCoreFlowRepository()).Execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('records a valid workflow milestone and rejects forbidden InventoryStatus milestone terms', async () => {
    const repo = new FakeCoreFlowRepository();
    const audit = new StubAuditedTransaction();
    const instance = await new CreateCoreFlowInstanceUseCase(repo).Execute({
      BusinessReference: 'IB-2026-0002',
      SourceSystem: 'ERP',
      WarehouseCode: 'WT-01-A',
      CorrelationId: 'corr-core-2',
    });

    await expect(
      new RecordWorkflowMilestoneUseCase(repo).Execute({
        CoreFlowInstanceId: instance.Id,
        StageCode: CoreFlowStageCode.Shipping,
        StepCode: CoreFlowStepCode.GateOutRecorded,
        MilestoneStatus: WorkflowMilestoneStatus.Completed,
        InventoryStatusCode: 'GATE_OUT',
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);

    const milestone = await new RecordWorkflowMilestoneUseCase(repo, audit as unknown as AuditedTransaction).Execute(
      {
        CoreFlowInstanceId: instance.Id,
        StageCode: CoreFlowStageCode.Inbound,
        StepCode: CoreFlowStepCode.InboundReleasedToPutaway,
        MilestoneStatus: WorkflowMilestoneStatus.Completed,
        InventoryStatusCode: 'READY_FOR_PUTAWAY',
        Metadata: { ReceiptId: 'receipt-1' },
      },
      ctx,
    );

    expect(milestone.MilestoneStatus).toBe(WorkflowMilestoneStatus.Completed);
    expect(milestone.InventoryStatusCode).toBe('READY_FOR_PUTAWAY');
    expect(audit.Entries[0]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.CoreFlow,
      ReferenceType: 'WorkflowMilestone',
      ReferenceId: milestone.Id,
    });
  });

  it('blocks next-stage handoff when the previous stage is incomplete and records audit', async () => {
    const repo = new FakeCoreFlowRepository();
    const audit = new StubAuditedTransaction();
    const instance = await new CreateCoreFlowInstanceUseCase(repo).Execute({
      BusinessReference: 'IB-2026-0003',
      SourceSystem: 'ERP',
      WarehouseCode: 'WT-01-A',
    });

    const handoff = await new CreateWorkflowHandoffUseCase(
      repo,
      audit as unknown as AuditedTransaction,
      reasonCatalog,
    ).Execute(
      {
        CoreFlowInstanceId: instance.Id,
        FromStage: CoreFlowStageCode.Inbound,
        ToStage: CoreFlowStageCode.Storage,
        ReasonCode: 'RC-V1-HANDOFF',
      },
      ctx,
    );

    expect(handoff.HandoffStatus).toBe(WorkflowHandoffStatus.Blocked);
    expect(handoff.BlockedReason).toContain('Inbound');
    expect((await repo.FindInstanceById(instance.Id))!.CurrentStage).toBe(CoreFlowStageCode.Inbound);
    expect(reasonCatalog.ValidateReason).toHaveBeenCalledWith({
      ReasonCode: 'RC-V1-HANDOFF',
      Action: ActionCode.Update,
      ObjectType: ObjectType.CoreFlow,
    });
    expect(audit.Entries[0]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.CoreFlow,
      ReasonCodeId: 'reason-1',
    });
  });

  it('uses Override audit and reason validation for forced handoff', async () => {
    const repo = new FakeCoreFlowRepository();
    const audit = new StubAuditedTransaction();
    const instance = await new CreateCoreFlowInstanceUseCase(repo).Execute({
      BusinessReference: 'IB-2026-0005',
      SourceSystem: 'ERP',
      WarehouseCode: 'WT-01-A',
    });

    const handoff = await new CreateWorkflowHandoffUseCase(
      repo,
      audit as unknown as AuditedTransaction,
      reasonCatalog,
    ).Execute(
      {
        CoreFlowInstanceId: instance.Id,
        FromStage: CoreFlowStageCode.Inbound,
        ToStage: CoreFlowStageCode.Storage,
        ReasonCode: 'RC-V1-HANDOFF',
        Force: true,
      },
      ctx,
    );

    expect(handoff.HandoffStatus).toBe(WorkflowHandoffStatus.Completed);
    expect((await repo.FindInstanceById(instance.Id))!.CurrentStage).toBe(CoreFlowStageCode.Storage);
    expect(reasonCatalog.ValidateReason).toHaveBeenCalledWith({
      ReasonCode: 'RC-V1-HANDOFF',
      Action: ActionCode.Override,
      ObjectType: ObjectType.CoreFlow,
    });
    expect(audit.Entries[0]).toMatchObject({
      Action: ActionCode.Override,
      ObjectType: ObjectType.CoreFlow,
      ReasonCodeId: 'reason-1',
    });
    expect(audit.Entries[0].BeforeJson).toMatchObject({
      CurrentStage: CoreFlowStageCode.Inbound,
    });
  });

  it('records skipped profile step with reason, audit and optional exception link', async () => {
    const repo = new FakeCoreFlowRepository();
    const audit = new StubAuditedTransaction();
    const instance = await new CreateCoreFlowInstanceUseCase(repo).Execute({
      BusinessReference: 'IB-2026-0004',
      SourceSystem: 'ERP',
      WarehouseCode: 'WT-01-A',
    });

    const skipped = await new SkipCoreFlowStepUseCase(
      repo,
      audit as unknown as AuditedTransaction,
      reasonCatalog,
    ).Execute(
      {
        CoreFlowInstanceId: instance.Id,
        StageCode: CoreFlowStageCode.Inbound,
        StepCode: CoreFlowStepCode.QcCompleted,
        ReasonCode: 'RC-V1-HANDOFF',
        ReasonNote: 'WT-01 profile does not require QC for this SKU',
        ExceptionCaseId: 'exception-1',
      },
      ctx,
    );

    expect(skipped.MilestoneStatus).toBe(WorkflowMilestoneStatus.Skipped);
    expect(skipped.ExceptionCaseId).toBe('exception-1');
    expect(skipped.ReasonCodeId).toBe('reason-1');
    expect(audit.Entries[0]).toMatchObject({
      Action: ActionCode.Update,
      ObjectType: ObjectType.CoreFlow,
      ReasonCodeId: 'reason-1',
      ReferenceType: 'WorkflowMilestone',
    });
  });
});
