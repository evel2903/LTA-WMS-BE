import 'dotenv/config';
import { GetEnv } from '@shared/Config/Env/Env';
import dataSource from '@shared/Database/TypeOrmDataSource';
import { SeedDemoDataCcFlow } from '@shared/Database/Seed/DemoDataCcFlowSeed';
import { SeedDemoDataCcFoundation } from '@shared/Database/Seed/DemoDataCcFoundationSeed';
import { SeedDemoDataCcInventory } from '@shared/Database/Seed/DemoDataCcInventorySeed';
import { CleanupLegacyDemoDataCcRows } from '@shared/Database/Seed/DemoDataCcLegacyCleanup';
import { SeedDemoDataCcLocationTree } from '@shared/Database/Seed/DemoDataCcLocationTreeSeed';
import { SeedDemoDataCcScreenCoverage } from '@shared/Database/Seed/DemoDataCcScreenCoverageSeed';
import {
  AssertDemoDataCcLocalTarget,
  FormatDemoDataCcTargetSummary,
} from '@shared/Database/Seed/DemoDataCcTargetGuard';

export const RunDemoDataCcSeed = async (): Promise<void> => {
  const target = AssertDemoDataCcLocalTarget(GetEnv(), 'process.env + .env');

  console.log(`[DEMO-DATA-LTA] Target verified: ${FormatDemoDataCcTargetSummary(target)}`);
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      await CleanupLegacyDemoDataCcRows(manager);
    });
    const foundation = await SeedDemoDataCcFoundation(dataSource);
    const locationTree = await SeedDemoDataCcLocationTree(dataSource);
    const inventory = await SeedDemoDataCcInventory(dataSource);
    const flow = await SeedDemoDataCcFlow(dataSource);
    const screenCoverage = await SeedDemoDataCcScreenCoverage(dataSource);
    console.log(
      `[DEMO-DATA-LTA] Demo seed complete: ${JSON.stringify({
        foundation,
        locationTree,
        inventory,
        flow,
        screenCoverage,
      })}`,
    );
  } finally {
    await dataSource.destroy();
  }
};

if (require.main === module) {
  RunDemoDataCcSeed().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
