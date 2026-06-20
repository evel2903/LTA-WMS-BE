import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateZoneDto {
  public Id!: string;
  public WarehouseId?: string;
  public ZoneCode?: string;
  public ZoneName?: string;
  public ZoneType?: string;
  public Status?: MasterDataStatus;
  public Sequence?: number | null;
  public TemperatureClass?: string | null;
  public ComplianceFlags?: Record<string, unknown>;
  public SourceSystem?: string | null;
  public ReferenceId?: string | null;
  /** Actor performing the update; set by the controller for entity-resident data-scope re-check (C2). */
  public ActorUserId?: string;
  public ReasonCode?: string | null;
}
