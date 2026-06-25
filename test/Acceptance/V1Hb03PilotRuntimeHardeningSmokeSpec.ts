import 'reflect-metadata';
import 'dotenv/config';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DataSource, In } from 'typeorm';
import { AppModule } from '@app/App.module';
import { GlobalExceptionFilter } from '@common/Filters/GlobalExceptionFilter';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import {
  V1CoreFlowFixtureBuilder,
  V1_FORBIDDEN_INVENTORY_STATUS_MILESTONES,
} from '@modules/MasterData/Application/Services/V1CoreFlowFixtureBuilder';
import { InventoryStatusOrmEntity } from '@modules/MasterData/Infrastructure/Persistence/Entities/InventoryStatusOrmEntity';
import { OutboxMessageOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/OutboxMessageOrmEntity';
import { IntegrationReconciliationRunOrmEntity } from '@modules/Integration/Infrastructure/Persistence/Entities/IntegrationReconciliationRunOrmEntity';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';
import { IntegrationFailureCategory } from '@modules/Integration/Domain/Enums/IntegrationFailureCategory';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';

jest.setTimeout(180_000);

const RUN_PILOT_SMOKE = process.env.V1_HB_PILOT_SMOKE === '1';
const describePilotSmoke = RUN_PILOT_SMOKE ? describe : describe.skip;
const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? '123456';
const SMOKE_PREFIX = 'HB03';
const FORBIDDEN_INVENTORY_STATUS_TERMS = [
  ...V1_FORBIDDEN_INVENTORY_STATUS_MILESTONES,
  'RECONCILED',
  'INTEGRATION_SYNC_FAILED',
] as const;

type ApiEnvelope<T> = {
  Success: boolean;
  Data: T;
  Errors?: Array<{ Code: string; Message: string; Details?: unknown }>;
};

type AuthUserDto = {
  UserId: string;
  EmailAddress: string;
  Role: string;
};

type OutboxMessageDto = {
  Id: string;
  MessageId: string;
  EventType: string;
  BusinessReference: string;
  WarehouseContext: string;
  OwnerContext: string | null;
  Status: string;
  ReasonCode?: string | null;
  EvidenceRefs?: string[] | null;
  IsDuplicate?: boolean;
};

type PagedResult<T> = {
  Items: T[];
  Meta: {
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
  };
};

type ReconciliationRunDto = {
  Id: string;
  BusinessReference: string;
  WarehouseId: string;
  OwnerId: string | null;
  RunStatus: string;
  SourceCounts: Record<string, number>;
  ItemCount: number;
  MismatchCount: number;
  EvidenceRefs: string[];
};

type ReconciliationCreateResult = {
  Run: ReconciliationRunDto;
  Items: Array<{
    Id: string;
    RunId: string;
    MismatchType: string;
    ItemStatus: string;
    EvidenceRefs: string[];
  }>;
};

const RuntimeMigrationFloor = '1781642650000';

describe('V1-HB-03 static pilot smoke guards', () => {
  it('giữ WT-01/WT-05/WT-06 fixture tách InventoryStatus khỏi workflow/shipment milestone', () => {
    const fixtures = new V1CoreFlowFixtureBuilder().BuildAll();

    expect(fixtures.map((fixture) => fixture.WarehouseTypeCode).sort()).toEqual(['WT-01', 'WT-05', 'WT-06']);
    expect(fixtures.find((fixture) => fixture.WarehouseTypeCode === 'WT-06')?.WarehouseProfile.StrategyPolicy).toEqual({
      goodsIssueTrigger: 'at_gate_out',
    });

    for (const fixture of fixtures) {
      expect(fixture.ExpectedPath.InventoryStatuses).toEqual(
        expect.arrayContaining(['AVAILABLE', 'ALLOCATED', 'LOADED']),
      );
      for (const forbidden of FORBIDDEN_INVENTORY_STATUS_TERMS) {
        expect(fixture.ExpectedPath.InventoryStatuses).not.toContain(forbidden);
      }
    }
  });

  it('giữ các migration V1 runtime-pending ở dạng idempotent cho local pilot drift', () => {
    const migrationDir = join(process.cwd(), 'src', 'Shared', 'Database', 'Migrations');
    const offenders: string[] = [];

    for (const fileName of readdirSync(migrationDir).filter(
      (file) => file.endsWith('.ts') && file >= RuntimeMigrationFloor,
    )) {
      const text = readFileSync(join(migrationDir, fileName), 'utf8');
      if (text.includes('CREATE TABLE "')) offenders.push(`${fileName}: CREATE TABLE thiếu IF NOT EXISTS`);
      if (text.includes('CREATE INDEX "')) offenders.push(`${fileName}: CREATE INDEX thiếu IF NOT EXISTS`);
      if (text.includes('CREATE UNIQUE INDEX "'))
        offenders.push(`${fileName}: CREATE UNIQUE INDEX thiếu IF NOT EXISTS`);
      if (text.includes('ADD COLUMN "')) offenders.push(`${fileName}: ADD COLUMN thiếu IF NOT EXISTS`);
      if (text.includes('DROP INDEX "public"."')) offenders.push(`${fileName}: DROP INDEX thiếu IF EXISTS`);
      if (text.includes('DROP TABLE "')) offenders.push(`${fileName}: DROP TABLE thiếu IF EXISTS`);
      if (text.includes('DROP COLUMN "')) offenders.push(`${fileName}: DROP COLUMN thiếu IF EXISTS`);
    }

    expect(offenders).toEqual([]);
  });
});

describePilotSmoke('V1-HB-03 pilot runtime hardening smoke', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authCookies: string[] = [];
  const runId = `${SMOKE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const businessReference = `${runId}-PILOT-RECOVERY`;
  const warehouseContext = `${runId}-WH`;
  const ownerContext = `${runId}-OWNER`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
    const expressApp = app as NestExpressApplication;
    expressApp.useBodyParser('json', { strict: false });
    expressApp.useBodyParser('urlencoded', { extended: true });
    app.use(cookieParser());
    app.useGlobalFilters(app.get(GlobalExceptionFilter));
    app.useGlobalInterceptors(app.get(ResponseInterceptor));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.enableVersioning({ type: VersioningType.HEADER, header: 'X-API-Version', defaultVersion: '1' });
    await app.init();

    dataSource = app.get(DataSource);
    authCookies = await loginAsSeedAdmin();
  });

  afterAll(async () => {
    try {
      if (authCookies.length > 0) {
        await request(app.getHttpServer())
          .post('/auth/logout')
          .set('X-API-Version', '1')
          .set('Cookie', authCookies)
          .send({});
      }
      if (dataSource?.isInitialized) {
        await cleanupSmokeData(dataSource, runId);
      }
    } finally {
      await app?.close();
    }
  });

  it('boot app và trả health/live/ready với Postgres ready', async () => {
    const health = await request(app.getHttpServer()).get('/health').set('X-API-Version', '1').expect(200);
    expect(health.body).toMatchObject<ApiEnvelope<{ Status: 'OK' }>>({ Success: true, Data: { Status: 'OK' } });

    const live = await request(app.getHttpServer()).get('/health/live').set('X-API-Version', '1').expect(200);
    expect(live.body).toMatchObject<ApiEnvelope<{ Status: 'OK' }>>({ Success: true, Data: { Status: 'OK' } });

    const ready = await request(app.getHttpServer()).get('/health/ready').set('X-API-Version', '1').expect(200);
    expect(ready.body.Success).toBe(true);
    expect(ready.body.Data.Status).toBe('ok');
    expect(ready.body.Data.Details.postgres.Status).toBe('up');
  });

  it('xác nhận auth/session cookie thật, không trả token trong body và không cần Authorization workaround', async () => {
    const sessionCookies = await loginAsSeedAdmin();

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('X-API-Version', '1')
      .set('Cookie', sessionCookies)
      .expect(200);
    expect(me.body.Success).toBe(true);
    expect(me.body.Data).toMatchObject<Partial<AuthUserDto>>({ EmailAddress: ADMIN_EMAIL, Role: 'Admin' });

    const refresh = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-API-Version', '1')
      .set('Cookie', sessionCookies)
      .send({})
      .expect(200);
    expect(refresh.body.Success).toBe(true);
    expect(refresh.body.Data.User.EmailAddress).toBe(ADMIN_EMAIL);
    expect(refresh.body.Data.AccessToken).toBeUndefined();
    expect(refresh.body.Data.RefreshToken).toBeUndefined();
    expect(refresh.get('Set-Cookie') ?? []).toEqual(expect.arrayContaining([expect.stringMatching(/^access_token=/)]));
    expect(refresh.get('Set-Cookie') ?? []).toEqual(expect.arrayContaining([expect.stringMatching(/^refresh_token=/)]));

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('X-API-Version', '1')
      .set('Cookie', refresh.get('Set-Cookie') ?? sessionCookies)
      .send({});
  });

  it('xác nhận fixture WT-01/WT-05/WT-06 và InventoryStatus catalog không chứa milestone cấm', async () => {
    const fixtures = new V1CoreFlowFixtureBuilder().BuildAll();
    expect(fixtures).toHaveLength(3);
    expect(fixtures.flatMap((fixture) => fixture.ExpectedPath.WorkflowMilestones)).toEqual(
      expect.arrayContaining(['PUTAWAY_COMPLETED', 'PACK_CONFIRMED']),
    );
    expect(fixtures.flatMap((fixture) => fixture.ExpectedPath.ShipmentMilestones)).toEqual(
      expect.arrayContaining(['GATE_OUT', 'GOODS_ISSUE_POSTED']),
    );

    await expectForbiddenInventoryStatusesAbsent();
  });

  it('xác nhận outbox/dead-letter/reconciliation/recovery bằng API thật, permission guard và audit path', async () => {
    const outbox = await postWithAuth<OutboxMessageDto>('/integration/events', {
      MessageId: `${runId}-event`,
      MessageType: 'PilotSmokeEvent',
      Version: '1.0',
      BusinessReference: businessReference,
      SourceSystem: 'V1-HB-03',
      TargetSystem: 'LTA-WMS',
      WarehouseContext: warehouseContext,
      OwnerContext: ownerContext,
      EventTime: new Date().toISOString(),
      CorrelationId: `${runId}-correlation`,
      CausationId: `${runId}-cause`,
      Payload: {
        ExpectedQuantity: 10,
        ActualQuantity: 7,
        ExpectedStatus: 'Pending',
        ActualStatus: 'DeadLetterCandidate',
      },
    });
    expect(outbox.Status).toBe(OutboxMessageStatus.Pending);

    const deadLetter = await postWithAuth<OutboxMessageDto>(`/integration/events/${outbox.Id}/failures`, {
      FailureCategory: IntegrationFailureCategory.Permanent,
      ErrorMessage: 'V1-HB-03 pilot smoke forced dead-letter',
    });
    expect(deadLetter.Status).toBe(OutboxMessageStatus.DeadLetter);

    const listedDeadLetters = await getWithAuth<PagedResult<OutboxMessageDto>>(
      `/integration/dead-letters?BusinessReference=${businessReference}&WarehouseContext=${warehouseContext}&OwnerContext=${ownerContext}&PageSize=500`,
    );
    expect(listedDeadLetters.Meta.PageSize).toBe(100);
    expect(listedDeadLetters.Items.map((item) => item.Id)).toContain(outbox.Id);

    const fixed = await postWithAuth<OutboxMessageDto>(`/integration/dead-letters/${outbox.Id}/manual-fix`, {
      ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
      ReasonNote: 'Pilot smoke manual fix for integration dead-letter',
      EvidenceRefs: [`${runId}:dead-letter-manual-fix`],
      IdempotencyKey: `${runId}-manual-fix`,
      ManualFixPayload: { Correction: 'pilot-smoke-reviewed' },
    });
    expect(fixed.Status).toBe(OutboxMessageStatus.ManualFixed);
    expect(fixed.ReasonCode).toBe('RC-V1-DEAD-LETTER-FIX');
    expect(fixed.EvidenceRefs).toContain(`${runId}:dead-letter-manual-fix`);

    const reconciliation = await postWithAuth<ReconciliationCreateResult>('/integration/reconciliation/runs', {
      BusinessReference: businessReference,
      WarehouseId: warehouseContext,
      OwnerId: ownerContext,
      ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
      ReasonNote: 'Pilot smoke reconciliation after dead-letter manual fix',
      EvidenceRefs: [`${runId}:reconciliation`],
      IdempotencyKey: `${runId}-reconciliation`,
    });
    expect(reconciliation.Run.BusinessReference).toBe(businessReference);
    expect(reconciliation.Run.WarehouseId).toBe(warehouseContext);
    expect(reconciliation.Run.OwnerId).toBe(ownerContext);
    expect(reconciliation.Run.SourceCounts.OutboxMessages).toBeGreaterThanOrEqual(2);
    expect(reconciliation.Run.ItemCount).toBeGreaterThanOrEqual(1);
    expect(reconciliation.Items.length).toBeGreaterThanOrEqual(1);

    const listedRuns = await getWithAuth<PagedResult<ReconciliationRunDto>>(
      `/integration/reconciliation/runs?BusinessReference=${businessReference}&WarehouseId=${warehouseContext}&OwnerId=${ownerContext}&PageSize=500`,
    );
    expect(listedRuns.Meta.PageSize).toBe(100);
    expect(listedRuns.Items.map((item) => item.Id)).toContain(reconciliation.Run.Id);

    await expectIntegrationAuditEvidence(outbox.Id, reconciliation.Run.Id);
    await expectForbiddenInventoryStatusesAbsent();
  });

  async function loginAsSeedAdmin(): Promise<string[]> {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-API-Version', '1')
      .send({ EmailAddress: ADMIN_EMAIL, Password: ADMIN_PASSWORD })
      .expect(201);

    expect(response.body.Success).toBe(true);
    expect(response.body.Data.User.EmailAddress).toBe(ADMIN_EMAIL);
    expect(response.body.Data.AccessToken).toBeUndefined();
    expect(response.body.Data.RefreshToken).toBeUndefined();
    const cookies = response.get('Set-Cookie') ?? [];
    expect(cookies.some((cookie) => cookie.startsWith('access_token='))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith('refresh_token='))).toBe(true);
    return cookies;
  }

  async function postWithAuth<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await request(app.getHttpServer())
      .post(path)
      .set('X-API-Version', '1')
      .set('Cookie', authCookies)
      .set('x-correlation-id', runId)
      .send(body)
      .expect((res) => {
        if (res.body?.Success !== true) {
          throw new Error(`Unexpected API response for POST ${path}: ${JSON.stringify(res.body)}`);
        }
      });
    return response.body.Data as T;
  }

  async function getWithAuth<T>(path: string): Promise<T> {
    const response = await request(app.getHttpServer())
      .get(path)
      .set('X-API-Version', '1')
      .set('Cookie', authCookies)
      .set('x-correlation-id', runId)
      .expect((res) => {
        if (res.body?.Success !== true) {
          throw new Error(`Unexpected API response for GET ${path}: ${JSON.stringify(res.body)}`);
        }
      });
    return response.body.Data as T;
  }

  async function expectForbiddenInventoryStatusesAbsent(): Promise<void> {
    const statuses = await dataSource.getRepository(InventoryStatusOrmEntity).find({
      where: { StatusCode: In([...FORBIDDEN_INVENTORY_STATUS_TERMS]) },
    });
    expect(statuses).toEqual([]);
  }

  async function expectIntegrationAuditEvidence(outboxId: string, reconciliationRunId: string): Promise<void> {
    const auditLogs = await dataSource.getRepository(AuditLogOrmEntity).find({
      where: [
        { ObjectType: 'IntegrationMessage', ObjectId: outboxId },
        { ObjectType: 'DeadLetterMessage', ObjectId: outboxId },
        { ObjectType: 'ReconciliationRun', ObjectId: reconciliationRunId },
      ],
    });

    expect(auditLogs.map((entry) => entry.ObjectType)).toEqual(
      expect.arrayContaining(['IntegrationMessage', 'DeadLetterMessage', 'ReconciliationRun']),
    );
    expect(auditLogs.some((entry) => entry.ReferenceType === 'ManualFix')).toBe(true);
    expect(auditLogs.some((entry) => entry.EvidenceRefs?.includes(`${runId}:dead-letter-manual-fix`))).toBe(true);
    expect(auditLogs.some((entry) => entry.EvidenceRefs?.includes(`${runId}:reconciliation`))).toBe(true);

    const persistedMessages = await dataSource.getRepository(OutboxMessageOrmEntity).find({
      where: { BusinessReference: businessReference },
    });
    expect(persistedMessages.map((message) => message.EventType)).toEqual(
      expect.arrayContaining(['PilotSmokeEvent', 'IntegrationSyncFailed']),
    );

    const persistedRun = await dataSource.getRepository(IntegrationReconciliationRunOrmEntity).findOneByOrFail({
      Id: reconciliationRunId,
    });
    expect(persistedRun.BusinessReference).toBe(businessReference);
    expect(persistedRun.ItemCount).toBeGreaterThanOrEqual(1);
  }
});

async function cleanupSmokeData(dataSource: DataSource, runId: string): Promise<void> {
  const like = `${runId}%`;
  await dataSource.query(
    `
      DELETE FROM exception_cases
      WHERE reference_id IN (
        SELECT id FROM integration_reconciliation_items
        WHERE run_id IN (
          SELECT id FROM integration_reconciliation_runs
          WHERE business_reference LIKE $1
        )
      )
    `,
    [like],
  );
  await dataSource.query(
    `
      DELETE FROM integration_reconciliation_items
      WHERE run_id IN (
        SELECT id FROM integration_reconciliation_runs
        WHERE business_reference LIKE $1
      )
    `,
    [like],
  );
  await dataSource.query(`DELETE FROM integration_reconciliation_runs WHERE business_reference LIKE $1`, [like]);
  await dataSource.query(
    `DELETE FROM integration_outbox_messages WHERE business_reference LIKE $1 OR message_id LIKE $1`,
    [like],
  );
  await dataSource.query(
    `DELETE FROM integration_interface_messages WHERE business_reference LIKE $1 OR message_id LIKE $1`,
    [like],
  );
  await dataSource.query(`DELETE FROM integration_import_batches WHERE batch_reference LIKE $1`, [like]);
}

export function buildV1Hb03EvidenceProbe(): { RuntimeOptIn: string; MigrationFloor: string; HasEnvFile: boolean } {
  return {
    RuntimeOptIn: 'V1_HB_PILOT_SMOKE=1',
    MigrationFloor: RuntimeMigrationFloor,
    HasEnvFile: existsSync(join(process.cwd(), '.env')),
  };
}
