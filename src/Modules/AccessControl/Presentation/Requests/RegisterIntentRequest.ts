import { IsIn, IsNotEmpty, IsString } from 'class-validator';

/** RH-04 registration body. RunId is an FE-generated canonical lowercase UUID v4 (format checked
 * in the use case); Operation is the intended effect. */
export class RegisterIntentRequest {
  @IsString()
  @IsIn(['assign', 'remove'])
  public Operation!: 'assign' | 'remove';

  @IsString()
  @IsNotEmpty()
  public RunId!: string;
}
