import 'dotenv/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import dataSource from '@shared/Database/TypeOrmDataSource';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';
import { SeedRuleGroupCatalog } from '@modules/WarehouseProfile/Application/Services/RuleGroupCatalogSeed';
import { SeedInboundRuleBaseline } from '@modules/WarehouseProfile/Application/Services/InboundRuleBaselineSeed';
import { RuleGroupRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/RuleGroupRepository';
import { RuleGroupOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleGroupOrmEntity';
import { RuleDefinitionRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/RuleDefinitionRepository';
import { RuleDefinitionOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleDefinitionOrmEntity';
import { WarehouseProfileRuleRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/WarehouseProfileRuleRepository';
import { WarehouseProfileRuleOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileRuleOrmEntity';
import { WarehouseProfileRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/WarehouseProfileRepository';
import { WarehouseProfileOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileOrmEntity';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { BridgeLegacyUserRoles } from '@modules/AccessControl/Application/Services/LegacyRoleBridge';
import { RoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RoleRepository';
import { PermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/PermissionRepository';
import { RolePermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RolePermissionRepository';
import { UserRoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/UserRoleRepository';
import { RoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RoleOrmEntity';
import { RoleCatalogRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RoleCatalogRepository';
import { PermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/PermissionOrmEntity';
import { RolePermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RolePermissionOrmEntity';
import { UserRoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/UserRoleOrmEntity';
import { SeedAdminDataScopes } from '@modules/AccessControl/Application/Services/DataScopeSeed';
import { DataScopeRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/DataScopeRepository';
import { DataScopeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/DataScopeOrmEntity';
import { SeedReasonCodeCatalog } from '@modules/AccessControl/Application/Services/ReasonCodeCatalogSeed';
import { ReasonCodeRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ReasonCodeRepository';
import { ReasonCodeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ReasonCodeOrmEntity';
import { SeedControlExceptionCatalog } from '@modules/AccessControl/Application/Services/ControlExceptionCatalogSeed';
import { SeedValidationRuleCatalog } from '@modules/AccessControl/Application/Services/ValidationRuleCatalogSeed';
import { ControlExceptionCatalogRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ControlExceptionCatalogRepository';
import { ValidationRuleCatalogRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ValidationRuleCatalogRepository';
import { ControlExceptionCatalogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ControlExceptionCatalogOrmEntity';
import { ValidationRuleCatalogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ValidationRuleCatalogOrmEntity';

const GetRequired = (key: string, value: string | undefined): string => {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

async function Seed() {
  await dataSource.initialize();
  try {
    const users = dataSource.getRepository(UserOrmEntity);

    const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com').trim().toLowerCase();
    const adminPassword = GetRequired('SEED_ADMIN_PASSWORD', process.env.SEED_ADMIN_PASSWORD);

    const existing = await users.findOne({ where: { EmailAddress: adminEmail } });
    if (existing) {
      console.log(`Seed: admin already exists (${adminEmail})`);
    } else {
      const admin = new UserOrmEntity();
      admin.Id = randomUUID();
      admin.FirstName = 'Admin';
      admin.LastName = 'User';
      admin.EmailAddress = adminEmail;
      admin.PasswordHash = await bcrypt.hash(adminPassword, 10);
      admin.Role = 'Admin';
      admin.CreatedAt = new Date();

      await users.save(admin);
      console.log(`Seed: created admin (${adminEmail})`);
    }

    // Idempotent rule group catalog seed (R-MD/R-RBAC/R-COM/R-INT/R-INBOUND/R-PUT active + remaining V1+ placeholders).
    const ruleGroupRepository = new RuleGroupRepository(dataSource.getRepository(RuleGroupOrmEntity));
    await SeedRuleGroupCatalog(ruleGroupRepository);
    console.log('Seed: rule group catalog ensured');

    // Idempotent Epic 24 (IN-RULE-24) baseline: one rule per inbound/putaway decision point,
    // bound to the WT-01 demo profile (WP-LTA-HCM-DEMO) if it exists. No-ops (does not throw)
    // when the demo profile has not been seeded yet.
    const ruleDefinitionRepository = new RuleDefinitionRepository(dataSource.getRepository(RuleDefinitionOrmEntity));
    const warehouseProfileRuleRepository = new WarehouseProfileRuleRepository(
      dataSource.getRepository(WarehouseProfileRuleOrmEntity),
    );
    const warehouseProfileRepository = new WarehouseProfileRepository(
      dataSource.getRepository(WarehouseProfileOrmEntity),
    );
    const inboundRuleBaselineResult = await SeedInboundRuleBaseline(
      ruleGroupRepository,
      ruleDefinitionRepository,
      warehouseProfileRuleRepository,
      warehouseProfileRepository,
    );
    if (inboundRuleBaselineResult.ProfileMissing) {
      console.log('Seed: inbound rule baseline skipped (WP-LTA-HCM-DEMO profile not seeded yet)');
    } else {
      console.log(
        `Seed: inbound rule baseline ensured (definitions created: ${inboundRuleBaselineResult.DefinitionsCreated}, bindings created: ${inboundRuleBaselineResult.BindingsCreated})`,
      );
    }

    // Idempotent RBAC seed: 6 core roles, permission catalog and role->permission matrix.
    const roleRepository = new RoleRepository(dataSource.getRepository(RoleOrmEntity));
    const roleCatalogRepository = new RoleCatalogRepository(dataSource);
    const permissionRepository = new PermissionRepository(dataSource.getRepository(PermissionOrmEntity));
    const rolePermissionRepository = new RolePermissionRepository(dataSource.getRepository(RolePermissionOrmEntity));
    const userRoleRepository = new UserRoleRepository(dataSource.getRepository(UserRoleOrmEntity));
    await SeedAccessControlRbac(roleRepository, permissionRepository, rolePermissionRepository, roleCatalogRepository);
    console.log('Seed: RBAC roles/permissions/matrix ensured');

    // Idempotent legacy bridge: map existing users.role -> user_roles (Admin->WMS_ADMIN, User->OPERATOR).
    // Never mutates users.role; the legacy auth flow keeps working unchanged.
    const legacyUsers = await users.find();
    const bridged = await BridgeLegacyUserRoles(
      legacyUsers.map((user) => ({ Id: user.Id, Role: user.Role })),
      roleRepository,
      userRoleRepository,
    );
    console.log(`Seed: legacy user-role bridge ensured (${bridged} new assignment(s))`);

    // Idempotent data-scope seed: WMS_ADMIN gets IncludeAll per scope type so admin is
    // never scope-blocked. Runs after the RBAC seed (the WMS_ADMIN role must exist).
    const dataScopeRepository = new DataScopeRepository(dataSource.getRepository(DataScopeOrmEntity));
    await SeedAdminDataScopes(roleRepository, dataScopeRepository);
    console.log('Seed: admin data scopes ensured');

    // Idempotent reason-code catalog seed (V0 action coverage; consumed by C4-C9).
    const reasonCodeRepository = new ReasonCodeRepository(dataSource.getRepository(ReasonCodeOrmEntity));
    await SeedReasonCodeCatalog(reasonCodeRepository);
    console.log('Seed: reason code catalog ensured');

    // Idempotent C8 catalogs: control-exception (CTRL-EX-01..09) + validation-rule (RBAC-VAL-01..10)
    // from doc 09. Upsert by code; the control-exception catalog is consumed by C9.
    const controlExceptionCatalogRepository = new ControlExceptionCatalogRepository(
      dataSource.getRepository(ControlExceptionCatalogOrmEntity),
    );
    await SeedControlExceptionCatalog(controlExceptionCatalogRepository);
    console.log('Seed: control exception catalog ensured');

    const validationRuleCatalogRepository = new ValidationRuleCatalogRepository(
      dataSource.getRepository(ValidationRuleCatalogOrmEntity),
    );
    await SeedValidationRuleCatalog(validationRuleCatalogRepository);
    console.log('Seed: validation rule catalog ensured');
  } finally {
    await dataSource.destroy();
  }
}

Seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
