import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class EnqueueExampleRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  public Message!: string;
}
