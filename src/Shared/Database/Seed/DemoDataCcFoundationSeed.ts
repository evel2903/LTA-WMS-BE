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

const DemoSourceSystem = 'DEMO-DATA-CC';
const ActiveStatus = 'ACTIVE';
const WarehouseTypeCode = 'WT-01';

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

  let site = await sites.findOne({ where: { SiteCode: 'CC-SOUTH' } });
  if (!site) {
    site = new SiteOrmEntity();
    site.Id = randomUUID();
  }
  site.SiteCode = 'CC-SOUTH';
  site.SiteName = 'Site Miền Nam';
  site.Status = ActiveStatus;
  site.SourceSystem = DemoSourceSystem;
  site.ReferenceId = 'CC-SOUTH';
  await sites.save(TouchAudit(site, actorId));

  let warehouse = await warehouses.findOne({ where: { WarehouseCode: 'CC-HCM-01' } });
  if (!warehouse) {
    warehouse = new WarehouseOrmEntity();
    warehouse.Id = randomUUID();
  }
  warehouse.SiteId = site.Id;
  warehouse.WarehouseCode = 'CC-HCM-01';
  warehouse.WarehouseName = 'Kho Coca-Cola HCM';
  warehouse.WarehouseTypeCode = WarehouseTypeCode;
  warehouse.Status = ActiveStatus;
  warehouse.Timezone = 'Asia/Ho_Chi_Minh';
  warehouse.SourceSystem = DemoSourceSystem;
  warehouse.ReferenceId = 'CC-HCM-01';
  await warehouses.save(TouchAudit(warehouse, actorId));

  let owner = await owners.findOne({ where: { OwnerCode: 'CCVN' } });
  if (!owner) {
    owner = new OwnerOrmEntity();
    owner.Id = randomUUID();
  }
  owner.OwnerCode = 'CCVN';
  owner.OwnerName = 'Coca-Cola Việt Nam';
  owner.Status = ActiveStatus;
  owner.BillingPolicy = { demo: true, currency: 'VND' };
  owner.VisibilityScope = { siteCode: site.SiteCode, warehouseCode: warehouse.WarehouseCode };
  owner.SourceSystem = DemoSourceSystem;
  owner.ReferenceId = 'CCVN';
  await owners.save(TouchAudit(owner, actorId));

  const partnerInputs = [
    {
      PartnerCode: 'CC-SUP-HCM',
      PartnerName: 'Nhà máy Coca-Cola Thủ Đức',
      PartnerType: 'SUPPLIER',
      ExternalReference: 'SUP-CC-HCM',
      ReferenceText: 'Nhà cung cấp demo Coca-Cola cho inbound',
    },
    {
      PartnerCode: 'CC-CUS-MT',
      PartnerName: 'Khách hàng Modern Trade Miền Nam',
      PartnerType: 'CUSTOMER',
      ExternalReference: 'CUS-CC-MT',
      ReferenceText: 'Khách hàng demo cho outbound',
    },
    {
      PartnerCode: 'CC-CAR-3PL',
      PartnerName: 'Đối tác vận tải 3PL Miền Nam',
      PartnerType: 'CARRIER',
      ExternalReference: 'CAR-CC-3PL',
      ReferenceText: 'Nhà vận tải demo cho loading/goods issue',
    },
  ];

  for (const input of partnerInputs) {
    let partner = await partners.findOne({ where: { PartnerCode: input.PartnerCode } });
    if (!partner) {
      partner = new PartnerOrmEntity();
      partner.Id = randomUUID();
    }
    partner.PartnerCode = input.PartnerCode;
    partner.PartnerName = input.PartnerName;
    partner.PartnerType = input.PartnerType;
    partner.Status = ActiveStatus;
    partner.SourceSystem = DemoSourceSystem;
    partner.ExternalReference = input.ExternalReference;
    partner.ReferenceText = input.ReferenceText;
    await partners.save(TouchAudit(partner, actorId));
  }

  const scopeKey = new ScopeKeyService().Build({
    WarehouseTypeCode,
    WarehouseId: warehouse.Id,
  });

  let profile = await warehouseProfiles.findOne({ where: { ProfileCode: 'WP-CC-HCM-DEMO' } });
  if (!profile) {
    profile = new WarehouseProfileOrmEntity();
    profile.Id = randomUUID();
  }
  profile.ProfileCode = 'WP-CC-HCM-DEMO';
  profile.ProfileName = 'Cấu hình demo Kho Coca-Cola HCM';
  profile.WarehouseTypeCode = WarehouseTypeCode;
  profile.Version = 1;
  profile.Status = ActiveStatus;
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
  profile.CapabilityFlags = { demoData: true, flowSamples: ['WT-01', 'WT-05', 'WT-06'] };
  profile.StrategyPolicy = { goodsIssueTrigger: 'at_loading', allocationMode: 'single_warehouse' };
  profile.ThresholdPolicy = { pageSizeDefault: 50, pageSizeMax: 100 };
  profile.ApprovalPolicy = { useExistingApprovalFlow: true };
  profile.LabelDevicePolicy = { physicalPrinterRequired: false };
  profile.IntegrationPolicy = { liveConnectorEnabled: false };
  profile.AuditPolicy = { demoSeed: true, actor: 'admin@example.com' };
  profile.SourceSystem = DemoSourceSystem;
  profile.ReferenceId = 'WP-CC-HCM-DEMO';
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
  }
  assignment.WarehouseProfileId = profile.Id;
  assignment.AssignmentType = AssignmentType.Warehouse;
  assignment.WarehouseTypeCode = WarehouseTypeCode;
  assignment.WarehouseId = warehouse.Id;
  assignment.ScopeKey = scopeKey;
  assignment.SourceSystem = DemoSourceSystem;
  assignment.ReferenceId = 'CC-HCM-01';
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
