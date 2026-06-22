import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { InboundPlanDto, ListInboundPlansDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { InboundPlanAggregate } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { InboundPlanDtoMapper } from '@modules/Inbound/Application/Mappers/InboundPlanDtoMapper';
import { CheckInboundPlanPermission } from '@modules/Inbound/Application/Services/InboundPlanPermission';

export interface ListInboundPlansInput extends ListInboundPlansDto {
  ActorUserId?: string | null;
}

export class ListInboundPlansUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(query: ListInboundPlansInput) {
    const paging = GetPagination(
      { Page: query.Page, PageSize: query.PageSize },
      { DefaultPageSize: 50, MaxPageSize: 100 },
    );
    const { ActorUserId, ...filter } = query;
    const candidates = await this.inboundPlans.FindCandidates(filter);
    const allowed: InboundPlanAggregate[] = [];
    for (const candidate of candidates) {
      if (await CheckInboundPlanPermission(this.permissionChecker, ActorUserId, ActionCode.Read, candidate.Plan)) {
        allowed.push(candidate);
      }
    }
    const result = {
      Items: allowed.slice(paging.Skip, paging.Skip + paging.Take),
      TotalItems: allowed.length,
    };
    return ToPagedResult<InboundPlanDto>(
      result.Items.map((item) => InboundPlanDtoMapper.ToDto(item)),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
