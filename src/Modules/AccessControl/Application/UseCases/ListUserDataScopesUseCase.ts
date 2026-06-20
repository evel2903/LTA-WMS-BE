import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { DataScopeDto } from '@modules/AccessControl/Application/DTOs/DataScopeDto';
import { DataScopeDtoMapper } from '@modules/AccessControl/Application/Mappers/DataScopeDtoMapper';
import { IDataScopeRepository } from '@modules/AccessControl/Application/Interfaces/IDataScopeRepository';

/**
 * Lists the data scopes attached directly to a user (PrincipalType.User). Role-derived
 * scopes are resolved separately by the C2 PermissionChecker and are not returned here —
 * this surface manages only the user's own grants.
 */
export class ListUserDataScopesUseCase {
  constructor(private readonly dataScopeRepository: IDataScopeRepository) {}

  public async Execute(userId: string): Promise<DataScopeDto[]> {
    const scopes = await this.dataScopeRepository.FindByPrincipal(PrincipalType.User, userId);
    return scopes.map(DataScopeDtoMapper.ToDto);
  }
}
