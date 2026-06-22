import { QueryRunner } from 'typeorm';
import DataSource from '@shared/Database/TypeOrmDataSource';
import { AddCoreFlowBusinessReferenceUniqueIndexes1781642100000 } from '@shared/Database/Migrations/1781642100000-AddCoreFlowBusinessReferenceUniqueIndexes';
import { CreateCoreFlow1781642000000 } from '@shared/Database/Migrations/1781642000000-CreateCoreFlow';
import { CoreFlowInstanceOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/CoreFlowInstanceOrmEntity';
import { WorkflowHandoffOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowHandoffOrmEntity';
import { WorkflowMilestoneOrmEntity } from '@modules/CoreFlow/Infrastructure/Persistence/Entities/WorkflowMilestoneOrmEntity';
import { CORE_FLOW_STEP_DEFINITIONS } from '@modules/CoreFlow/Domain/Constants/CoreFlowStepDefinitions';
import { WorkflowMilestoneStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowMilestoneStatus';
import { WorkflowHandoffStatus } from '@modules/CoreFlow/Domain/Enums/WorkflowHandoffStatus';

const fakeRunner = () => {
  const queries: string[] = [];
  const runner = { query: jest.fn(async (sql: string) => queries.push(sql)) } as unknown as QueryRunner;
  return { runner, queries };
};

describe('CoreFlow schema registration', () => {
  it('registers CoreFlow ORM entities for TypeORM migrations', () => {
    expect(DataSource.options.entities).toEqual(
      expect.arrayContaining([CoreFlowInstanceOrmEntity, WorkflowMilestoneOrmEntity, WorkflowHandoffOrmEntity]),
    );
  });

  it('creates core flow tables and indexes in migration', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateCoreFlow1781642000000().up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "core_flow_instances"');
    expect(sql).toContain('CREATE TABLE "workflow_milestones"');
    expect(sql).toContain('CREATE TABLE "workflow_handoffs"');
    expect(sql).toContain('CREATE INDEX "IDX_core_flow_business_reference"');
    expect(sql).toContain('CREATE INDEX "IDX_workflow_milestones_instance_step"');
    expect(sql).toContain('CREATE INDEX "IDX_workflow_handoffs_instance"');
  });

  it('drops core flow indexes and tables in migration down()', async () => {
    const { runner, queries } = fakeRunner();
    await new CreateCoreFlow1781642000000().down(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('DROP INDEX "public"."IDX_workflow_handoffs_instance"');
    expect(sql).toContain('DROP INDEX "public"."IDX_workflow_milestones_instance_step"');
    expect(sql).toContain('DROP INDEX "public"."IDX_core_flow_business_reference"');
    expect(sql).toContain('DROP TABLE "workflow_handoffs"');
    expect(sql).toContain('DROP TABLE "workflow_milestones"');
    expect(sql).toContain('DROP TABLE "core_flow_instances"');
  });

  it('adds unique business-reference guards without editing the applied create migration', async () => {
    const { runner, queries } = fakeRunner();
    await new AddCoreFlowBusinessReferenceUniqueIndexes1781642100000().up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('DROP INDEX "public"."IDX_core_flow_business_reference"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_core_flow_business_reference_owner"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_core_flow_business_reference_no_owner"');
  });

  it('defines exactly 23 core-flow steps and keeps milestone states separate from InventoryStatus', () => {
    expect(CORE_FLOW_STEP_DEFINITIONS).toHaveLength(23);
    expect(Object.values(WorkflowMilestoneStatus)).toEqual(['Pending', 'Completed', 'Skipped', 'Blocked']);
    expect(Object.values(WorkflowHandoffStatus)).toEqual(['Completed', 'Blocked']);
    expect(JSON.stringify(CORE_FLOW_STEP_DEFINITIONS)).toContain('GateOutRecorded');
    expect(JSON.stringify(CORE_FLOW_STEP_DEFINITIONS)).toContain('GoodsIssuePosted');
  });
});
