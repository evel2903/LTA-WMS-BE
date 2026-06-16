import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegisterRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  public FirstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  public LastName!: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  public EmailAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  public Password!: string;
}
