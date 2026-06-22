import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowInstanceStatus } from '@modules/CoreFlow/Domain/Enums/CoreFlowInstanceStatus';

export class CoreFlowInstanceEntity {
  public readonly Id: string;
  public readonly BusinessReference: string;
  public readonly SourceSystem: string;
  public readonly WarehouseCode: string;
  public readonly OwnerCode: string | null;
  public readonly CorrelationId: string;
  public CurrentStage: CoreFlowStageCode;
  public Status: CoreFlowInstanceStatus;
  public readonly Metadata: Record<string, unknown> | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public readonly CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    BusinessReference: string;
    SourceSystem: string;
    WarehouseCode: string;
    OwnerCode?: string | null;
    CorrelationId: string;
    CurrentStage?: CoreFlowStageCode;
    Status?: CoreFlowInstanceStatus;
    Metadata?: Record<string, unknown> | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.BusinessReference = params.BusinessReference;
    this.SourceSystem = params.SourceSystem;
    this.WarehouseCode = params.WarehouseCode;
    this.OwnerCode = params.OwnerCode ?? null;
    this.CorrelationId = params.CorrelationId;
    this.CurrentStage = params.CurrentStage ?? CoreFlowStageCode.Inbound;
    this.Status = params.Status ?? CoreFlowInstanceStatus.Active;
    this.Metadata = params.Metadata ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }

  public PromoteTo(stageCode: CoreFlowStageCode, actorUserId?: string | null): void {
    this.CurrentStage = stageCode;
    this.UpdatedAt = new Date();
    this.UpdatedBy = actorUserId ?? null;
  }
}
