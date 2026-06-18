import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/AssignmentType';

export class CreateWarehouseProfileAssignmentRequest {
  @IsEnum(AssignmentType)
  public AssignmentType!: AssignmentType;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public WarehouseTypeCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public SourceSystem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public ReferenceId?: string;
}
