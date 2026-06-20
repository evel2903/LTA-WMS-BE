import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import { AssignExceptionDto } from '@modules/AccessControl/Application/DTOs/ExceptionCaseDto';
import { TransitionExceptionUseCase } from '@modules/AccessControl/Application/UseCases/TransitionExceptionUseCase';

/**
 * LOGGED -> ASSIGNED (architecture 6.8). Requires an owner/role to handle the case: at least
 * one of AssignedToUserId / AssignedRoleId. Data-scope is enforced by the controller guard
 * (@RequirePermission); the owner can also be recorded here.
 */
export class AssignExceptionUseCase extends TransitionExceptionUseCase<AssignExceptionDto> {
  protected readonly TargetState = ExceptionState.Assigned;

  protected async ApplyTransition(target: ExceptionCaseEntity, request: AssignExceptionDto): Promise<void> {
    if (!request.AssignedToUserId && !request.AssignedRoleId) {
      throw new BusinessRuleException('Assign requires an AssignedToUserId or AssignedRoleId');
    }
    target.AssignedToUserId = request.AssignedToUserId ?? null;
    target.AssignedRoleId = request.AssignedRoleId ?? null;
    if (request.OwnerId) {
      target.OwnerId = request.OwnerId;
    }
  }
}
