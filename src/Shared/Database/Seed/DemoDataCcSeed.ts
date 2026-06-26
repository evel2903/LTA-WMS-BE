import 'dotenv/config';
import { GetEnv } from '@shared/Config/Env/Env';
import dataSource from '@shared/Database/TypeOrmDataSource';
import { SeedDemoDataCcFlow } from '@shared/Database/Seed/DemoDataCcFlowSeed';
import { SeedDemoDataCcFoundation } from '@shared/Database/Seed/DemoDataCcFoundationSeed';
import { SeedDemoDataCcInventory } from '@shared/Database/Seed/DemoDataCcInventorySeed';
import { SeedDemoDataCcLocationTree } from '@shared/Database/Seed/DemoDataCcLocationTreeSeed';
import {
  AssertDemoDataCcLocalTarget,
  FormatDemoDataCcTargetSummary,
} from '@shared/Database/Seed/DemoDataCcTargetGuard';

const Run = async (): Promise<void> => {
  const target = AssertDemoDataCcLocalTarget(GetEnv(), 'process.env + .env');

  console.log(`[DEMO-DATA-CC] Target verified: ${FormatDemoDataCcTargetSummary(target)}`);
  await dataSource.initialize();
  try {
    const foundation = await SeedDemoDataCcFoundation(dataSource);
    const locationTree = await SeedDemoDataCcLocationTree(dataSource);
    const inventory = await SeedDemoDataCcInventory(dataSource);
    const flow = await SeedDemoDataCcFlow(dataSource);
    console.log(`[DEMO-DATA-CC] Demo seed complete: ${JSON.stringify({ foundation, locationTree, inventory, flow })}`);
  } finally {
    await dataSource.destroy();
  }
};

Run().catch((error) => {
  console.error(error);
  process.exit(1);
});
