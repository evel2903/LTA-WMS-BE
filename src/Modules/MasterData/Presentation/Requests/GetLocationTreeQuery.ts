import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class GetLocationTreeQuery {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  public WarehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public ZoneId?: string;
}
