import { randomUUID } from 'crypto';
import dataSource from '@shared/Database/TypeOrmDataSource';
import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ActorType } from '@modules/AccessControl/Domain/Enums/ActorType';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { AuditWriter } from '@modules/AccessControl/Infrastructure/Audit/AuditWriter';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';
import { ReasonCodeCatalog } from '@modules/AccessControl/Application/Services/ReasonCodeCatalog';
import { ReasonCodeRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ReasonCodeRepository';
import { ReasonCodeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ReasonCodeOrmEntity';
import { CreateReasonCodeUseCase } from '@modules/AccessControl/Application/UseCases/CreateReasonCodeUseCase';

import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { MasterDataOwnershipPolicyRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/MasterDataOwnershipPolicyRepository';
import { MasterDataOwnershipPolicyOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/MasterDataOwnershipPolicyOrmEntity';
import { CreateSkuUseCase } from '@modules/MasterData/Application/UseCases/CreateSkuUseCase';
import { SkuRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/SkuRepository';
import { SkuOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SkuOrmEntity';
import { OwnerRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/OwnerRepository';
import { OwnerOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/OwnerOrmEntity';
import { UomRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/UomRepository';
import { UomOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/UomOrmEntity';
import { CreateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseUseCase';
import { WarehouseRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/WarehouseRepository';
import { WarehouseOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/WarehouseOrmEntity';
import { SiteRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/SiteRepository';
import { SiteOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/SiteOrmEntity';
import { ZoneRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/ZoneRepository';
import { ZoneOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/ZoneOrmEntity';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';

import { CreateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileUseCase';
import { WarehouseProfileRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/WarehouseProfileRepository';
import { WarehouseProfileOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileOrmEntity';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';

/**
 * C5 AC5 — live Postgres integration. Exercises the REAL wired use cases against real
 * repositories + the real AuditedTransaction (mutation and its audit row commit/rollback
 * in one DB transaction), proving:
 *  1. A6 hard-block (SOURCE_OF_TRUTH_READONLY) fires for an external source-of-truth group
 *     (SKU) and NO audit row is written for the rejected mutation.
 *  2. A WMS-owned MasterData create (Warehouse) writes exactly one Create audit row with the
 *     after-image, actor and resolved reason-code id (WarehouseLocation requires_reason=true).
 *  3. A WarehouseProfile (audit-only) DRAFT create writes one Create audit row.
 *
 * The ownership policy rows are the REAL DB-backed seed inside migration 1781627000000
 * (runMigrations populates master_data_ownership_policies). Skips gracefully with no DB so
 * `yarn test` stays green in DB-less environments. char(36) ids use randomUUID() so values
 * round-trip without blank-padding.
 */
describe('C5 AC5 audit on V0 mutations + A6 hard-block (live Postgres)', () => {
  let available = false;
  const writer = new AuditWriter();

  // Real, DB-backed collaborators shared across the three scenarios.
  let auditedTransaction: AuditedTransaction;
  let ownershipPolicy: MasterDataOwnershipPolicyService;
  let reasonCatalog: ReasonCodeCatalog;
  let reasonRepository: ReasonCodeRepository;

  const auditRepo = () => dataSource.getRepository(AuditLogOrmEntity);

  const context = (): AuditContext => ({
    ActorUserId: randomUUID(),
    ActorRoleCodes: ['WMS_ADMIN'],
    ActorType: ActorType.User,
    CorrelationId: randomUUID(),
    RequestId: randomUUID(),
    IpAddress: '127.0.0.1',
    UserAgent: 'jest-c5-integration',
  });

  beforeAll(async () => {
    try {
      if (!dataSource.isInitialized) await dataSource.initialize();
      await dataSource.runMigrations();
      available = true;
    } catch {
      available = false;

      console.warn('[C5AuditIntegrationSpec] No Postgres reachable — skipping live C5 audit assertions.');
    }
  });

  afterAll(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  beforeEach(() => {
    if (!available) return;
    auditedTransaction = new AuditedTransaction(dataSource, writer);
    reasonRepository = new ReasonCodeRepository(dataSource.getRepository(ReasonCodeOrmEntity));
    reasonCatalog = new ReasonCodeCatalog(reasonRepository);
    ownershipPolicy = new MasterDataOwnershipPolicyService(
      new MasterDataOwnershipPolicyRepository(dataSource.getRepository(MasterDataOwnershipPolicyOrmEntity)),
      reasonCatalog,
    );
  });

  // 1) A6 hard-block: SKU is an external source-of-truth (DirectEditAllowed=false) — direct
  //    Create must be rejected with SOURCE_OF_TRUTH_READONLY and write NO audit row.
  it('AC5: blocks direct SKU create (A6 SOURCE_OF_TRUTH_READONLY) and writes no audit row', async () => {
    if (!available) return;

    const skuCode = `C5-SKU-${randomUUID().slice(0, 8)}`;
    const useCase = new CreateSkuUseCase(
      new SkuRepository(dataSource.getRepository(SkuOrmEntity)),
      new OwnerRepository(dataSource.getRepository(OwnerOrmEntity)),
      new UomRepository(dataSource.getRepository(UomOrmEntity)),
      ownershipPolicy,
      auditedTransaction,
    );

    let caught: unknown;
    try {
      await useCase.Execute(
        {
          SkuCode: skuCode,
          SkuName: 'C5 blocked sku',
          ItemClass: 'GENERAL',
          ItemStatus: SkuStatus.Active,
          BaseUomId: randomUUID(),
          InventoryUomId: randomUUID(),
        },
        context(),
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ForbiddenAppException);
    expect((caught as ForbiddenAppException).Details).toMatchObject({ Reason: 'SOURCE_OF_TRUTH_READONLY' });

    // No SKU persisted and no audit row written for this object code.
    const skuRow = await dataSource.getRepository(SkuOrmEntity).findOne({ where: { SkuCode: skuCode } });
    expect(skuRow).toBeNull();
    const auditCount = await auditRepo().count({ where: { ObjectCode: skuCode } });
    expect(auditCount).toBe(0);
  });

  // 2) MasterData mutation + audit (Warehouse). WarehouseLocation A6 policy has
  //    requires_reason=true, so the create needs a valid reason code applicable to
  //    (Create, Warehouse). Setup: insert an active Site, create a valid reason code.
  it('AC5: warehouse create persists and writes exactly one Create audit row with reason + actor', async () => {
    if (!available) return;

    const ctx = context();
    const siteRepository = new SiteRepository(dataSource.getRepository(SiteOrmEntity));
    const warehouseRepository = new WarehouseRepository(dataSource.getRepository(WarehouseOrmEntity));

    // (a) Active site so the warehouse FK target exists.
    const now = new Date();
    const site = await siteRepository.Create(
      new SiteEntity({
        Id: randomUUID(),
        SiteCode: `C5-SITE-${randomUUID().slice(0, 8)}`,
        SiteName: 'C5 integration site',
        Status: MasterDataStatus.Active,
        CreatedAt: now,
        UpdatedAt: now,
      }),
    );

    // (b) A valid reason code applicable to (Create, Warehouse). Built via the REAL
    //     CreateReasonCodeUseCase so the catalog can later resolve it by code.
    const reasonCode = `C5-RSN-${randomUUID().slice(0, 8)}`;
    const createReason = new CreateReasonCodeUseCase(reasonRepository, auditedTransaction);
    const reason = await createReason.Execute(
      {
        ReasonCode: reasonCode,
        ReasonGroup: ReasonGroup.MasterDataConfigChange,
        Description: 'C5 warehouse create reason',
        AppliesToActions: [ActionCode.Create],
        AppliesToObjects: [ObjectType.Warehouse],
      },
      ctx,
    );

    const warehouseCode = `C5-WH-${randomUUID().slice(0, 8)}`;
    const useCase = new CreateWarehouseUseCase(
      warehouseRepository,
      siteRepository,
      ownershipPolicy,
      auditedTransaction,
    );

    const created = await useCase.Execute(
      {
        SiteId: site.Id,
        WarehouseCode: warehouseCode,
        WarehouseName: 'C5 integration warehouse',
        WarehouseTypeCode: 'DC',
        Status: MasterDataStatus.Active,
        ReasonCode: reasonCode,
      },
      ctx,
    );

    // Warehouse row persisted.
    const warehouseRow = await dataSource
      .getRepository(WarehouseOrmEntity)
      .findOne({ where: { WarehouseCode: warehouseCode } });
    expect(warehouseRow).not.toBeNull();
    expect(warehouseRow?.Id).toBe(created.Id);

    // Exactly one Create audit row for this warehouse, with after-image, actor, reason id.
    const auditRows = await auditRepo().find({
      where: { ObjectType: ObjectType.Warehouse, ObjectId: created.Id },
    });
    expect(auditRows).toHaveLength(1);
    const row = auditRows[0];
    expect(row.Action).toBe(ActionCode.Create);
    expect(row.ObjectCode).toBe(warehouseCode);
    expect(row.AfterJson).toMatchObject({ WarehouseCode: warehouseCode, WarehouseName: 'C5 integration warehouse' });
    expect(row.ActorUserId).toBe(ctx.ActorUserId);
    expect(row.ReasonCodeId).toBe(reason.Id);
  });

  // 3) WarehouseProfile mutation + audit. WP is audit-only (no reason needed). Create a DRAFT
  //    profile with a valid WarehouseTypeCode (AssertScopeReadiness only requires it be a
  //    non-blank string).
  it('AC5: warehouse-profile DRAFT create persists and writes one Create audit row', async () => {
    if (!available) return;

    const ctx = context();
    const profileRepository = new WarehouseProfileRepository(dataSource.getRepository(WarehouseProfileOrmEntity));
    const warehouseRepository = new WarehouseRepository(dataSource.getRepository(WarehouseOrmEntity));
    const zoneRepository = new ZoneRepository(dataSource.getRepository(ZoneOrmEntity));
    const ownerRepository = new OwnerRepository(dataSource.getRepository(OwnerOrmEntity));
    const skuRepository = new SkuRepository(dataSource.getRepository(SkuOrmEntity));

    const useCase = new CreateWarehouseProfileUseCase(
      profileRepository,
      warehouseRepository,
      zoneRepository,
      ownerRepository,
      skuRepository,
      new ScopeKeyService(),
      new WarehouseProfilePolicyValidator(),
      auditedTransaction,
    );

    const profileCode = `C5-WP-${randomUUID().slice(0, 8)}`;
    const created = await useCase.Execute(
      {
        ProfileCode: profileCode,
        ProfileName: 'C5 integration profile',
        WarehouseTypeCode: 'DC',
        EffectiveFrom: '2026-01-01',
      },
      ctx,
    );

    expect(created.Status).toBe('DRAFT');

    // Profile row persisted.
    const profileRow = await dataSource
      .getRepository(WarehouseProfileOrmEntity)
      .findOne({ where: { ProfileCode: profileCode } });
    expect(profileRow).not.toBeNull();
    expect(profileRow?.Id).toBe(created.Id);

    // Exactly one Create audit row for this profile.
    const auditRows = await auditRepo().find({
      where: { ObjectType: ObjectType.WarehouseProfile, ObjectId: created.Id },
    });
    expect(auditRows).toHaveLength(1);
    const row = auditRows[0];
    expect(row.Action).toBe(ActionCode.Create);
    expect(row.ObjectCode).toBe(profileCode);
    expect(row.ActorUserId).toBe(ctx.ActorUserId);
  });
});
