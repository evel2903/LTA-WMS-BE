import 'dotenv/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import dataSource from '../TypeOrmDataSource';
import { UserOrmEntity } from '../../../Modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';

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
      return;
    }

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
  } finally {
    await dataSource.destroy();
  }
}

Seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
