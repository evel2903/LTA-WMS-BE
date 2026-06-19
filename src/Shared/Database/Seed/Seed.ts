import 'dotenv/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import dataSource from '@shared/Database/TypeOrmDataSource';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';
import { SeedRuleGroupCatalog } from '@modules/WarehouseProfile/Application/Services/RuleGroupCatalogSeed';
import { RuleGroupRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/RuleGroupRepository';
import { RuleGroupOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleGroupOrmEntity';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { BridgeLegacyUserRoles } from '@modules/AccessControl/Application/Services/LegacyRoleBridge';
import { RoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RoleRepository';
import { PermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/PermissionRepository';
import { RolePermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RolePermissionRepository';
import { UserRoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/UserRoleRepository';
import { RoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RoleOrmEntity';
import { PermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/PermissionOrmEntity';
import { RolePermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RolePermissionOrmEntity';
import { UserRoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/UserRoleOrmEntity';

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

    // Idempotent rule group catalog seed (R-MD/R-RBAC/R-COM/R-INT active + V1+ placeholders).
    const ruleGroupRepository = new RuleGroupRepository(dataSource.getRepository(RuleGroupOrmEntity));
    await SeedRuleGroupCatalog(ruleGroupRepository);
    console.log('Seed: rule group catalog ensured');

    // Idempotent RBAC seed: 6 core roles, permission catalog and role->permission matrix.
    const roleRepository = new RoleRepository(dataSource.getRepository(RoleOrmEntity));
    const permissionRepository = new PermissionRepository(dataSource.getRepository(PermissionOrmEntity));
    const rolePermissionRepository = new RolePermissionRepository(dataSource.getRepository(RolePermissionOrmEntity));
    const userRoleRepository = new UserRoleRepository(dataSource.getRepository(UserRoleOrmEntity));
    await SeedAccessControlRbac(roleRepository, permissionRepository, rolePermissionRepository);
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
  } finally {
    await dataSource.destroy();
  }
}

Seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
