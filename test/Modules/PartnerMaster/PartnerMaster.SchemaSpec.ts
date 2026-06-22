import { QueryRunner } from 'typeorm';
import DataSource from '@shared/Database/TypeOrmDataSource';
import { CreatePartners1781639000000 } from '@shared/Database/Migrations/1781639000000-CreatePartners';
import { PartnerOrmEntity } from '@modules/PartnerMaster/Infrastructure/Persistence/Entities/PartnerOrmEntity';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';

const fakeRunner = () => {
  const queries: string[] = [];
  const runner = { query: jest.fn(async (sql: string) => queries.push(sql)) } as unknown as QueryRunner;
  return { runner, queries };
};

describe('Partner master schema registration', () => {
  it('registers PartnerOrmEntity for TypeORM migrations', () => {
    expect(DataSource.options.entities).toContain(PartnerOrmEntity);
  });

  it('creates partners table and external reference unique index in migration', async () => {
    const { runner, queries } = fakeRunner();
    await new CreatePartners1781639000000().up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "partners"');
    expect(sql).toContain('"partner_type" varchar(30) NOT NULL');
    expect(sql).toContain('"source_system" varchar(100) NOT NULL');
    expect(sql).toContain('"external_reference" varchar(100) NOT NULL');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_partners_partner_code"');
    expect(sql).toContain('CREATE UNIQUE INDEX "UQ_partners_type_source_external_reference"');
  });

  it('drops partners indexes and table in migration down()', async () => {
    const { runner, queries } = fakeRunner();
    await new CreatePartners1781639000000().down(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('DROP INDEX "public"."UQ_partners_type_source_external_reference"');
    expect(sql).toContain('DROP INDEX "public"."UQ_partners_partner_code"');
    expect(sql).toContain('DROP TABLE "partners"');
  });

  it('keeps partner lifecycle separate from InventoryStatus milestone terms', () => {
    expect(Object.values(PartnerStatus)).toEqual(['Active', 'Inactive']);
    expect(Object.values(PartnerStatus)).not.toEqual(
      expect.arrayContaining(['SHIPPED', 'GATE_OUT', 'GOODS_ISSUE_POSTED']),
    );
  });
});
