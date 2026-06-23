import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CycleCountWorkStatus } from '@modules/InventoryExecution/Domain/Enums/CycleCountWorkStatus';

export class ListCycleCountWorksQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public Page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public PageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  public OwnerId?: string;

  @IsOptional()
  @IsEnum(CycleCountWorkStatus)
  public WorkStatus?: CycleCountWorkStatus;
}
