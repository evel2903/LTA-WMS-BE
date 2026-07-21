import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ReceiptDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { ListReceiptsDto } from '@modules/Inbound/Application/DTOs/ReceiptDto';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { ReceivingDtoMapper } from '@modules/Inbound/Application/Mappers/ReceivingDtoMapper';

export class ListReceiptsUseCase {
  constructor(
    private readonly receiving: IReceivingRepository,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(query: ListReceiptsDto) {
    const paging = GetPagination(query, { DefaultPageSize: 50, MaxPageSize: 100 });
    if (this.permissionChecker && query.ActorUserId && !this.permissionChecker.ResolveDataScope) {
      throw new ForbiddenAppException('Receipt list scope resolution is unavailable');
    }
    const resolvedScope =
      this.permissionChecker && query.ActorUserId
        ? await this.permissionChecker.ResolveDataScope?.({
            UserId: query.ActorUserId,
            Action: ActionCode.Read,
            ObjectType: ObjectType.Receipt,
          })
        : null;
    if (resolvedScope && !resolvedScope.Allowed) {
      return ToPagedResult<ReceiptDto>([], 0, paging.Page, paging.PageSize);
    }
    const result = await this.receiving.ListReceipts(paging.Skip, paging.Take, {
      WarehouseId: query.WarehouseId,
      OwnerId: query.OwnerId,
      WarehouseIds: resolvedScope?.WarehouseIds,
      OwnerIds: resolvedScope?.OwnerIds,
      Search: query.Search,
      SortBy: query.SortBy,
      SortDirection: query.SortDirection,
    });
    return ToPagedResult<ReceiptDto>(
      result.Items.map((item) =>
        ReceivingDtoMapper.ToReceiptDto(item.Receipt, {
          SupplierCode: item.SupplierCode,
          SupplierName: item.SupplierName,
        }),
      ),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
