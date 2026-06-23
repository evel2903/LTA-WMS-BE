import { ArrayMaxSize, IsArray, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { InventoryReconciliationRetryStatus } from '@modules/InventoryExecution/Application/DTOs/ReplenishmentTaskDto';

export class RecordInventoryReconciliationFailureRequest {
  @IsString()
  @MaxLength(64)
  public BusinessReference!: string;

  @IsIn(['InventoryReconciliationFailed'])
  @MaxLength(100)
  public EventType!: string;

  @IsString()
  @MaxLength(36)
  public WarehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public OwnerId?: string | null;

  @IsString()
  @MaxLength(1000)
  public ErrorMessage!: string;

  @IsIn(['PendingRetry', 'Retrying', 'DeadLetter'])
  public RetryStatus!: InventoryReconciliationRetryStatus;

  @IsString()
  @MaxLength(80)
  public ReasonCode?: string | null;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  public EvidenceRefs?: string[];

  @IsString()
  @MaxLength(160)
  public IdempotencyKey!: string;

  @IsOptional()
  @IsObject()
  public Payload?: Record<string, unknown> | null;
}
