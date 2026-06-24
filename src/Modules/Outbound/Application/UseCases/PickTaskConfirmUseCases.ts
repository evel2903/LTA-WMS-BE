import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ConfirmPickTaskDto } from '@modules/Outbound/Application/DTOs/PickTaskConfirmDto';
import { PickTaskConfirmationService } from '@modules/Outbound/Application/Services/PickTaskConfirmationService';

export class ConfirmPickTaskUseCase {
  constructor(private readonly service: PickTaskConfirmationService) {}

  public async Execute(pickTaskId: string, request: ConfirmPickTaskDto, context: AuditContext) {
    return this.service.Confirm(pickTaskId, request, context);
  }

  public async ExecuteByMobileTask(mobileTaskId: string, request: ConfirmPickTaskDto, context: AuditContext) {
    return this.service.ConfirmByMobileTask(mobileTaskId, request, context);
  }
}
