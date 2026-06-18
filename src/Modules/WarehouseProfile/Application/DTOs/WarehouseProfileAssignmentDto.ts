import { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/AssignmentType';

export class WarehouseProfileAssignmentDto {
  public Id!: string;
  public WarehouseProfileId!: string;
  public AssignmentType!: AssignmentType;
  public WarehouseTypeCode!: string | null;
  public WarehouseId!: string | null;
  public ScopeKey!: string;
  public SourceSystem!: string | null;
  public ReferenceId!: string | null;
  public CreatedAt!: string;
  public UpdatedAt!: string;
  public CreatedBy!: string | null;
  public UpdatedBy!: string | null;
}
