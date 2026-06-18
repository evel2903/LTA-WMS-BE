import { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/AssignmentType';

export class WarehouseProfileAssignmentEntity {
  public readonly Id: string;
  public WarehouseProfileId: string;
  public AssignmentType: AssignmentType;
  public WarehouseTypeCode: string | null;
  public WarehouseId: string | null;
  public ScopeKey: string;
  public SourceSystem: string | null;
  public ReferenceId: string | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    WarehouseProfileId: string;
    AssignmentType: AssignmentType;
    WarehouseTypeCode?: string | null;
    WarehouseId?: string | null;
    ScopeKey: string;
    SourceSystem?: string | null;
    ReferenceId?: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.WarehouseProfileId = params.WarehouseProfileId;
    this.AssignmentType = params.AssignmentType;
    this.WarehouseTypeCode = params.WarehouseTypeCode ?? null;
    this.WarehouseId = params.WarehouseId ?? null;
    this.ScopeKey = params.ScopeKey;
    this.SourceSystem = params.SourceSystem ?? null;
    this.ReferenceId = params.ReferenceId ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }
}
