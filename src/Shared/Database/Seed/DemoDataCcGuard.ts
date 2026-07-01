import 'dotenv/config';
import { GetEnv } from '@shared/Config/Env/Env';
import dataSource from '@shared/Database/TypeOrmDataSource';
import {
  AssertDemoDataCcLocalConnectionTarget,
  AssertDemoDataCcLocalTarget,
  FormatDemoDataCcTargetSummary,
} from '@shared/Database/Seed/DemoDataCcTargetGuard';

const Run = (): void => {
  const env = GetEnv();
  const envTarget = AssertDemoDataCcLocalTarget(env, 'process.env + .env');
  const dataSourceTarget = AssertDemoDataCcLocalConnectionTarget(dataSource.options, env, 'TypeOrmDataSource.options');
  console.log(`[DEMO-DATA-LTA] Env target verified: ${FormatDemoDataCcTargetSummary(envTarget)}`);
  console.log(`[DEMO-DATA-LTA] DataSource target verified: ${FormatDemoDataCcTargetSummary(dataSourceTarget)}`);
};

Run();
