import {
  ApprovalRequestListFilter,
  IApprovalRequestRepository,
} from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import { ApprovalRequestDto } from '@modules/AccessControl/Application/DTOs/ApprovalRequestDto';
import { ApprovalRequestDtoMapper } from '@modules/AccessControl/Application/Mappers/ApprovalRequestDtoMapper';

export interface ListApprovalRequestsInput extends ApprovalRequestListFilter {
  Page?: number;
  PageSize?: number;
}

export interface PaginatedApprovalRequests {
  Items: ApprovalRequestDto[];
  Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
}

export class ListApprovalRequestsUseCase {
  constructor(private readonly approvalRequests: IApprovalRequestRepository) {}

  public async Execute(input: ListApprovalRequestsInput = {}): Promise<PaginatedApprovalRequests> {
    const page = input.Page && input.Page > 0 ? input.Page : 1;
    const pageSize = input.PageSize && input.PageSize > 0 ? input.PageSize : 20;
    const { Items, TotalItems } = await this.approvalRequests.List((page - 1) * pageSize, pageSize, {
      Decision: input.Decision,
      RequesterUserId: input.RequesterUserId,
      TargetObjectType: input.TargetObjectType,
      TargetObjectId: input.TargetObjectId,
      Action: input.Action,
    });
    return {
      Items: Items.map(ApprovalRequestDtoMapper.ToDto),
      Meta: {
        Page: page,
        PageSize: pageSize,
        TotalItems,
        TotalPages: Math.max(1, Math.ceil(TotalItems / pageSize)),
      },
    };
  }
}
