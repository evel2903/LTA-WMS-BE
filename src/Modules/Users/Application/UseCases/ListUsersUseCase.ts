import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { IUserRepository } from '@modules/Users/Application/Interfaces/IUserRepository';
import { UserDto } from '@modules/Users/Application/DTOs/UserDto';
import { UserDtoMapper } from '@modules/Users/Application/Mappers/UserDtoMapper';

export class ListUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async Execute(query: { Page?: number; PageSize?: number }): Promise<{
    Items: UserDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.userRepository.List(paging.Skip, paging.Take);

    return ToPagedResult(result.Items.map(UserDtoMapper.ToDto), result.TotalItems, paging.Page, paging.PageSize);
  }
}
