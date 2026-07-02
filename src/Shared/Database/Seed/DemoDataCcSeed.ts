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
import { SeedInboundRuleBaseline } from '@modules/WarehouseProfile/Application/Services/InboundRuleBaselineSeed';
import { SeedRuleGroupCatalog } from '@modules/WarehouseProfile/Application/Services/RuleGroupCatalogSeed';
import { RuleGroupRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/RuleGroupRepository';
import { RuleGroupOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleGroupOrmEntity';
import { RuleDefinitionRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/RuleDefinitionRepository';
import { RuleDefinitionOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleDefinitionOrmEntity';
import { WarehouseProfileRuleRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/WarehouseProfileRuleRepository';
import { WarehouseProfileRuleOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileRuleOrmEntity';
import { WarehouseProfileRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/WarehouseProfileRepository';
import { WarehouseProfileOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileOrmEntity';

export const RunDemoDataCcSeed = async (): Promise<void> => {
  const target = AssertDemoDataCcLocalTarget(GetEnv(), 'process.env + .env');

  console.log(`[DEMO-DATA-LTA] Target verified: ${FormatDemoDataCcTargetSummary(target)}`);
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      await CleanupLegacyDemoDataCcRows(manager);
    });
    const foundation = await SeedDemoDataCcFoundation(dataSource);

    // Epic 24 (IN-RULE-24): now that the WT-01 demo profile exists, activate the rule-group
    // catalog defensively (idempotent no-op if `yarn seed:run` already ran) so this script also
    // works correctly when invoked standalone (e.g. `yarn demo-data:seed` without `seed:run`
    // first, or after a `demo-data:reset` that truncated rule_groups), then bind the baseline
    // inbound/putaway rules to the profile. SeedInboundRuleBaseline skips already-bound rules.
    const ruleGroupRepository = new RuleGroupRepository(dataSource.getRepository(RuleGroupOrmEntity));
    await SeedRuleGroupCatalog(ruleGroupRepository);
    const inboundRuleBaseline = await SeedInboundRuleBaseline(
      ruleGroupRepository,
      new RuleDefinitionRepository(dataSource.getRepository(RuleDefinitionOrmEntity)),
      new WarehouseProfileRuleRepository(dataSource.getRepository(WarehouseProfileRuleOrmEntity)),
      new WarehouseProfileRepository(dataSource.getRepository(WarehouseProfileOrmEntity)),
    );
    console.log(`[DEMO-DATA-LTA] Inbound rule baseline ensured: ${JSON.stringify(inboundRuleBaseline)}`);

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
