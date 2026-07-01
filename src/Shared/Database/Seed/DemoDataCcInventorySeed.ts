import { createHash, randomUUID } from 'crypto';
import type { DataSource } from 'typeorm';
import { InventoryBalanceOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryBalanceOrmEntity';
import { InventoryDimensionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryDimensionOrmEntity';
import { InventoryStatusOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryStatusOrmEntity';
import { ItemCoverageOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ItemCoverageOrmEntity';
import { LocationOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/LocationOrmEntity';
import { OwnerOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/OwnerOrmEntity';
import { PackDefinitionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/PackDefinitionOrmEntity';
import { SkuBarcodeOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuBarcodeOrmEntity';
import { SkuOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuOrmEntity';
import { UomConversionOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomConversionOrmEntity';
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';

const DemoSourceSystem = 'DEMO-DATA-LTA';
const ActiveStatus = 'Active';
const EffectiveFrom = new Date('2026-01-01T00:00:00.000Z');

export const DemoDataCcForbiddenInventoryStatusCodes = [
  'SHIPPED',
  'GATE_OUT',
  'GOODS_ISSUE_POSTED',
  'RECONCILED',
  'INTEGRATION_SYNC_FAILED',
] as const;

type DemoDataCcUomSeed = {
  UomCode: string;
  UomName: string;
  UomType: string;
  DecimalPrecision: number;
};

type DemoDataCcPackSeed = {
  PackCode: string;
  PackName: string;
  UomCode: string;
  QuantityPerPack: number;
  IsDefault: boolean;
};

type DemoDataCcConversionSeed = {
  FromUomCode: string;
  ToUomCode: string;
  Factor: number;
};

type DemoDataCcBarcodeSeed = {
  BarcodeValue: string;
  UomCode: string;
  PackCode: string | null;
  IsPrimary: boolean;
};

export type DemoDataCcSkuSeed = {
  SkuCode: string;
  SkuName: string;
  BaseUomCode: string;
  InventoryUomCode: string;
  ItemClass: string;
  ShelfLifeDays: number;
  MinRemainingShelfLifeDays: number;
  Packs: DemoDataCcPackSeed[];
  Conversions: DemoDataCcConversionSeed[];
  Barcodes: DemoDataCcBarcodeSeed[];
  Coverage: {
    MinQty: number;
    MaxQty: number;
    StandardQty: number;
    MultipleQty: number;
    LeadTimeDays: number;
  };
};

export type DemoDataCcInventoryStatusSeed = {
  StatusCode: string;
  DisplayName: string;
  StageGroup: string;
  AllowsAllocation: boolean;
  AllowsPick: boolean;
  Hold: boolean;
  IsTerminal: boolean;
  IsMilestone: boolean;
  SortOrder: number;
};

export type DemoDataCcInventorySampleSeed = {
  SkuCode: string;
  LocationCode: string;
  InventoryStatusCode: string;
  UomCode: string;
  LpnCode: string;
  LotNumber: string;
  ProductionDate: string;
  ExpiryDate: string;
  QtyOnHand: number;
  QtyReserved: number;
};

export type DemoDataCcInventoryPlan = {
  WarehouseCode: string;
  OwnerCode: string;
  Uoms: DemoDataCcUomSeed[];
  Skus: DemoDataCcSkuSeed[];
  InventoryStatuses: DemoDataCcInventoryStatusSeed[];
  InventorySamples: DemoDataCcInventorySampleSeed[];
};

export type DemoDataCcInventorySeedResult = {
  WarehouseCode: string;
  OwnerCode: string;
  UomCount: number;
  SkuCount: number;
  InventoryStatusCount: number;
  InventoryDimensionCount: number;
  InventoryBalanceCount: number;
  SampleLpns: string[];
};

export const BuildDemoDataCcInventoryPlan = (): DemoDataCcInventoryPlan => ({
  WarehouseCode: 'LTA-HCM-01',
  OwnerCode: 'LTA',
  Uoms: [
    { UomCode: 'PCS', UomName: 'Cái', UomType: 'Quantity', DecimalPrecision: 0 },
    { UomCode: 'BOX', UomName: 'Hộp', UomType: 'Quantity', DecimalPrecision: 0 },
    { UomCode: 'CARTON', UomName: 'Thùng', UomType: 'Quantity', DecimalPrecision: 0 },
    { UomCode: 'PALLET', UomName: 'Pallet', UomType: 'Quantity', DecimalPrecision: 0 },
  ],
  Skus: [
    sku({
      SkuCode: 'LTA-SEAL-CABLE-001',
      SkuName: 'Seal cáp container LTA',
      BaseUomCode: 'PCS',
      BoxFactor: 100,
      CartonFactor: 10,
      PalletFactor: 40,
      BarcodeValue: '8938505980010',
    }),
    sku({
      SkuCode: 'LTA-SEAL-BOLT-001',
      SkuName: 'Seal cối container LTA',
      BaseUomCode: 'PCS',
      BoxFactor: 50,
      CartonFactor: 10,
      PalletFactor: 36,
      BarcodeValue: '8938505980027',
    }),
    sku({
      SkuCode: 'LTA-SEAL-PLASTIC-001',
      SkuName: 'Seal nhựa container LTA',
      BaseUomCode: 'PCS',
      BoxFactor: 200,
      CartonFactor: 8,
      PalletFactor: 30,
      BarcodeValue: '8938505980034',
    }),
    sku({
      SkuCode: 'LTA-SEAL-RFID-001',
      SkuName: 'Seal RFID container LTA',
      BaseUomCode: 'PCS',
      BoxFactor: 25,
      CartonFactor: 20,
      PalletFactor: 20,
      BarcodeValue: '8938505980041',
    }),
  ],
  InventoryStatuses: [
    invStatus('PENDING_RECEIPT', 'Chờ nhận hàng', 'Inbound', false, false, false, false, false, 10),
    invStatus('PENDING_QC', 'Chờ QC', 'Inbound', false, false, false, false, false, 20),
    invStatus('READY_FOR_PUTAWAY', 'Sẵn sàng putaway', 'Inbound', false, false, false, false, false, 30),
    invStatus('AVAILABLE', 'Có thể sử dụng', 'StorageControl', true, true, false, false, false, 100),
    invStatus('HOLD', 'Tạm giữ', 'StorageControl', false, false, true, false, false, 110),
    invStatus('QUARANTINE', 'Cách ly', 'StorageControl', false, false, true, false, false, 120),
    invStatus('DAMAGED', 'Hư hỏng', 'StorageControl', false, false, true, false, false, 130),
    invStatus('REJECTED', 'Từ chối', 'StorageControl', false, false, true, false, false, 140),
    invStatus('ALLOCATED', 'Đã cấp phát', 'Outbound', false, true, false, false, false, 200),
    invStatus('RELEASED', 'Đã phát hành', 'Outbound', false, true, false, false, false, 210),
    invStatus('PICK_IN_PROGRESS', 'Đang soạn hàng', 'Outbound', false, false, false, false, false, 220),
    invStatus('PICKED', 'Đã soạn hàng', 'Outbound', false, false, false, false, false, 230),
    invStatus('PACKED', 'Đã đóng gói', 'Outbound', false, false, false, false, false, 250),
    invStatus('READY_FOR_STAGING', 'Sẵn sàng staging', 'Outbound', false, false, false, false, false, 260),
    invStatus('STAGED', 'Đã staging', 'ShippingPackageLoad', false, false, false, false, false, 300),
    invStatus('LOADING_IN_PROGRESS', 'Đang lên xe', 'ShippingPackageLoad', false, false, false, false, false, 310),
    invStatus('LOADED', 'Đã lên xe', 'ShippingPackageLoad', false, false, false, false, false, 320),
  ],
  InventorySamples: [
    sample(
      'LTA-SEAL-CABLE-001',
      'RSV-A01-R01-L01-B01',
      'AVAILABLE',
      'BOX',
      'LTA-LPN-0001',
      'LTA-SEAL-BATCH-260601',
      '2026-06-01',
      '2031-06-01',
      120,
      0,
    ),
    sample(
      'LTA-SEAL-CABLE-001',
      'PF-A01-R01-L01-B01',
      'AVAILABLE',
      'BOX',
      'LTA-LPN-0002',
      'LTA-SEAL-BATCH-260615',
      '2026-06-15',
      '2031-06-15',
      36,
      0,
    ),
    sample(
      'LTA-SEAL-CABLE-001',
      'PF-A01-R01-L01-B01',
      'ALLOCATED',
      'BOX',
      'LTA-LPN-0003',
      'LTA-SEAL-BATCH-260615',
      '2026-06-15',
      '2031-06-15',
      24,
      24,
    ),
    sample(
      'LTA-SEAL-BOLT-001',
      'RSV-A01-R01-L01-B02',
      'AVAILABLE',
      'BOX',
      'LTA-LPN-0004',
      'LTA-SEAL-BATCH-260701',
      '2026-07-01',
      '2031-07-01',
      96,
      0,
    ),
    sample(
      'LTA-SEAL-PLASTIC-001',
      'RSV-A01-R02-L01-B01',
      'AVAILABLE',
      'BOX',
      'LTA-LPN-0005',
      'LTA-SEAL-BATCH-260731',
      '2026-07-31',
      '2031-07-31',
      80,
      0,
    ),
    sample(
      'LTA-SEAL-RFID-001',
      'QC-A01-STG01',
      'PENDING_QC',
      'BOX',
      'LTA-LPN-0006',
      'LTA-SEAL-BATCH-260801',
      '2026-08-01',
      '2031-08-01',
      30,
      0,
    ),
    sample(
      'LTA-SEAL-CABLE-001',
      'QAR-A01-HOLD01',
      'HOLD',
      'BOX',
      'LTA-LPN-0007',
      'LTA-SEAL-BATCH-260501',
      '2026-05-01',
      '2031-05-01',
      12,
      0,
    ),
  ],
});

export const ShouldReuseExistingDemoDataCcCatalogRow = (
  entity: { SourceSystem: string | null | undefined } | null | undefined,
): boolean => Boolean(entity && entity.SourceSystem !== DemoSourceSystem);

export const AssertDemoDataCcWritableInventoryRow = (
  entity: { SourceSystem: string | null | undefined } | null | undefined,
  label: string,
  code: string,
): void => {
  if (!entity || entity.SourceSystem === DemoSourceSystem) return;

  throw new Error(
    `DEMO-DATA-LTA inventory seed found existing non-demo ${label} ${code}. Run yarn.cmd demo-data:prepare or choose a demo-specific code before reseeding.`,
  );
};

export const AssertReusableDemoDataCcUomCatalogRow = (entity: UomOrmEntity, input: DemoDataCcUomSeed): void => {
  if (!ShouldReuseExistingDemoDataCcCatalogRow(entity)) return;

  const mismatches: string[] = [];
  if (entity.UomCode !== input.UomCode) mismatches.push('UomCode');
  if (entity.UomType !== input.UomType) mismatches.push('UomType');
  if (Number(entity.DecimalPrecision) !== input.DecimalPrecision) mismatches.push('DecimalPrecision');
  if (entity.Status !== ActiveStatus) mismatches.push('Status');

  if (mismatches.length > 0) {
    throw new Error(
      `DEMO-DATA-LTA inventory seed cannot reuse baseline UOM ${input.UomCode}; mismatched fields: ${mismatches.join(', ')}.`,
    );
  }
};

export const AssertReusableDemoDataCcInventoryStatusCatalogRow = (
  entity: InventoryStatusOrmEntity,
  input: DemoDataCcInventoryStatusSeed,
): void => {
  if (!ShouldReuseExistingDemoDataCcCatalogRow(entity)) return;

  const mismatches: string[] = [];
  if (entity.StatusCode !== input.StatusCode) mismatches.push('StatusCode');
  if (entity.StageGroup !== input.StageGroup) mismatches.push('StageGroup');
  if (entity.AllowsAllocation !== input.AllowsAllocation) mismatches.push('AllowsAllocation');
  if (entity.AllowsPick !== input.AllowsPick) mismatches.push('AllowsPick');
  if (entity.Hold !== input.Hold) mismatches.push('Hold');
  if (entity.IsTerminal !== input.IsTerminal) mismatches.push('IsTerminal');
  if (entity.IsMilestone !== input.IsMilestone) mismatches.push('IsMilestone');
  if (entity.Status !== ActiveStatus) mismatches.push('Status');

  if (mismatches.length > 0) {
    throw new Error(
      `DEMO-DATA-LTA inventory seed cannot reuse baseline inventory status ${input.StatusCode}; mismatched fields: ${mismatches.join(', ')}.`,
    );
  }
};

const sku = (input: {
  SkuCode: string;
  SkuName: string;
  BaseUomCode: 'PCS';
  BoxFactor: number;
  CartonFactor: number;
  PalletFactor: number;
  BarcodeValue: string;
}): DemoDataCcSkuSeed => ({
  SkuCode: input.SkuCode,
  SkuName: input.SkuName,
  BaseUomCode: input.BaseUomCode,
  InventoryUomCode: 'BOX',
  ItemClass: 'CONTAINER_SEAL',
  ShelfLifeDays: 1825,
  MinRemainingShelfLifeDays: 90,
  Packs: [
    {
      PackCode: 'BOX',
      PackName: `${input.SkuName} - hộp ${input.BoxFactor}`,
      UomCode: 'BOX',
      QuantityPerPack: input.BoxFactor,
      IsDefault: true,
    },
    {
      PackCode: 'CARTON',
      PackName: `${input.SkuName} - thùng ${input.CartonFactor} hộp`,
      UomCode: 'CARTON',
      QuantityPerPack: input.CartonFactor,
      IsDefault: false,
    },
    {
      PackCode: 'PALLET',
      PackName: `${input.SkuName} - pallet ${input.PalletFactor} hộp`,
      UomCode: 'PALLET',
      QuantityPerPack: input.PalletFactor,
      IsDefault: false,
    },
  ],
  Conversions: [
    { FromUomCode: 'BOX', ToUomCode: input.BaseUomCode, Factor: input.BoxFactor },
    { FromUomCode: 'CARTON', ToUomCode: 'BOX', Factor: input.CartonFactor },
    { FromUomCode: 'PALLET', ToUomCode: 'BOX', Factor: input.PalletFactor },
  ],
  Barcodes: [
    {
      BarcodeValue: input.BarcodeValue,
      UomCode: 'BOX',
      PackCode: 'BOX',
      IsPrimary: true,
    },
  ],
  Coverage: {
    MinQty: 20,
    MaxQty: 240,
    StandardQty: 80,
    MultipleQty: 10,
    LeadTimeDays: 2,
  },
});

const invStatus = (
  StatusCode: string,
  DisplayName: string,
  StageGroup: string,
  AllowsAllocation: boolean,
  AllowsPick: boolean,
  Hold: boolean,
  IsTerminal: boolean,
  IsMilestone: boolean,
  SortOrder: number,
): DemoDataCcInventoryStatusSeed => ({
  StatusCode,
  DisplayName,
  StageGroup,
  AllowsAllocation,
  AllowsPick,
  Hold,
  IsTerminal,
  IsMilestone,
  SortOrder,
});

const sample = (
  SkuCode: string,
  LocationCode: string,
  InventoryStatusCode: string,
  UomCode: string,
  LpnCode: string,
  LotNumber: string,
  ProductionDate: string,
  ExpiryDate: string,
  QtyOnHand: number,
  QtyReserved: number,
): DemoDataCcInventorySampleSeed => ({
  SkuCode,
  LocationCode,
  InventoryStatusCode,
  UomCode,
  LpnCode,
  LotNumber,
  ProductionDate,
  ExpiryDate,
  QtyOnHand,
  QtyReserved,
});

export const BuildDemoDataCcInventoryDimensionHash = (input: {
  OwnerId: string;
  SkuId: string;
  WarehouseId: string;
  LocationId: string;
  InventoryStatusId: string;
  UomId: string | null;
  LpnCode: string | null;
  LotNumber: string | null;
  ExpiryDate: string | null;
}): string => {
  const key = [
    input.OwnerId,
    input.SkuId,
    input.WarehouseId,
    input.LocationId,
    input.InventoryStatusId,
    input.UomId ?? '',
    input.LpnCode ?? '',
    input.LotNumber ?? '',
    input.ExpiryDate ?? '',
  ].join('|');

  return createHash('sha256').update(key).digest('hex');
};

const TouchAudit = <T extends { CreatedBy?: string | null; UpdatedBy?: string | null }>(
  entity: T,
  actorId: string | null,
): T => {
  entity.CreatedBy = entity.CreatedBy ?? actorId;
  entity.UpdatedBy = actorId;
  return entity;
};

const Required = <T>(value: T | undefined, message: string): T => {
  if (!value) {
    throw new Error(message);
  }

  return value;
};

export const SeedDemoDataCcInventory = async (dataSource: DataSource): Promise<DemoDataCcInventorySeedResult> => {
  const plan = BuildDemoDataCcInventoryPlan();
  const forbidden = new Set<string>(DemoDataCcForbiddenInventoryStatusCodes);
  const forbiddenInPlan = plan.InventoryStatuses.filter((status) => forbidden.has(status.StatusCode));
  if (forbiddenInPlan.length > 0) {
    throw new Error(`DEMO-DATA-LTA inventory seed contains forbidden statuses: ${forbiddenInPlan.join(', ')}`);
  }

  const users = dataSource.getRepository(UserOrmEntity);
  const owners = dataSource.getRepository(OwnerOrmEntity);
  const warehouses = dataSource.getRepository(WarehouseOrmEntity);
  const locations = dataSource.getRepository(LocationOrmEntity);
  const uoms = dataSource.getRepository(UomOrmEntity);
  const skus = dataSource.getRepository(SkuOrmEntity);
  const packs = dataSource.getRepository(PackDefinitionOrmEntity);
  const conversions = dataSource.getRepository(UomConversionOrmEntity);
  const barcodes = dataSource.getRepository(SkuBarcodeOrmEntity);
  const coverages = dataSource.getRepository(ItemCoverageOrmEntity);
  const inventoryStatuses = dataSource.getRepository(InventoryStatusOrmEntity);
  const dimensions = dataSource.getRepository(InventoryDimensionOrmEntity);
  const balances = dataSource.getRepository(InventoryBalanceOrmEntity);

  const admin = await users.findOne({ where: { EmailAddress: 'admin@example.com' } });
  const actorId = admin?.Id ?? null;
  const owner = await owners.findOne({ where: { OwnerCode: plan.OwnerCode } });
  const warehouse = await warehouses.findOne({ where: { WarehouseCode: plan.WarehouseCode } });
  if (!owner || !warehouse) {
    throw new Error(
      `DEMO-DATA-LTA inventory seed requires owner ${plan.OwnerCode} and warehouse ${plan.WarehouseCode}.`,
    );
  }

  const uomByCode = new Map<string, UomOrmEntity>();
  for (const input of plan.Uoms) {
    let uom = await uoms.findOne({ where: { UomCode: input.UomCode } });
    if (uom && ShouldReuseExistingDemoDataCcCatalogRow(uom)) {
      AssertReusableDemoDataCcUomCatalogRow(uom, input);
      uomByCode.set(uom.UomCode, uom);
      continue;
    }
    if (!uom) {
      uom = new UomOrmEntity();
      uom.Id = randomUUID();
    }
    uom.UomCode = input.UomCode;
    uom.UomName = input.UomName;
    uom.UomType = input.UomType;
    uom.DecimalPrecision = input.DecimalPrecision;
    uom.Status = ActiveStatus;
    uom.SourceSystem = DemoSourceSystem;
    uom.ReferenceId = input.UomCode;
    const saved = await uoms.save(TouchAudit(uom, actorId));
    uomByCode.set(saved.UomCode, saved);
  }

  const inventoryStatusByCode = new Map<string, InventoryStatusOrmEntity>();
  for (const input of plan.InventoryStatuses) {
    let status = await inventoryStatuses.findOne({ where: { StatusCode: input.StatusCode } });
    if (status && ShouldReuseExistingDemoDataCcCatalogRow(status)) {
      AssertReusableDemoDataCcInventoryStatusCatalogRow(status, input);
      inventoryStatusByCode.set(status.StatusCode, status);
      continue;
    }
    if (!status) {
      status = new InventoryStatusOrmEntity();
      status.Id = randomUUID();
    }
    status.StatusCode = input.StatusCode;
    status.DisplayName = input.DisplayName;
    status.StageGroup = input.StageGroup;
    status.AllowsAllocation = input.AllowsAllocation;
    status.AllowsPick = input.AllowsPick;
    status.Hold = input.Hold;
    status.IsTerminal = input.IsTerminal;
    status.IsMilestone = input.IsMilestone;
    status.SortOrder = input.SortOrder;
    status.Status = ActiveStatus;
    status.SourceSystem = DemoSourceSystem;
    status.ReferenceId = input.StatusCode;
    const saved = await inventoryStatuses.save(TouchAudit(status, actorId));
    inventoryStatusByCode.set(saved.StatusCode, saved);
  }

  const skuByCode = new Map<string, SkuOrmEntity>();
  for (const input of plan.Skus) {
    const baseUom = Required(uomByCode.get(input.BaseUomCode), `Missing base UOM ${input.BaseUomCode}.`);
    const inventoryUom = Required(
      uomByCode.get(input.InventoryUomCode),
      `Missing inventory UOM ${input.InventoryUomCode}.`,
    );
    let entity = await skus.findOne({ where: { SkuCode: input.SkuCode } });
    AssertDemoDataCcWritableInventoryRow(entity, 'SKU', input.SkuCode);
    if (!entity) {
      entity = new SkuOrmEntity();
      entity.Id = randomUUID();
    }
    entity.SkuCode = input.SkuCode;
    entity.SkuName = input.SkuName;
    entity.DefaultOwnerId = owner.Id;
    entity.ItemClass = input.ItemClass;
    entity.ItemStatus = ActiveStatus;
    entity.BaseUomId = baseUom.Id;
    entity.InventoryUomId = inventoryUom.Id;
    entity.LotControlled = true;
    entity.ExpiryControlled = true;
    entity.SerialControlled = false;
    entity.OwnerControlled = true;
    entity.LpnControlled = true;
    entity.TemperatureControlled = false;
    entity.DgControlled = false;
    entity.CustomsControlled = false;
    entity.QcRequired = true;
    entity.TemperatureClass = 'AMBIENT';
    entity.DgClass = null;
    entity.BondedFlag = false;
    entity.ShelfLifeDays = input.ShelfLifeDays;
    entity.MinRemainingShelfLifeDays = input.MinRemainingShelfLifeDays;
    entity.SourceSystem = DemoSourceSystem;
    entity.ReferenceId = input.SkuCode;
    const saved = await skus.save(TouchAudit(entity, actorId));
    skuByCode.set(saved.SkuCode, saved);

    for (const packInput of input.Packs) {
      const packUom = Required(uomByCode.get(packInput.UomCode), `Missing pack UOM ${packInput.UomCode}.`);
      let pack = await packs.findOne({ where: { SkuId: saved.Id, PackCode: packInput.PackCode } });
      AssertDemoDataCcWritableInventoryRow(pack, 'pack definition', `${saved.SkuCode}:${packInput.PackCode}`);
      if (!pack) {
        pack = new PackDefinitionOrmEntity();
        pack.Id = randomUUID();
      }
      pack.SkuId = saved.Id;
      pack.PackCode = packInput.PackCode;
      pack.PackName = packInput.PackName;
      pack.UomId = packUom.Id;
      pack.QuantityPerPack = packInput.QuantityPerPack;
      pack.IsDefault = packInput.IsDefault;
      pack.Status = ActiveStatus;
      pack.SourceSystem = DemoSourceSystem;
      pack.ReferenceId = `${saved.SkuCode}:${packInput.PackCode}`;
      await packs.save(TouchAudit(pack, actorId));
    }

    for (const conversionInput of input.Conversions) {
      const fromUom = Required(
        uomByCode.get(conversionInput.FromUomCode),
        `Missing from UOM ${conversionInput.FromUomCode}.`,
      );
      const toUom = Required(uomByCode.get(conversionInput.ToUomCode), `Missing to UOM ${conversionInput.ToUomCode}.`);
      let conversion = await conversions.findOne({
        where: {
          SkuId: saved.Id,
          FromUomId: fromUom.Id,
          ToUomId: toUom.Id,
        },
      });
      AssertDemoDataCcWritableInventoryRow(
        conversion,
        'UOM conversion',
        `${saved.SkuCode}:${conversionInput.FromUomCode}:${conversionInput.ToUomCode}`,
      );
      if (!conversion) {
        conversion = new UomConversionOrmEntity();
        conversion.Id = randomUUID();
      }
      conversion.SkuId = saved.Id;
      conversion.FromUomId = fromUom.Id;
      conversion.ToUomId = toUom.Id;
      conversion.Factor = conversionInput.Factor;
      conversion.EffectiveFrom = EffectiveFrom;
      conversion.EffectiveTo = null;
      conversion.Status = ActiveStatus;
      conversion.SourceSystem = DemoSourceSystem;
      conversion.ReferenceId = `${saved.SkuCode}:${conversionInput.FromUomCode}:${conversionInput.ToUomCode}`;
      await conversions.save(TouchAudit(conversion, actorId));
    }

    for (const barcodeInput of input.Barcodes) {
      const barcodeUom = Required(uomByCode.get(barcodeInput.UomCode), `Missing barcode UOM ${barcodeInput.UomCode}.`);
      let barcode = await barcodes.findOne({
        where: {
          OwnerId: owner.Id,
          BarcodeValue: barcodeInput.BarcodeValue,
        },
      });
      AssertDemoDataCcWritableInventoryRow(barcode, 'SKU barcode', `${owner.OwnerCode}:${barcodeInput.BarcodeValue}`);
      if (!barcode) {
        barcode = new SkuBarcodeOrmEntity();
        barcode.Id = randomUUID();
      }
      barcode.SkuId = saved.Id;
      barcode.OwnerId = owner.Id;
      barcode.UomId = barcodeUom.Id;
      barcode.PackCode = barcodeInput.PackCode;
      barcode.BarcodeValue = barcodeInput.BarcodeValue;
      barcode.BarcodeType = 'EAN13';
      barcode.IsPrimary = barcodeInput.IsPrimary;
      barcode.Status = ActiveStatus;
      barcode.EffectiveFrom = EffectiveFrom;
      barcode.EffectiveTo = null;
      barcode.SourceSystem = DemoSourceSystem;
      barcode.ReferenceId = `${saved.SkuCode}:${barcodeInput.BarcodeValue}`;
      await barcodes.save(TouchAudit(barcode, actorId));
    }

    let coverage = await coverages.findOne({
      where: {
        SkuId: saved.Id,
        WarehouseId: warehouse.Id,
        OwnerId: owner.Id,
      },
    });
    AssertDemoDataCcWritableInventoryRow(coverage, 'item coverage', `${saved.SkuCode}:${warehouse.WarehouseCode}`);
    if (!coverage) {
      coverage = new ItemCoverageOrmEntity();
      coverage.Id = randomUUID();
    }
    coverage.SkuId = saved.Id;
    coverage.WarehouseId = warehouse.Id;
    coverage.OwnerId = owner.Id;
    coverage.MinQty = input.Coverage.MinQty;
    coverage.MaxQty = input.Coverage.MaxQty;
    coverage.StandardQty = input.Coverage.StandardQty;
    coverage.MultipleQty = input.Coverage.MultipleQty;
    coverage.LeadTimeDays = input.Coverage.LeadTimeDays;
    coverage.DefaultReceiveWarehouseId = warehouse.Id;
    coverage.DefaultShipWarehouseId = warehouse.Id;
    coverage.ReorderPolicy = { demo: true, mode: 'min-max' };
    coverage.StopReceiving = false;
    coverage.StopShipping = false;
    coverage.Status = ActiveStatus;
    coverage.SourceSystem = DemoSourceSystem;
    coverage.ReferenceId = `${saved.SkuCode}:${warehouse.WarehouseCode}:${owner.OwnerCode}`;
    await coverages.save(TouchAudit(coverage, actorId));
  }

  const locationByCode = new Map<string, LocationOrmEntity>();
  const requiredLocationCodes = [...new Set(plan.InventorySamples.map((inventory) => inventory.LocationCode))];
  for (const locationCode of requiredLocationCodes) {
    const location = await locations.findOne({ where: { WarehouseId: warehouse.Id, LocationCode: locationCode } });
    if (!location) {
      throw new Error(`DEMO-DATA-LTA inventory seed requires location ${locationCode}.`);
    }
    AssertDemoDataCcWritableInventoryRow(location, 'location', `${warehouse.WarehouseCode}:${locationCode}`);
    locationByCode.set(location.LocationCode, location);
  }

  for (const input of plan.InventorySamples) {
    const skuEntity = Required(skuByCode.get(input.SkuCode), `Missing SKU ${input.SkuCode}.`);
    const location = Required(locationByCode.get(input.LocationCode), `Missing location ${input.LocationCode}.`);
    const status = Required(
      inventoryStatusByCode.get(input.InventoryStatusCode),
      `Missing inventory status ${input.InventoryStatusCode}.`,
    );
    const uom = Required(uomByCode.get(input.UomCode), `Missing inventory sample UOM ${input.UomCode}.`);
    const dimensionHash = BuildDemoDataCcInventoryDimensionHash({
      OwnerId: owner.Id,
      SkuId: skuEntity.Id,
      WarehouseId: warehouse.Id,
      LocationId: location.Id,
      InventoryStatusId: status.Id,
      UomId: uom.Id,
      LpnCode: input.LpnCode,
      LotNumber: input.LotNumber,
      ExpiryDate: input.ExpiryDate,
    });

    let dimension = await dimensions.findOne({ where: { DimensionKeyHash: dimensionHash } });
    AssertDemoDataCcWritableInventoryRow(dimension, 'inventory dimension', input.LpnCode);
    if (!dimension) {
      dimension = new InventoryDimensionOrmEntity();
      dimension.Id = randomUUID();
    }
    dimension.OwnerId = owner.Id;
    dimension.SkuId = skuEntity.Id;
    dimension.WarehouseId = warehouse.Id;
    dimension.LocationId = location.Id;
    dimension.InventoryStatusId = status.Id;
    dimension.DimensionKeyHash = dimensionHash;
    dimension.UomId = uom.Id;
    dimension.LpnCode = input.LpnCode;
    dimension.LotNumber = input.LotNumber;
    dimension.ExpiryDate = new Date(`${input.ExpiryDate}T00:00:00.000Z`);
    dimension.SerialNumber = null;
    dimension.ProductionDate = new Date(`${input.ProductionDate}T00:00:00.000Z`);
    dimension.CountryOfOrigin = 'VN';
    dimension.CustomsStatus = 'DOMESTIC';
    dimension.SourceSystem = DemoSourceSystem;
    dimension.ReferenceId = input.LpnCode;
    const savedDimension = await dimensions.save(TouchAudit(dimension, actorId));

    let balance = await balances.findOne({ where: { DimensionId: savedDimension.Id } });
    AssertDemoDataCcWritableInventoryRow(balance, 'inventory balance', input.LpnCode);
    if (!balance) {
      balance = new InventoryBalanceOrmEntity();
      balance.Id = randomUUID();
    }
    balance.DimensionId = savedDimension.Id;
    balance.QtyOnHand = input.QtyOnHand;
    balance.QtyReserved = input.QtyReserved;
    balance.QtyAvailable = input.QtyOnHand - input.QtyReserved;
    balance.SourceSystem = DemoSourceSystem;
    balance.ReferenceId = input.LpnCode;
    await balances.save(TouchAudit(balance, actorId));
  }

  return {
    WarehouseCode: plan.WarehouseCode,
    OwnerCode: plan.OwnerCode,
    UomCount: plan.Uoms.length,
    SkuCount: plan.Skus.length,
    InventoryStatusCount: plan.InventoryStatuses.length,
    InventoryDimensionCount: plan.InventorySamples.length,
    InventoryBalanceCount: plan.InventorySamples.length,
    SampleLpns: plan.InventorySamples.map((inventory) => inventory.LpnCode),
  };
};
