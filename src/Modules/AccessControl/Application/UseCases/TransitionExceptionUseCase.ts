import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ExceptionStateMachine } from '@modules/AccessControl/Application/Services/ExceptionStateMachine';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { ExceptionCaseDto } from '@modules/AccessControl/Application/DTOs/ExceptionCaseDto';
import { ExceptionCaseDtoMapper } from '@modules/AccessControl/Application/Mappers/ExceptionCaseDtoMapper';

/**
 * Base for the five exception lifecycle transitions (Log/Assign/Submit/Resolve/Close).
 * Each one loads the case, asserts the edge is legal via the central state machine (AC2),
 * runs its transition-specific guard, mutates the case to the target state, and persists the
 * update + an Update audit row (Before/After state) in ONE transaction (AC4). The audit
 * commits atomically with the mutation; a guard/illegal-edge failure writes no audit row.
 */
export abstract class TransitionExceptionUseCase<TRequest extends { Id: string }> {
  protected abstract readonly TargetState: ExceptionState;

  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it.
  constructor(
    protected readonly cases: IExceptionCaseRepository,
    protected readonly auditedTransaction?: AuditedTransaction,
  ) {}

  /**
   * Transition-specific validation + mutation. Throw a BusinessRuleException/ForbiddenAppException
   * to block; otherwise mutate `target` in place (additional fields beyond State). May be async
   * (e.g. Resolve checks the approval repository, Submit creates an approval request).
   */
  protected abstract ApplyTransition(
    target: ExceptionCaseEntity,
    request: TRequest,
    context: AuditContext,
  ): Promise<void>;

  public async Execute(request: TRequest, context: AuditContext = SystemAuditContext): Promise<ExceptionCaseDto> {
    const entity = await this.cases.FindById(request.Id);
    if (!entity) {
      throw new NotFoundException('Exception case not found');
    }

    // AC2: central legal-edge assertion — illegal edge -> INVALID_EXCEPTION_TRANSITION.
    ExceptionStateMachine.AssertTransition(entity.State, this.TargetState);

    const before = ExceptionCaseDtoMapper.ToDto(entity) as unknown as Record<string, unknown>;
    const fromState = entity.State;

    await this.ApplyTransition(entity, request, context);

    const applyTargetState = (): void => {
      entity.State = this.TargetState;
      entity.UpdatedAt = new Date();
      entity.UpdatedBy = context.ActorUserId;
    };

    const buildEntry = (updated: ExceptionCaseEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.ExceptionCase,
        ObjectId: updated.Id,
        ObjectCode: updated.ExceptionType,
        BeforeJson: before,
        AfterJson: ExceptionCaseDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
        ReasonCodeId: updated.ReasonCodeId,
        ReasonNote: updated.ResolutionNote,
        EvidenceRefs: updated.EvidenceRefs,
        ReferenceType: updated.ReferenceType,
        ReferenceId: updated.ReferenceId,
        WarehouseId: updated.WarehouseId,
        OwnerId: updated.OwnerId,
      });

    if (!this.auditedTransaction) {
      applyTargetState();
      const updated = await this.cases.Update(entity);
      return ExceptionCaseDtoMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      // Authoritative re-check under a write lock: if the case state changed between the initial read
      // and this transaction, abort — closing the read-check-write race so a case is transitioned once.
      const locked = await this.cases.FindByIdForUpdate(entity.Id, manager);
      if (!locked) {
        throw new NotFoundException('Exception case not found');
      }
      if (locked.State !== fromState) {
        throw new BusinessRuleException(
          `INVALID_EXCEPTION_TRANSITION: case state changed concurrently (now ${locked.State})`,
        );
      }
      applyTargetState();
      const updated = await this.cases.Update(entity, manager);
      return { result: ExceptionCaseDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
