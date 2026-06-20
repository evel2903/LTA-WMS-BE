import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ExceptionSubStatus } from '@modules/AccessControl/Domain/Enums/ExceptionSubStatus';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import { LogExceptionDto } from '@modules/AccessControl/Application/DTOs/ExceptionCaseDto';
import { TransitionExceptionUseCase } from '@modules/AccessControl/Application/UseCases/TransitionExceptionUseCase';

/**
 * DETECTED -> LOGGED (architecture 6.8). A business reference is already mandatory at create,
 * so the only branch is the doc-09 hard-block context, which is preserved as
 * `SubStatus=AUTO_BLOCKED` without adding an extra state.
 */
export class LogExceptionUseCase extends TransitionExceptionUseCase<LogExceptionDto> {
  protected readonly TargetState = ExceptionState.Logged;

  protected async ApplyTransition(target: ExceptionCaseEntity, request: LogExceptionDto): Promise<void> {
    if (request.HardBlock) {
      target.SubStatus = ExceptionSubStatus.AutoBlocked;
    }
  }
}
