import 'dotenv/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import dataSource from '@shared/Database/TypeOrmDataSource';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';
import { SeedRuleGroupCatalog } from '@modules/WarehouseProfile/Application/Services/RuleGroupCatalogSeed';
import { RuleGroupRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/RuleGroupRepository';
import { RuleGroupOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleGroupOrmEntity';

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
  } finally {
    await dataSource.destroy();
  }
}

Seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
