import { NotFoundException } from '@common/Exceptions/AppException';
import { IApprovalRequestRepository } from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import { ApprovalRequestDto } from '@modules/AccessControl/Application/DTOs/ApprovalRequestDto';
import { ApprovalRequestDtoMapper } from '@modules/AccessControl/Application/Mappers/ApprovalRequestDtoMapper';

export class GetApprovalRequestUseCase {
  constructor(private readonly approvalRequests: IApprovalRequestRepository) {}

  public async Execute(id: string): Promise<ApprovalRequestDto> {
    const request = await this.approvalRequests.FindById(id);
    if (!request) {
      throw new NotFoundException('Approval request not found');
    }
    return ApprovalRequestDtoMapper.ToDto(request);
  }
}
