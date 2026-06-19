import { GetPagination, PagedResult, ToPagedResult } from '@common/Helpers/Pagination';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionDto } from '@modules/AccessControl/Application/DTOs/PermissionDto';
import { IPermissionRepository } from '@modules/AccessControl/Application/Interfaces/IPermissionRepository';
import { PermissionDtoMapper } from '@modules/AccessControl/Application/Mappers/PermissionDtoMapper';

export class ListPermissionsUseCase {
  constructor(private readonly permissionRepository: IPermissionRepository) {}

  public async Execute(query: {
    Page?: number;
    PageSize?: number;
    Action?: ActionCode;
    ObjectType?: ObjectType;
  }): Promise<PagedResult<PermissionDto>> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.permissionRepository.List(paging.Skip, paging.Take, {
      Action: query.Action,
      ObjectType: query.ObjectType,
    });
    return ToPagedResult(result.Items.map(PermissionDtoMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
