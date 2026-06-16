import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginRequest {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  public EmailAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public Password!: string;
}
