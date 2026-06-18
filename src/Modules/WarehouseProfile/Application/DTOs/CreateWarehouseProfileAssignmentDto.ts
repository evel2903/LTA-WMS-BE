import { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/AssignmentType';

export class CreateWarehouseProfileAssignmentDto {
  public WarehouseProfileId!: string;
  public AssignmentType!: AssignmentType;
  public WarehouseTypeCode?: string;
  public WarehouseId?: string;
  public SourceSystem?: string;
  public ReferenceId?: string;
  public CreatedBy?: string;
}
