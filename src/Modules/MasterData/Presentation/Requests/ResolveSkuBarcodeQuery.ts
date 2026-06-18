import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveSkuBarcodeQuery {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  public BarcodeValue!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public OwnerId?: string | null;
}
