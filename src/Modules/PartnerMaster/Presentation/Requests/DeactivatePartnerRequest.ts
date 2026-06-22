import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeactivatePartnerRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  public ReasonCode!: string;
}
