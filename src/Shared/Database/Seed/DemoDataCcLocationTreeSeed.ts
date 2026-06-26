import { randomUUID } from 'crypto';
import type { DataSource } from 'typeorm';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';
import { LocationOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationOrmEntity';
import { LocationProfileOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationProfileOrmEntity';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';
import { ZoneOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ZoneOrmEntity';

const DemoSourceSystem = 'DEMO-DATA-CC';
const ActiveStatus = 'Active';
const EnabledLocationStatus = 'Active';

type LocationProfileSeed = {
  ProfileCode: string;
  ProfileName: string;
  LocationType: string;
  CapacityPolicy: Record<string, unknown>;
  OperationPolicy: Record<string, unknown>;
};

type ZoneSeed = {
  ZoneCode: string;
  ZoneName: string;
  ZoneType: string;
  Sequence: number;
};

export type DemoDataCcLocationSeed = {
  LocationCode: string;
  LocationName: string;
  ZoneCode: string;
  ProfileCode: string;
  LocationType: string;
  ParentLocationCode?: string;
  CapacityQty?: number | null;
  CapacityVolume?: number | null;
  CapacityWeight?: number | null;
  PalletSlot?: number;
  PickSequence?: number;
  PutawaySequence?: number;
  OwnerRestriction?: string;
  MixSkuPolicy?: string;
  MixLotPolicy?: string;
  MixOwnerPolicy?: string;
};

export type DemoDataCcLocationTreePlan = {
  WarehouseCode: string;
  Profiles: LocationProfileSeed[];
  Zones: ZoneSeed[];
  Locations: DemoDataCcLocationSeed[];
};

export type DemoDataCcLocationTreeSeedResult = {
  WarehouseCode: string;
  ProfileCount: number;
  ZoneCount: number;
  LocationCount: number;
  SampleLocations: string[];
};

export const BuildDemoDataCcLocationTreePlan = (): DemoDataCcLocationTreePlan => {
  const profiles: LocationProfileSeed[] = [
    {
      ProfileCode: 'LP-CC-DOCK',
      ProfileName: 'Coca-Cola Dock/Staging',
      LocationType: 'DOCK',
      CapacityPolicy: { palletSlots: 6 },
      OperationPolicy: { allowReceiving: true, allowLoading: true },
    },
    {
      ProfileCode: 'LP-CC-QC',
      ProfileName: 'Coca-Cola QC Staging',
      LocationType: 'QC_STAGE',
      CapacityPolicy: { palletSlots: 12 },
      OperationPolicy: { allowQc: true },
    },
    {
      ProfileCode: 'LP-CC-AISLE',
      ProfileName: 'Coca-Cola Aisle',
      LocationType: 'AISLE',
      CapacityPolicy: { structuralNode: true },
      OperationPolicy: { allowInventory: false },
    },
    {
      ProfileCode: 'LP-CC-RACK',
      ProfileName: 'Coca-Cola Rack',
      LocationType: 'RACK',
      CapacityPolicy: { structuralNode: true },
      OperationPolicy: { allowInventory: false },
    },
    {
      ProfileCode: 'LP-CC-LEVEL',
      ProfileName: 'Coca-Cola Rack Level',
      LocationType: 'LEVEL',
      CapacityPolicy: { structuralNode: true },
      OperationPolicy: { allowInventory: false },
    },
    {
      ProfileCode: 'LP-CC-RESERVE',
      ProfileName: 'Coca-Cola Reserve Pallet',
      LocationType: 'RESERVE',
      CapacityPolicy: { palletSlots: 24, maxWeightKg: 18000 },
      OperationPolicy: { allowPutaway: true, allowReplenishmentSource: true },
    },
    {
      ProfileCode: 'LP-CC-PICKFACE',
      ProfileName: 'Coca-Cola Pick Face',
      LocationType: 'PICK_FACE',
      CapacityPolicy: { palletSlots: 4, maxEachQty: 1200 },
      OperationPolicy: { allowPicking: true, allowReplenishmentTarget: true },
    },
    {
      ProfileCode: 'LP-CC-PACK',
      ProfileName: 'Coca-Cola Packing Station',
      LocationType: 'PACKING',
      CapacityPolicy: { workStations: 4 },
      OperationPolicy: { allowPacking: true },
    },
    {
      ProfileCode: 'LP-CC-QUARANTINE',
      ProfileName: 'Coca-Cola Quarantine Hold',
      LocationType: 'QUARANTINE',
      CapacityPolicy: { palletSlots: 8 },
      OperationPolicy: { allowHold: true, allowPicking: false },
    },
  ];

  const zones: ZoneSeed[] = [
    { ZoneCode: 'CC-RCV', ZoneName: 'Receiving - Nhận hàng', ZoneType: 'RECEIVING', Sequence: 10 },
    { ZoneCode: 'CC-QC', ZoneName: 'QC - Kiểm hàng', ZoneType: 'QC', Sequence: 20 },
    { ZoneCode: 'CC-RSV', ZoneName: 'Reserve - Lưu trữ pallet', ZoneType: 'RESERVE', Sequence: 30 },
    { ZoneCode: 'CC-PF', ZoneName: 'Pick Face - Soạn hàng lẻ', ZoneType: 'PICK_FACE', Sequence: 40 },
    { ZoneCode: 'CC-PACK', ZoneName: 'Packing - Đóng gói', ZoneType: 'PACKING', Sequence: 50 },
    { ZoneCode: 'CC-LOAD', ZoneName: 'Loading - Xuất hàng', ZoneType: 'LOADING', Sequence: 60 },
    { ZoneCode: 'CC-QAR', ZoneName: 'Quarantine - Cách ly', ZoneType: 'QUARANTINE', Sequence: 70 },
  ];

  const locations: DemoDataCcLocationSeed[] = [
    loc('RCV-A01', 'Receiving aisle A01', 'CC-RCV', 'LP-CC-AISLE', 'AISLE', undefined, 10, 10),
    loc('RCV-A01-D01', 'Dock nhận hàng 01', 'CC-RCV', 'LP-CC-DOCK', 'DOCK', 'RCV-A01', 11, 11, 6),
    loc('RCV-A01-D02', 'Dock nhận hàng 02', 'CC-RCV', 'LP-CC-DOCK', 'DOCK', 'RCV-A01', 12, 12, 6),
    loc('QC-A01', 'QC aisle A01', 'CC-QC', 'LP-CC-AISLE', 'AISLE', undefined, 20, 20),
    loc('QC-A01-STG01', 'QC staging 01', 'CC-QC', 'LP-CC-QC', 'QC_STAGE', 'QC-A01', 21, 21, 8),
    loc('QC-A01-HOLD01', 'QC hold 01', 'CC-QC', 'LP-CC-QC', 'QC_STAGE', 'QC-A01', 22, 22, 4),
    loc('RSV-A01', 'Reserve aisle A01', 'CC-RSV', 'LP-CC-AISLE', 'AISLE', undefined, undefined, 100),
    loc('RSV-A01-R01', 'Reserve rack R01', 'CC-RSV', 'LP-CC-RACK', 'RACK', 'RSV-A01', undefined, 110),
    loc('RSV-A01-R01-L01', 'Reserve level L01', 'CC-RSV', 'LP-CC-LEVEL', 'LEVEL', 'RSV-A01-R01', undefined, 111),
    loc(
      'RSV-A01-R01-L01-B01',
      'Reserve bin B01',
      'CC-RSV',
      'LP-CC-RESERVE',
      'BIN',
      'RSV-A01-R01-L01',
      undefined,
      1111,
      2,
    ),
    loc(
      'RSV-A01-R01-L01-B02',
      'Reserve bin B02',
      'CC-RSV',
      'LP-CC-RESERVE',
      'BIN',
      'RSV-A01-R01-L01',
      undefined,
      1112,
      2,
    ),
    loc('RSV-A01-R02', 'Reserve rack R02', 'CC-RSV', 'LP-CC-RACK', 'RACK', 'RSV-A01', undefined, 120),
    loc('RSV-A01-R02-L01', 'Reserve level L01 R02', 'CC-RSV', 'LP-CC-LEVEL', 'LEVEL', 'RSV-A01-R02', undefined, 121),
    loc(
      'RSV-A01-R02-L01-B01',
      'Reserve bin R02 B01',
      'CC-RSV',
      'LP-CC-RESERVE',
      'BIN',
      'RSV-A01-R02-L01',
      undefined,
      1211,
      2,
    ),
    loc('PF-A01', 'Pick face aisle A01', 'CC-PF', 'LP-CC-AISLE', 'AISLE', undefined, 200, 200),
    loc('PF-A01-R01', 'Pick face rack R01', 'CC-PF', 'LP-CC-RACK', 'RACK', 'PF-A01', 210, 210),
    loc('PF-A01-R01-L01', 'Pick face level L01', 'CC-PF', 'LP-CC-LEVEL', 'LEVEL', 'PF-A01-R01', 211, 211),
    loc('PF-A01-R01-L01-B01', 'Pick face bin lon', 'CC-PF', 'LP-CC-PICKFACE', 'BIN', 'PF-A01-R01-L01', 2111, 2111, 1),
    loc('PF-A01-R01-L01-B02', 'Pick face bin chai', 'CC-PF', 'LP-CC-PICKFACE', 'BIN', 'PF-A01-R01-L01', 2112, 2112, 1),
    loc('PACK-A01', 'Packing aisle A01', 'CC-PACK', 'LP-CC-AISLE', 'AISLE', undefined, 300, 300),
    loc('PACK-A01-ST01', 'Bàn đóng gói 01', 'CC-PACK', 'LP-CC-PACK', 'PACK_STATION', 'PACK-A01', 301, 301),
    loc('PACK-A01-ST02', 'Bàn đóng gói 02', 'CC-PACK', 'LP-CC-PACK', 'PACK_STATION', 'PACK-A01', 302, 302),
    loc('LOAD-A01', 'Loading aisle A01', 'CC-LOAD', 'LP-CC-AISLE', 'AISLE', undefined, 400, 400),
    loc('LOAD-A01-D01', 'Cửa xuất hàng 01', 'CC-LOAD', 'LP-CC-DOCK', 'DOCK', 'LOAD-A01', 401, 401, 8),
    loc('LOAD-A01-D02', 'Cửa xuất hàng 02', 'CC-LOAD', 'LP-CC-DOCK', 'DOCK', 'LOAD-A01', 402, 402, 8),
    loc('QAR-A01', 'Quarantine aisle A01', 'CC-QAR', 'LP-CC-AISLE', 'AISLE', undefined, 900, 900),
    loc('QAR-A01-HOLD01', 'Vị trí cách ly 01', 'CC-QAR', 'LP-CC-QUARANTINE', 'QUARANTINE', 'QAR-A01', 901, 901, 4),
  ];

  return { WarehouseCode: 'CC-HCM-01', Profiles: profiles, Zones: zones, Locations: locations };
};

const loc = (
  LocationCode: string,
  LocationName: string,
  ZoneCode: string,
  ProfileCode: string,
  LocationType: string,
  ParentLocationCode?: string,
  PickSequence?: number,
  PutawaySequence?: number,
  PalletSlot?: number,
): DemoDataCcLocationSeed => ({
  LocationCode,
  LocationName,
  ZoneCode,
  ProfileCode,
  LocationType,
  ParentLocationCode,
  PickSequence,
  PutawaySequence,
  PalletSlot,
  CapacityQty: PalletSlot ? PalletSlot * 100 : null,
  CapacityVolume: PalletSlot ? PalletSlot * 1.2 : null,
  CapacityWeight: PalletSlot ? PalletSlot * 750 : null,
  OwnerRestriction: 'CCVN',
  MixSkuPolicy: LocationType === 'BIN' ? 'SAME_SKU' : 'MIXED',
  MixLotPolicy: LocationType === 'BIN' ? 'SAME_LOT' : 'MIXED',
  MixOwnerPolicy: 'SINGLE_OWNER',
});

const TouchAudit = <T extends { CreatedBy?: string | null; UpdatedBy?: string | null }>(
  entity: T,
  actorId: string | null,
): T => {
  entity.CreatedBy = entity.CreatedBy ?? actorId;
  entity.UpdatedBy = actorId;
  return entity;
};

export const SeedDemoDataCcLocationTree = async (dataSource: DataSource): Promise<DemoDataCcLocationTreeSeedResult> => {
  const plan = BuildDemoDataCcLocationTreePlan();
  const users = dataSource.getRepository(UserOrmEntity);
  const warehouses = dataSource.getRepository(WarehouseOrmEntity);
  const profiles = dataSource.getRepository(LocationProfileOrmEntity);
  const zones = dataSource.getRepository(ZoneOrmEntity);
  const locations = dataSource.getRepository(LocationOrmEntity);

  const admin = await users.findOne({ where: { EmailAddress: 'admin@example.com' } });
  const actorId = admin?.Id ?? null;
  const warehouse = await warehouses.findOne({ where: { WarehouseCode: plan.WarehouseCode } });
  if (!warehouse) {
    throw new Error(`DEMO-DATA-CC location seed requires warehouse ${plan.WarehouseCode}.`);
  }

  const profileByCode = new Map<string, LocationProfileOrmEntity>();
  for (const input of plan.Profiles) {
    let profile = await profiles.findOne({ where: { ProfileCode: input.ProfileCode } });
    if (!profile) {
      profile = new LocationProfileOrmEntity();
      profile.Id = randomUUID();
    }
    profile.ProfileCode = input.ProfileCode;
    profile.ProfileName = input.ProfileName;
    profile.LocationType = input.LocationType;
    profile.Version = 1;
    profile.Status = ActiveStatus;
    profile.CapacityPolicy = input.CapacityPolicy;
    profile.EligibilityPolicy = { ownerCodes: ['CCVN'] };
    profile.MixPolicy = { allowMultiSku: input.LocationType !== 'BIN', allowMultiLot: input.LocationType !== 'BIN' };
    profile.CompliancePolicy = { demo: true };
    profile.OperationPolicy = input.OperationPolicy;
    profile.SourceSystem = DemoSourceSystem;
    profile.ReferenceId = input.ProfileCode;
    const saved = await profiles.save(TouchAudit(profile, actorId));
    profileByCode.set(saved.ProfileCode, saved);
  }

  const zoneByCode = new Map<string, ZoneOrmEntity>();
  for (const input of plan.Zones) {
    let zone = await zones.findOne({ where: { WarehouseId: warehouse.Id, ZoneCode: input.ZoneCode } });
    if (!zone) {
      zone = new ZoneOrmEntity();
      zone.Id = randomUUID();
    }
    zone.WarehouseId = warehouse.Id;
    zone.ZoneCode = input.ZoneCode;
    zone.ZoneName = input.ZoneName;
    zone.ZoneType = input.ZoneType;
    zone.Status = ActiveStatus;
    zone.Sequence = input.Sequence;
    zone.TemperatureClass = 'AMBIENT';
    zone.ComplianceFlags = { demo: true };
    zone.SourceSystem = DemoSourceSystem;
    zone.ReferenceId = input.ZoneCode;
    const saved = await zones.save(TouchAudit(zone, actorId));
    zoneByCode.set(saved.ZoneCode, saved);
  }

  const locationByCode = new Map<string, LocationOrmEntity>();
  for (const input of plan.Locations) {
    const zone = zoneByCode.get(input.ZoneCode);
    const profile = profileByCode.get(input.ProfileCode);
    if (!zone || !profile) {
      throw new Error(`DEMO-DATA-CC location seed has unresolved zone/profile for ${input.LocationCode}.`);
    }

    let location = await locations.findOne({ where: { WarehouseId: warehouse.Id, LocationCode: input.LocationCode } });
    if (!location) {
      location = new LocationOrmEntity();
      location.Id = randomUUID();
    }
    location.WarehouseId = warehouse.Id;
    location.ZoneId = zone.Id;
    const parentLocation = input.ParentLocationCode ? locationByCode.get(input.ParentLocationCode) : null;
    if (input.ParentLocationCode && !parentLocation) {
      throw new Error(`DEMO-DATA-CC location seed parent not found for ${input.LocationCode}.`);
    }

    location.ParentLocationId = parentLocation?.Id ?? null;
    location.LocationCode = input.LocationCode;
    location.LocationName = input.LocationName;
    location.LocationType = input.LocationType;
    location.LocationProfileId = profile.Id;
    location.LocationStatus = EnabledLocationStatus;
    location.CapacityQty = input.CapacityQty ?? null;
    location.CapacityVolume = input.CapacityVolume ?? null;
    location.CapacityWeight = input.CapacityWeight ?? null;
    location.PalletSlot = input.PalletSlot ?? null;
    location.TemperatureClass = 'AMBIENT';
    location.DgCompatibilityGroup = null;
    location.BondedFlag = false;
    location.OwnerRestriction = input.OwnerRestriction ?? null;
    location.MixSkuPolicy = input.MixSkuPolicy ?? null;
    location.MixLotPolicy = input.MixLotPolicy ?? null;
    location.MixOwnerPolicy = input.MixOwnerPolicy ?? null;
    location.PickSequence = input.PickSequence ?? null;
    location.PutawaySequence = input.PutawaySequence ?? null;
    location.SourceSystem = DemoSourceSystem;
    location.ReferenceId = input.LocationCode;
    const saved = await locations.save(TouchAudit(location, actorId));
    locationByCode.set(saved.LocationCode, saved);
  }

  return {
    WarehouseCode: plan.WarehouseCode,
    ProfileCount: plan.Profiles.length,
    ZoneCount: plan.Zones.length,
    LocationCount: plan.Locations.length,
    SampleLocations: ['RSV-A01-R01-L01-B01', 'PF-A01-R01-L01-B01', 'LOAD-A01-D01'],
  };
};
