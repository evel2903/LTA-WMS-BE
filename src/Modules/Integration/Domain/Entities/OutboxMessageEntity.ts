import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';

export class OutboxMessageEntity {
  public Id: string;
  public SourceMessageId: string | null;
  public MessageId: string;
  public EventType: string;
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
  public Status: OutboxMessageStatus;
  public CreatedAt: Date;
  public CreatedBy: string | null;

  constructor(params: {
    Id: string;
    SourceMessageId?: string | null;
    MessageId: string;
    EventType: string;
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
    Status: OutboxMessageStatus;
    CreatedAt?: Date;
    CreatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.SourceMessageId = params.SourceMessageId ?? null;
    this.MessageId = params.MessageId;
    this.EventType = params.EventType;
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
    this.Status = params.Status;
    this.CreatedAt = params.CreatedAt ?? new Date();
    this.CreatedBy = params.CreatedBy ?? null;
  }
}
