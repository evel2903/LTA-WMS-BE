import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateZoneDto {
  public WarehouseId!: string;
  public ZoneCode!: string;
  public ZoneName!: string;
  public ZoneType!: string;
  public Status!: MasterDataStatus;
  public Sequence?: number;
  public TemperatureClass?: string;
  public ComplianceFlags?: Record<string, unknown>;
  public SourceSystem?: string;
  public ReferenceId?: string;
  public ReasonCode?: string | null;
}
