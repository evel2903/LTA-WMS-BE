import { randomUUID } from 'node:crypto';
import { MobileScanResult } from '@modules/TaskExecution/Domain/Enums/MobileScanResult';
import { MobileScanType } from '@modules/TaskExecution/Domain/Enums/MobileScanType';

export interface MobileScanEventEntityProps {
  Id?: string;
  TaskId: string;
  TaskCode: string;
  WarehouseId: string;
  OwnerId?: string | null;
  ScanType: MobileScanType;
  RawValue: string;
  NormalizedValue?: string | null;
  Result: MobileScanResult;
  ResolvedObjectType?: string | null;
  ResolvedObjectId?: string | null;
  ParsedValueJson?: Record<string, unknown>;
  RejectionCode?: string | null;
  RejectionMessage?: string | null;
  ReasonCode?: string | null;
  DeviceCode?: string | null;
  SessionId?: string | null;
  ActorUserId?: string | null;
  CreatedAt?: Date;
}

export class MobileScanEventEntity {
  public Id: string;
  public TaskId: string;
  public TaskCode: string;
  public WarehouseId: string;
  public OwnerId: string | null;
  public ScanType: MobileScanType;
  public RawValue: string;
  public NormalizedValue: string | null;
  public Result: MobileScanResult;
  public ResolvedObjectType: string | null;
  public ResolvedObjectId: string | null;
  public ParsedValueJson: Record<string, unknown>;
  public RejectionCode: string | null;
  public RejectionMessage: string | null;
  public ReasonCode: string | null;
  public DeviceCode: string | null;
  public SessionId: string | null;
  public ActorUserId: string | null;
  public CreatedAt: Date;

  constructor(props: MobileScanEventEntityProps) {
    this.Id = props.Id ?? randomUUID();
    this.TaskId = props.TaskId;
    this.TaskCode = props.TaskCode;
    this.WarehouseId = props.WarehouseId;
    this.OwnerId = props.OwnerId ?? null;
    this.ScanType = props.ScanType;
    this.RawValue = props.RawValue;
    this.NormalizedValue = props.NormalizedValue ?? null;
    this.Result = props.Result;
    this.ResolvedObjectType = props.ResolvedObjectType ?? null;
    this.ResolvedObjectId = props.ResolvedObjectId ?? null;
    this.ParsedValueJson = props.ParsedValueJson ?? {};
    this.RejectionCode = props.RejectionCode ?? null;
    this.RejectionMessage = props.RejectionMessage ?? null;
    this.ReasonCode = props.ReasonCode ?? null;
    this.DeviceCode = props.DeviceCode ?? null;
    this.SessionId = props.SessionId ?? null;
    this.ActorUserId = props.ActorUserId ?? null;
    this.CreatedAt = props.CreatedAt ?? new Date();
  }
}
