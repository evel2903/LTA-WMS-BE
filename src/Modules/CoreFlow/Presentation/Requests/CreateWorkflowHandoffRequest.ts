import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';

export class CreateWorkflowHandoffRequest {
  @IsEnum(CoreFlowStageCode)
  public FromStage!: CoreFlowStageCode;

  @IsEnum(CoreFlowStageCode)
  public ToStage!: CoreFlowStageCode;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public ReasonCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public ReasonNote?: string;

  @IsOptional()
  @IsObject()
  public Metadata?: Record<string, unknown>;
}
