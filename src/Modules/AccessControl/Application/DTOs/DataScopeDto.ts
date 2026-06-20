import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';

export interface DataScopeDto {
  Id: string;
  ScopeType: DataScopeType;
  ScopeValueId: string | null;
  ScopeValueCode: string | null;
  IncludeAll: boolean;
}
