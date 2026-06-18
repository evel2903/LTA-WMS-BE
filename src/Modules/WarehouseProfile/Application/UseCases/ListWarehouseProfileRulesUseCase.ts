import { NotFoundException } from '@common/Exceptions/AppException';
import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { WarehouseProfileRuleDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileRuleDto';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { IWarehouseProfileRuleRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRuleRepository';
import { WarehouseProfileRuleDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/WarehouseProfileRuleDtoMapper';

export class ListWarehouseProfileRulesUseCase {
  constructor(
    private readonly bindingRepository: IWarehouseProfileRuleRepository,
    private readonly profileRepository: IWarehouseProfileRepository,
  ) {}

  public async Execute(
    warehouseProfileId: string,
    query: { Page?: number; PageSize?: number },
  ): Promise<{
    Items: WarehouseProfileRuleDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const profile = await this.profileRepository.FindById(warehouseProfileId);
    if (!profile) {
      throw new NotFoundException('Warehouse profile not found');
    }

    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.bindingRepository.ListByProfile(profile.Id, paging.Skip, paging.Take);

    return ToPagedResult(
      result.Items.map(WarehouseProfileRuleDtoMapper.ToDto),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
