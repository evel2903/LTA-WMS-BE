import {
  PickExceptionResultDto,
  ReportPickExceptionDto,
  RequestPickSubstitutionDto,
} from '@modules/Outbound/Application/DTOs/PickTaskExceptionDto';
import { PickTaskExceptionService } from '@modules/Outbound/Application/Services/PickTaskExceptionService';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';

export class ReportPickExceptionUseCase {
  constructor(private readonly service: PickTaskExceptionService) {}

  public async Execute(
    pickTaskId: string,
    request: ReportPickExceptionDto,
    context: AuditContext,
  ): Promise<PickExceptionResultDto> {
    return this.service.ReportException(pickTaskId, request, context);
  }

  public async ExecuteByMobileTask(
    mobileTaskId: string,
    request: ReportPickExceptionDto,
    context: AuditContext,
  ): Promise<PickExceptionResultDto> {
    return this.service.ReportExceptionByMobileTask(mobileTaskId, request, context);
  }
}

export class RequestPickSubstitutionUseCase {
  constructor(private readonly service: PickTaskExceptionService) {}

  public async Execute(
    pickTaskId: string,
    request: RequestPickSubstitutionDto,
    context: AuditContext,
  ): Promise<PickExceptionResultDto> {
    return this.service.RequestSubstitution(pickTaskId, request, context);
  }

  public async ExecuteByMobileTask(
    mobileTaskId: string,
    request: RequestPickSubstitutionDto,
    context: AuditContext,
  ): Promise<PickExceptionResultDto> {
    return this.service.RequestSubstitutionByMobileTask(mobileTaskId, request, context);
  }
}
