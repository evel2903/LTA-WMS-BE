import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';

export class AssignDataScopeRequest {
  @IsEnum(DataScopeType)
  public ScopeType!: DataScopeType;

  @IsOptional()
  @IsString()
  public ScopeValueId?: string;

  @IsOptional()
  @IsString()
  public ScopeValueCode?: string;

  @IsOptional()
  @IsBoolean()
  public IncludeAll?: boolean;
}
