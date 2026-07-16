import 'reflect-metadata';
import 'dotenv/config';
import { randomUUID } from 'crypto';
import AppDataSource from '@shared/Database/TypeOrmDataSource';
import { BusinessRuleException } from '@common/Exceptions/AppException';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { AuditWriter } from '@modules/AccessControl/Infrastructure/Audit/AuditWriter';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';
import { CoreFlowRepository } from '@modules/CoreFlow/Infrastructure/Persistence/Repositories/CoreFlowRepository';
import { CoreFlowInstanceOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/CoreFlowInstanceOrmEntity';
import { WorkflowMilestoneOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowMilestoneOrmEntity';
import { WorkflowHandoffOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowHandoffOrmEntity';
import { IntegrationRepository } from '@modules/Integration/Infrastructure/Persistence/Repositories/IntegrationRepository';
import { ImportBatchOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/ImportBatchOrmEntity';
import { InterfaceMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/InterfaceMessageOrmEntity';
import { OutboxMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/OutboxMessageOrmEntity';
import { IntegrationReconciliationRunOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/IntegrationReconciliationRunOrmEntity';
import { IntegrationReconciliationItemOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/IntegrationReconciliationItemOrmEntity';
import { ConfirmInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/ConfirmInboundPlanUseCase';
import { InboundPlanEntity } from '@modules/Inbound/Domain/Entities/InboundPlanEntity';
import { InboundPlanLineEntity } from '@modules/Inbound/Domain/Entities/InboundPlanLineEntity';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';
import { InboundPlanRepository } from '@modules/Inbound/Infrastructure/Persistence/Repositories/InboundPlanRepository';
import { InboundPlanOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanOrmEntity';
import { InboundPlanLineOrmEntity } from '@modules/Inbound/Infrastructure/Persistence/Entities/InboundPlanLineOrmEntity';

jest.setTimeout(60_000);

// Gated like RA-02's AccessControl.RolePermissionsConcurrencyE2ESpec: real row-level
// locking can't be proven against an InMemory double, so opt-in and skipped by default.
const RUN = process.env.IFB24_CONCURRENCY_E2E === '1';
const describeConcurrency = RUN ? describe : describe.skip;

const ctx: AuditContext = {
  ActorUserId: 'ifb24-concurrency-test',
  ActorRoleCodes: [RoleCode.WmsAdmin],
  ActorType: ActorType.User,
  CorrelationId: 'ifb24-concurrency',
  RequestId: 'ifb24-concurrency',
  IpAddress: '127.0.0.1',
  UserAgent: 'jest-concurrency-spec',
};

/**
 * Review finding (P1): Confirm/Cancel/Update read Status, checked it, then wrote --
 * with no lock, two concurrent Confirm calls on the same Draft plan could both read
 * Draft before either commits, and BOTH create their own CoreFlowInstance + outbox
 * event for the same plan. The fix re-locks the plan row (pessimistic_write) and
 * re-reads Status INSIDE the transaction, so the second call blocks on the lock, then
 * sees the already-Planned row and cleanly rejects with BusinessRuleException instead
 * of racing to a duplicate CoreFlow/outbox (or an unhandled unique-constraint error).
 */
describeConcurrency('IFB-24 Confirm concurrency (real Postgres, gated)', () => {
  let inboundPlanRepository: InboundPlanRepository;
  let coreFlowRepository: CoreFlowRepository;
  let integrationRepository: IntegrationRepository;
  let confirmUseCase: ConfirmInboundPlanUseCase;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    inboundPlanRepository = new InboundPlanRepository(
      AppDataSource.getRepository(InboundPlanOrmEntity),
      AppDataSource.getRepository(InboundPlanLineOrmEntity),
    );
    coreFlowRepository = new CoreFlowRepository(
      AppDataSource.getRepository(CoreFlowInstanceOrmEntity),
      AppDataSource.getRepository(WorkflowMilestoneOrmEntity),
      AppDataSource.getRepository(WorkflowHandoffOrmEntity),
    );
    integrationRepository = new IntegrationRepository(
      AppDataSource.getRepository(ImportBatchOrmEntity),
      AppDataSource.getRepository(InterfaceMessageOrmEntity),
      AppDataSource.getRepository(OutboxMessageOrmEntity),
      AppDataSource.getRepository(IntegrationReconciliationRunOrmEntity),
      AppDataSource.getRepository(IntegrationReconciliationItemOrmEntity),
    );
    const auditedTransaction = new AuditedTransaction(AppDataSource, new AuditWriter());
    confirmUseCase = new ConfirmInboundPlanUseCase(
      inboundPlanRepository,
      coreFlowRepository,
      integrationRepository,
      auditedTransaction,
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  it('two concurrent Confirm calls on the same Draft plan: exactly one succeeds, exactly one CoreFlow/outbox row is created', async () => {
    const planId = randomUUID();
    const now = new Date();
    const businessReference = `IFB24-CONC:ASN:${planId.slice(0, 8)}`;
    const plan = new InboundPlanEntity({
      Id: planId,
      SourceSystem: 'IFB24-CONC',
      SourceDocumentType: 'ASN',
      SourceDocumentNumber: planId.slice(0, 8),
      BusinessReference: businessReference,
      SupplierId: randomUUID(),
      OwnerId: randomUUID(),
      WarehouseId: randomUUID(),
      WarehouseCode: `WT-${planId.slice(0, 6)}`,
      Status: InboundPlanDocumentStatus.Draft,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: ctx.ActorUserId,
    });
    const line = new InboundPlanLineEntity({
      Id: randomUUID(),
      InboundPlanId: planId,
      LineNumber: 1,
      SkuId: randomUUID(),
      UomId: randomUUID(),
      ExpectedQuantity: 1,
      CreatedAt: now,
    });
    await inboundPlanRepository.Create(plan, [line]);

    try {
      const [first, second] = await Promise.allSettled([
        confirmUseCase.Execute({ Id: planId }, ctx),
        confirmUseCase.Execute({ Id: planId }, ctx),
      ]);
      const settled = [first, second];
      const fulfilled = settled.filter((result) => result.status === 'fulfilled');
      const rejected = settled.filter((result) => result.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(BusinessRuleException);

      const persistedPlan = await AppDataSource.getRepository(InboundPlanOrmEntity).findOne({
        where: { Id: planId },
      });
      expect(persistedPlan?.Status).toBe(InboundPlanDocumentStatus.Planned);

      const coreFlowRows = await AppDataSource.getRepository(CoreFlowInstanceOrmEntity).find({
        where: { BusinessReference: businessReference },
      });
      expect(coreFlowRows).toHaveLength(1);

      const outboxRows = await AppDataSource.getRepository(OutboxMessageOrmEntity).find({
        where: { MessageId: `InboundPlanReceived:${planId}` },
      });
      expect(outboxRows).toHaveLength(1);

      const auditRows = await AppDataSource.getRepository(AuditLogOrmEntity).find({
        where: { ObjectId: planId, Action: ActionCode.Update, ObjectType: ObjectType.InboundPlan },
      });
      // Only the winner's transaction commits an audit entry -- the loser's transaction
      // rolls back before reaching MergeAuditContext/AuditWriter.
      expect(auditRows).toHaveLength(1);
    } finally {
      await AppDataSource.getRepository(OutboxMessageOrmEntity).delete({ MessageId: `InboundPlanReceived:${planId}` });
      await AppDataSource.getRepository(CoreFlowInstanceOrmEntity).delete({ BusinessReference: businessReference });
      await AppDataSource.getRepository(InboundPlanLineOrmEntity).delete({ InboundPlanId: planId });
      await AppDataSource.getRepository(InboundPlanOrmEntity).delete({ Id: planId });
      // audit_logs is append-only (DB trigger blocks UPDATE/DELETE) -- left in place by design.
    }
  });
});
