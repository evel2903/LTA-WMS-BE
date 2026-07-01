import { randomUUID } from 'crypto';
import type { DataSource } from 'typeorm';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';
import { OwnerOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/OwnerOrmEntity';
import { SiteOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SiteOrmEntity';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';
import { PartnerOrmEntity } from '@modules/PartnerMaster/Infrastructure/Persistence/Entities/PartnerOrmEntity';
import { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/AssignmentType';
import { WarehouseProfileOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileOrmEntity';
import { WarehouseProfileAssignmentOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileAssignmentOrmEntity';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';

const DemoSourceSystem = 'DEMO-DATA-LTA';
const MasterDataActiveStatus = 'Active';
const WarehouseProfileActiveStatus = 'ACTIVE';
const WarehouseTypeCode = 'WT-01';
export const DemoDataCcFoundationFlowSamples = ['WT-01'] as const;

export const BuildDemoDataCcFoundationCapabilityFlags = (): { demoData: true; flowSamples: string[] } => ({
  demoData: true,
  flowSamples: [...DemoDataCcFoundationFlowSamples],
});

export const AssertDemoDataCcWritableMasterDataRow = (
  entity: { SourceSystem?: string | null },
  label: string,
  code: string,
): void => {
  if (entity.SourceSystem !== DemoSourceSystem) {
    throw new Error(
      `DEMO-DATA-LTA foundation seed found existing non-demo ${label} ${code}. Run yarn.cmd demo-data:prepare or choose a demo-specific code before reseeding.`,
    );
  }
};

export type DemoDataCcFoundationSeedResult = {
  AdminEmail: string | null;
  SiteCode: string;
  WarehouseCode: string;
  OwnerCode: string;
  PartnerCodes: string[];
  WarehouseProfileCode: string;
  GoodsIssueTrigger: string;
};

const TouchAudit = <T extends { CreatedBy?: string | null; UpdatedBy?: string | null }>(
  entity: T,
  actorId: string | null,
): T => {
  entity.CreatedBy = entity.CreatedBy ?? actorId;
  entity.UpdatedBy = actorId;
  return entity;
};

export const SeedDemoDataCcFoundation = async (dataSource: DataSource): Promise<DemoDataCcFoundationSeedResult> => {
  const users = dataSource.getRepository(UserOrmEntity);
  const sites = dataSource.getRepository(SiteOrmEntity);
  const warehouses = dataSource.getRepository(WarehouseOrmEntity);
  const owners = dataSource.getRepository(OwnerOrmEntity);
  const partners = dataSource.getRepository(PartnerOrmEntity);
  const warehouseProfiles = dataSource.getRepository(WarehouseProfileOrmEntity);
  const assignments = dataSource.getRepository(WarehouseProfileAssignmentOrmEntity);

  const admin = await users.findOne({ where: { EmailAddress: 'admin@example.com' } });
  const actorId = admin?.Id ?? null;

  let site = await sites.findOne({ where: { SiteCode: 'LTA-SOUTH' } });
  if (!site) {
    site = new SiteOrmEntity();
    site.Id = randomUUID();
  } else {
    AssertDemoDataCcWritableMasterDataRow(site, 'site', 'LTA-SOUTH');
  }
  site.SiteCode = 'LTA-SOUTH';
  site.SiteName = 'Site Miền Nam';
  site.Status = MasterDataActiveStatus;
  site.SourceSystem = DemoSourceSystem;
  site.ReferenceId = 'LTA-SOUTH';
  await sites.save(TouchAudit(site, actorId));

  let warehouse = await warehouses.findOne({ where: { WarehouseCode: 'LTA-HCM-01' } });
  if (!warehouse) {
    warehouse = new WarehouseOrmEntity();
    warehouse.Id = randomUUID();
  } else {
    AssertDemoDataCcWritableMasterDataRow(warehouse, 'warehouse', 'LTA-HCM-01');
  }
  warehouse.SiteId = site.Id;
  warehouse.WarehouseCode = 'LTA-HCM-01';
  warehouse.WarehouseName = 'Kho LTA HCM';
  warehouse.WarehouseTypeCode = WarehouseTypeCode;
  warehouse.Status = MasterDataActiveStatus;
  warehouse.Timezone = 'Asia/Ho_Chi_Minh';
  warehouse.SourceSystem = DemoSourceSystem;
  warehouse.ReferenceId = 'LTA-HCM-01';
  await warehouses.save(TouchAudit(warehouse, actorId));

  let owner = await owners.findOne({ where: { OwnerCode: 'LTA' } });
  if (!owner) {
    owner = new OwnerOrmEntity();
    owner.Id = randomUUID();
  } else {
    AssertDemoDataCcWritableMasterDataRow(owner, 'owner', 'LTA');
  }
  owner.OwnerCode = 'LTA';
  owner.OwnerName = 'LTA Việt Nam';
  owner.Status = MasterDataActiveStatus;
  owner.BillingPolicy = { demo: true, currency: 'VND' };
  owner.VisibilityScope = { siteCode: site.SiteCode, warehouseCode: warehouse.WarehouseCode };
  owner.SourceSystem = DemoSourceSystem;
  owner.ReferenceId = 'LTA';
  await owners.save(TouchAudit(owner, actorId));

  const partnerInputs = [
    {
      PartnerCode: 'LTA-SUP-SEAL',
      PartnerName: 'Nhà máy LTA Thủ Đức',
      PartnerType: 'Supplier',
      ExternalReference: 'SUP-LTA-SEAL',
      ReferenceText: 'Nhà cung cấp demo LTA cho inbound',
    },
    {
      PartnerCode: 'LTA-CUS-SEAL',
      PartnerName: 'Khách hàng Modern Trade Miền Nam',
      PartnerType: 'Customer',
      ExternalReference: 'CUS-LTA-SEAL',
      ReferenceText: 'Khách hàng demo cho outbound',
    },
    {
      PartnerCode: 'LTA-CAR-3PL',
      PartnerName: 'Đối tác vận tải 3PL Miền Nam',
      PartnerType: 'Carrier',
      ExternalReference: 'CAR-LTA-3PL',
      ReferenceText: 'Nhà vận tải demo cho loading/goods issue',
    },
  ];

  for (const input of partnerInputs) {
    let partner = await partners.findOne({ where: { PartnerCode: input.PartnerCode } });
    if (!partner) {
      partner = new PartnerOrmEntity();
      partner.Id = randomUUID();
    } else {
      AssertDemoDataCcWritableMasterDataRow(partner, 'partner', input.PartnerCode);
    }
    partner.PartnerCode = input.PartnerCode;
    partner.PartnerName = input.PartnerName;
    partner.PartnerType = input.PartnerType;
    partner.Status = MasterDataActiveStatus;
    partner.SourceSystem = DemoSourceSystem;
    partner.ExternalReference = input.ExternalReference;
    partner.ReferenceText = input.ReferenceText;
    await partners.save(TouchAudit(partner, actorId));
  }

  const scopeKey = new ScopeKeyService().Build({
    WarehouseTypeCode,
    WarehouseId: warehouse.Id,
  });

  let profile = await warehouseProfiles.findOne({ where: { ProfileCode: 'WP-LTA-HCM-DEMO' } });
  if (!profile) {
    profile = new WarehouseProfileOrmEntity();
    profile.Id = randomUUID();
  } else {
    AssertDemoDataCcWritableMasterDataRow(profile, 'warehouse profile', 'WP-LTA-HCM-DEMO');
  }
  profile.ProfileCode = 'WP-LTA-HCM-DEMO';
  profile.ProfileName = 'Cấu hình demo Kho LTA HCM';
  profile.WarehouseTypeCode = WarehouseTypeCode;
  profile.Version = 1;
  profile.Status = WarehouseProfileActiveStatus;
  profile.WarehouseId = warehouse.Id;
  profile.ZoneId = null;
  profile.LocationType = null;
  profile.OwnerId = owner.Id;
  profile.SkuId = null;
  profile.ItemClass = null;
  profile.OrderType = null;
  profile.CustomerId = null;
  profile.SupplierId = null;
  profile.ScopeKey = scopeKey;
  profile.EffectiveFrom = new Date('2026-01-01T00:00:00.000Z');
  profile.EffectiveTo = null;
  profile.CapabilityFlags = BuildDemoDataCcFoundationCapabilityFlags();
  profile.StrategyPolicy = { goodsIssueTrigger: 'at_loading', allocationMode: 'single_warehouse' };
  profile.ThresholdPolicy = { pageSizeDefault: 50, pageSizeMax: 100 };
  profile.ApprovalPolicy = { useExistingApprovalFlow: true };
  profile.LabelDevicePolicy = { physicalPrinterRequired: false };
  profile.IntegrationPolicy = { liveConnectorEnabled: false };
  profile.AuditPolicy = { demoSeed: true, actor: 'admin@example.com' };
  profile.SourceSystem = DemoSourceSystem;
  profile.ReferenceId = 'WP-LTA-HCM-DEMO';
  await warehouseProfiles.save(TouchAudit(profile, actorId));

  let assignment = await assignments.findOne({
    where: {
      WarehouseProfileId: profile.Id,
      AssignmentType: AssignmentType.Warehouse,
      WarehouseId: warehouse.Id,
    },
  });
  if (!assignment) {
    assignment = new WarehouseProfileAssignmentOrmEntity();
    assignment.Id = randomUUID();
  } else {
    AssertDemoDataCcWritableMasterDataRow(assignment, 'warehouse profile assignment', 'LTA-HCM-01');
  }
  assignment.WarehouseProfileId = profile.Id;
  assignment.AssignmentType = AssignmentType.Warehouse;
  assignment.WarehouseTypeCode = WarehouseTypeCode;
  assignment.WarehouseId = warehouse.Id;
  assignment.ScopeKey = scopeKey;
  assignment.SourceSystem = DemoSourceSystem;
  assignment.ReferenceId = 'LTA-HCM-01';
  await assignments.save(TouchAudit(assignment, actorId));

  return {
    AdminEmail: admin?.EmailAddress ?? null,
    SiteCode: site.SiteCode,
    WarehouseCode: warehouse.WarehouseCode,
    OwnerCode: owner.OwnerCode,
    PartnerCodes: partnerInputs.map((partner) => partner.PartnerCode),
    WarehouseProfileCode: profile.ProfileCode,
    GoodsIssueTrigger: String(profile.StrategyPolicy.goodsIssueTrigger ?? 'at_loading'),
  };
};
