import 'dotenv/config';
import { GetEnv } from '@shared/Config/Env/Env';
import dataSource from '@shared/Database/TypeOrmDataSource';
import { ResetDemoDataCcLocalDatabase } from '@shared/Database/Seed/DemoDataCcDatabaseReset';
import {
  AssertDemoDataCcLocalTarget,
  FormatDemoDataCcTargetSummary,
} from '@shared/Database/Seed/DemoDataCcTargetGuard';

const Run = async (): Promise<void> => {
  const target = AssertDemoDataCcLocalTarget(GetEnv(), 'process.env + .env');

  console.log(`[DEMO-DATA-CC] Target verified: ${FormatDemoDataCcTargetSummary(target)}`);
  await dataSource.initialize();
  try {
    const result = await ResetDemoDataCcLocalDatabase(dataSource);
    console.log(
      `[DEMO-DATA-CC] Reset complete: truncated=${result.TruncatedTables.length} protected=${result.ProtectedTables.join(
        ',',
      )}`,
    );
  } finally {
    await dataSource.destroy();
  }
};

Run().catch((error) => {
  console.error(error);
  process.exit(1);
});
