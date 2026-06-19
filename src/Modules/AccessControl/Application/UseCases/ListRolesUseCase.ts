import { GetPagination, PagedResult, ToPagedResult } from '@common/Helpers/Pagination';
import { RoleDto } from '@modules/AccessControl/Application/DTOs/RoleDto';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { RoleDtoMapper } from '@modules/AccessControl/Application/Mappers/RoleDtoMapper';

export class ListRolesUseCase {
  constructor(private readonly roleRepository: IRoleRepository) {}

  public async Execute(query: { Page?: number; PageSize?: number }): Promise<PagedResult<RoleDto>> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.roleRepository.List(paging.Skip, paging.Take);
    return ToPagedResult(
      result.Items.map((role) => RoleDtoMapper.ToDto(role)),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
