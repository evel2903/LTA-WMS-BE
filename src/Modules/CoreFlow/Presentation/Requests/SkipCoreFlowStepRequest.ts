import { IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';

export class SkipCoreFlowStepRequest {
  @IsEnum(CoreFlowStageCode)
  public StageCode!: CoreFlowStageCode;

  @IsString()
  @MaxLength(80)
  public ReasonCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public ReasonNote?: string;

  @IsOptional()
  @IsUUID()
  public ExceptionCaseId?: string;

  @IsOptional()
  @IsObject()
  public Metadata?: Record<string, unknown>;
}
