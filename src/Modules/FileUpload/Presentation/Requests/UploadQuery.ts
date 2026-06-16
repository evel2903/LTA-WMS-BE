import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadQuery {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  public Folder?: string;
}
