import 'dotenv/config';
import { GetEnv } from '@shared/Config/Env/Env';
import {
  AssertDemoDataCcLocalTarget,
  FormatDemoDataCcTargetSummary,
} from '@shared/Database/Seed/DemoDataCcTargetGuard';

const Run = (): void => {
  const target = AssertDemoDataCcLocalTarget(GetEnv(), 'process.env + .env');

  console.log(`[DEMO-DATA-CC] Target verified: ${FormatDemoDataCcTargetSummary(target)}`);
  console.log('[DEMO-DATA-CC] DEMO-DATA-00 only locks the reset command contract. No data was deleted.');
};

Run();
