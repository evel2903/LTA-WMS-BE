import { randomUUID } from 'crypto';
import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowStepCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStepCode';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { WorkflowMilestoneEntity } from '@modules/CoreFlow/Domain/Entities/WorkflowMilestoneEntity';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { InboundPlanDto, RecordGateInDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { InboundPlanDtoMapper } from '@modules/Inbound/Application/Mappers/InboundPlanDtoMapper';
import { AssertInboundPlanPermission } from '@modules/Inbound/Application/Services/InboundPlanPermission';
import { AssertInboundPlanNotCancelled } from '@modules/Inbound/Application/Services/InboundPlanStatusGuards';
import { InboundGateInStatus } from '@modules/Inbound/Domain/Enums/InboundGateInStatus';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';

export class RecordGateInUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly coreFlows: ICoreFlowRepository,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(request: RecordGateInDto, context: AuditContext = SystemAuditContext): Promise<InboundPlanDto> {
    // Fail-fast pre-check + idempotent fast path (no lock/transaction cost for a bad id,
    // missing scope, or a plain repeat of an already-recorded gate-in).
    const preCheck = await this.inboundPlans.FindById(request.Id);
    if (!preCheck) throw new NotFoundException('Inbound plan not found');
    await AssertInboundPlanPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, preCheck.Plan);
    // Re-review fix (P1): gate-in was never blocked on Cancelled -- a voided plan could
    // still have gate-in recorded against it. This codebase deliberately still allows
    // Draft (an open, documented scope decision), so this is a Cancelled-only exclusion,
    // not a broader status allow-list.
    AssertInboundPlanNotCancelled(preCheck.Plan.Status);

    if (preCheck.Plan.GateInStatus === InboundGateInStatus.Recorded) {
      if (preCheck.Plan.GateReference === request.GateReference) {
        return InboundPlanDtoMapper.ToDto(preCheck);
      }
      throw new BusinessRuleException('Gate-in has already been recorded for this inbound plan');
    }

    // IFB-24 review fix: this use case used to mutate+save the UNLOCKED `aggregate` read
    // above -- InboundPlanRepository.UpdatePlan writes the FULL row (Object.assign then
    // save()), so if a concurrent Confirm/Cancel/Update committed between that read and
    // this write, its Status/CoreFlowInstanceId change would be silently reverted to the
    // stale pre-read values here, orphaning the CoreFlow/outbox rows Confirm just created.
    // Re-fetching via FindByIdForUpdate (pessimistic_write) INSIDE the transaction and
    // mutating/saving THAT entity closes the gap -- untouched fields carry forward
    // whatever the most recently committed transaction set them to.
    return this.audited.Run(async (manager) => {
      const aggregate = await this.inboundPlans.FindByIdForUpdate(request.Id, manager);
      if (!aggregate) throw new NotFoundException('Inbound plan not found');
      // Re-review fix (authorization TOCTOU): re-check permission against the LOCKED
      // (current) Warehouse/Owner scope -- see ConfirmInboundPlanUseCase's identical fix.
      await AssertInboundPlanPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, aggregate.Plan);
      // Re-review fix (P1): re-check Cancelled under the lock too -- the plan could have
      // been cancelled in the race window between the unlocked pre-check above and this
      // lock (Cancel only requires Draft, so a still-Draft plan racing here is exposed).
      AssertInboundPlanNotCancelled(aggregate.Plan.Status);

      if (aggregate.Plan.GateInStatus === InboundGateInStatus.Recorded) {
        if (aggregate.Plan.GateReference !== request.GateReference) {
          throw new BusinessRuleException('Gate-in has already been recorded for this inbound plan');
        }
        // Idempotent retry that raced past the fast-path check above -- no mutation, no
        // milestone, but AuditedTransaction.Run still requires an entry.
        const dto = InboundPlanDtoMapper.ToDto(aggregate);
        return {
          result: dto,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Update,
            ObjectType: ObjectType.InboundPlan,
            ObjectId: aggregate.Plan.Id,
            ObjectCode: aggregate.Plan.BusinessReference,
            BeforeJson: dto as unknown as Record<string, unknown>,
            AfterJson: dto as unknown as Record<string, unknown>,
            EvidenceRefs: request.EvidenceRefs ?? null,
            ReferenceType: 'InboundGateIn',
            ReferenceId: aggregate.Plan.Id,
            WarehouseId: aggregate.Plan.WarehouseId,
            OwnerId: aggregate.Plan.OwnerId,
          }),
        };
      }

      const before = InboundPlanDtoMapper.ToDto(aggregate);
      aggregate.Plan.RecordGateIn({
        GateInAt: new Date(request.GateInAt),
        GateReference: request.GateReference,
        VehicleNumber: request.VehicleNumber ?? null,
        DriverName: request.DriverName ?? null,
        EvidenceRefs: request.EvidenceRefs ?? [],
        UpdatedBy: context.ActorUserId,
      });

      const updatedPlan = await this.inboundPlans.UpdatePlan(aggregate.Plan, manager);
      if (updatedPlan.CoreFlowInstanceId) {
        await this.coreFlows.CreateMilestone(
          new WorkflowMilestoneEntity({
            Id: randomUUID(),
            CoreFlowInstanceId: updatedPlan.CoreFlowInstanceId,
            StageCode: CoreFlowStageCode.Inbound,
            StepCode: CoreFlowStepCode.GateInRecorded,
            MilestoneStatus: WorkflowMilestoneStatus.Completed,
            Metadata: { GateReference: updatedPlan.GateReference, GateInAt: updatedPlan.GateInAt },
            OccurredAt: updatedPlan.GateInAt ?? new Date(),
            CreatedBy: context.ActorUserId,
          }),
          manager,
        );
      }
      const result = InboundPlanDtoMapper.ToDto({ Plan: updatedPlan, Lines: aggregate.Lines });

      return {
        result,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Update,
          ObjectType: ObjectType.InboundPlan,
          ObjectId: aggregate.Plan.Id,
          ObjectCode: aggregate.Plan.BusinessReference,
          BeforeJson: before as unknown as Record<string, unknown>,
          AfterJson: result as unknown as Record<string, unknown>,
          EvidenceRefs: request.EvidenceRefs ?? null,
          ReferenceType: 'InboundGateIn',
          ReferenceId: aggregate.Plan.Id,
          WarehouseId: aggregate.Plan.WarehouseId,
          OwnerId: aggregate.Plan.OwnerId,
        }),
      };
    });
  }
}
