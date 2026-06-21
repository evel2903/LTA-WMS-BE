import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { InventoryStatusDto } from '@modules/MasterData/Application/DTOs/InventoryStatusDto';
import { IInventoryStatusRepository } from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import { InventoryStatusMapper } from '@modules/MasterData/Application/Mappers/InventoryStatusMapper';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class ListInventoryStatusesUseCase {
  constructor(private readonly inventoryStatuses: IInventoryStatusRepository) {}

  public async Execute(query: {
    Page?: number;
    PageSize?: number;
    StatusCode?: string;
    StageGroup?: string;
    Status?: MasterDataStatus;
  }): Promise<{
    Items: InventoryStatusDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.inventoryStatuses.List(paging.Skip, paging.Take, {
      StatusCode: query.StatusCode,
      StageGroup: query.StageGroup,
      Status: query.Status,
    });
    return ToPagedResult(
      result.Items.map(InventoryStatusMapper.ToDto),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
