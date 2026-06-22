import { InterfaceMessageStatus } from '@modules/Integration/Domain/Enums/InterfaceMessageStatus';

export class InterfaceMessageEntity {
  public Id: string;
  public ImportBatchId: string | null;
  public MessageId: string;
  public MessageType: string;
  public Version: string;
  public BusinessReference: string;
  public SourceSystem: string;
  public TargetSystem: string;
  public WarehouseContext: string;
  public OwnerContext: string | null;
  public EventTime: Date;
  public CorrelationId: string | null;
  public CausationId: string | null;
  public Payload: Record<string, unknown>;
  public MessageStatus: InterfaceMessageStatus;
  public CreatedAt: Date;
  public CreatedBy: string | null;

  constructor(params: {
    Id: string;
    ImportBatchId?: string | null;
    MessageId: string;
    MessageType: string;
    Version: string;
    BusinessReference: string;
    SourceSystem: string;
    TargetSystem: string;
    WarehouseContext: string;
    OwnerContext?: string | null;
    EventTime: Date;
    CorrelationId?: string | null;
    CausationId?: string | null;
    Payload: Record<string, unknown>;
    MessageStatus: InterfaceMessageStatus;
    CreatedAt?: Date;
    CreatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.ImportBatchId = params.ImportBatchId ?? null;
    this.MessageId = params.MessageId;
    this.MessageType = params.MessageType;
    this.Version = params.Version;
    this.BusinessReference = params.BusinessReference;
    this.SourceSystem = params.SourceSystem;
    this.TargetSystem = params.TargetSystem;
    this.WarehouseContext = params.WarehouseContext;
    this.OwnerContext = params.OwnerContext ?? null;
    this.EventTime = params.EventTime;
    this.CorrelationId = params.CorrelationId ?? null;
    this.CausationId = params.CausationId ?? null;
    this.Payload = params.Payload;
    this.MessageStatus = params.MessageStatus;
    this.CreatedAt = params.CreatedAt ?? new Date();
    this.CreatedBy = params.CreatedBy ?? null;
  }
}
