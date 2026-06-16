import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserRequest {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  public FirstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public LastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  public EmailAddress?: string;
}
