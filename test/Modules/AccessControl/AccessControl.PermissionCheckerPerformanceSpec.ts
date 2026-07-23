import { createHash, randomUUID } from 'crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { DataSource, EntityManager } from 'typeorm';
import dataSourceTemplate from '@shared/Database/TypeOrmDataSource';
import {
  PermissionCheckContext,
  PermissionDecision,
} from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { PermissionDataScopeDecision } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { AuthorizationSnapshotContext } from '@modules/AccessControl/Application/Services/AuthorizationSnapshotContext';
import { PermissionChecker } from '@modules/AccessControl/Application/Services/PermissionChecker';
import { AuthorizationSnapshotResolver } from '@modules/AccessControl/Infrastructure/Authorization/AuthorizationSnapshotResolver';
import { DataScopeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/DataScopeOrmEntity';
import { PermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/PermissionOrmEntity';
import { RoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RoleOrmEntity';
import { RolePermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RolePermissionOrmEntity';
import { UserRoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/UserRoleOrmEntity';
import { DataScopeRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/DataScopeRepository';
import { PermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/PermissionRepository';
import { RolePermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RolePermissionRepository';
import { RoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RoleRepository';
import { UserRoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/UserRoleRepository';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { DataScopeType } from '@modules/AccessControl/Domain/Enums/DataScopeType';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PrincipalType } from '@modules/AccessControl/Domain/Enums/PrincipalType';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { UserRoleSource } from '@modules/AccessControl/Domain/Enums/UserRoleSource';
import { QueryCapture, QueryCounterLogger } from '@test/Helpers/QueryCounterLogger';
import { BuildTimingSummary } from '@test/Helpers/Rh06Measurement';

const live = process.env.RH06_DATABASE_E2E === '1' ? describe : describe.skip;
const WARMUP_COUNT = 5;
const SAMPLE_COUNT = 30;
const MANY_ACTIVE_ROLE_COUNT = 32;
const MANY_INACTIVE_ROLE_COUNT = 8;

type CheckResult = PermissionDecision | PermissionDataScopeDecision;
type MeasurementMode = 'request-snapshot-cold' | 'request-snapshot-warm' | 'direct-repository';

interface Fixture {
  UserIds: string[];
  RoleIds: string[];
  CreatedPermissionIds: string[];
  NoRoleUserId: string;
  OneActiveUserId: string;
  InactiveMixUserId: string;
  ManyRolesUserId: string;
  ScopedUserId: string;
  WarehouseId: string;
  OwnerId: string;
}

interface CapturedResult {
  DurationMs: number;
  Capture: QueryCapture;
  Result: CheckResult;
}

interface MeasurementRecord {
  Scenario: string;
  Mode: MeasurementMode;
  WarmupCount: number;
  SampleCount: number;
  DataQueryCount: number;
  SelectQueryCount: number;
  TransactionControlCount: number;
  ThresholdMs: number;
  MinMs: number;
  AvgMs: number;
  P50Ms: number;
  P95Ms: number;
  MaxMs: number;
  PassedThreshold: boolean;
  ExpectedResult: CheckResult;
  Correctness: true;
}

interface GitMetadata {
  BaselineCommit: string;
  Branch: string;
  ProductionSourceDirty: false;
  VerifiedCleanPaths: string[];
  HarnessFiles: string[];
  HarnessSourceSha256: string;
}

interface Scenario {
  Name: string;
  Context: PermissionCheckContext;
  ExpectedResult: CheckResult;
  DirectDataQueryCount: number;
  Operation: 'check' | 'resolve-data-scope';
}

live('RH-06 PermissionChecker performance investigation (live PostgreSQL)', () => {
  jest.setTimeout(120_000);

  const logger = new QueryCounterLogger();
  let dataSource: DataSource;
  let directChecker: PermissionChecker;
  let snapshotChecker: PermissionChecker;
  let snapshotContext: AuthorizationSnapshotContext;
  let fixture: Fixture | undefined;
  let gitMetadata: GitMetadata;

  beforeAll(async () => {
    const databaseName = String(dataSourceTemplate.options.database);
    const databaseHost = String('host' in dataSourceTemplate.options ? dataSourceTemplate.options.host : '');
    const ownerToken = process.env.RH06_DATABASE_OWNER_TOKEN ?? '';
    if (!/^[a-f0-9]{16}$/.test(ownerToken) || databaseName !== `rh06_${ownerToken}`) {
      throw new Error(`RH-06 live harness requires the exact runner-owned nonce database, received ${databaseName}`);
    }
    if (!['127.0.0.1', 'localhost', '::1'].includes(databaseHost)) {
      throw new Error(`RH-06 live harness requires a loopback PostgreSQL host, received ${databaseHost}`);
    }
    gitMetadata = ReadGitMetadata();
    dataSource = new DataSource({
      ...dataSourceTemplate.options,
      logging: ['query', 'error'],
      logger,
    });
    await dataSource.initialize();
    await dataSource.runMigrations();

    const userRoles = new UserRoleRepository(dataSource.getRepository(UserRoleOrmEntity));
    const rolePermissions = new RolePermissionRepository(dataSource.getRepository(RolePermissionOrmEntity));
    const permissions = new PermissionRepository(dataSource.getRepository(PermissionOrmEntity));
    const dataScopes = new DataScopeRepository(dataSource.getRepository(DataScopeOrmEntity));
    const roles = new RoleRepository(dataSource.getRepository(RoleOrmEntity));
    directChecker = new PermissionChecker(userRoles, rolePermissions, permissions, dataScopes, roles);
    snapshotContext = new AuthorizationSnapshotContext();
    snapshotChecker = new PermissionChecker(
      userRoles,
      rolePermissions,
      permissions,
      dataScopes,
      roles,
      snapshotContext,
      new AuthorizationSnapshotResolver(dataSource),
    );
    fixture = await CreateFixture(dataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      try {
        if (fixture) await CleanupFixture(dataSource, fixture);
      } finally {
        await dataSource.destroy();
      }
    }
  });

  it('measures query shape, p50/p95 latency and correctness for snapshot and direct paths', async () => {
    const current = fixture!;
    const targetContext = (userId: string): PermissionCheckContext => ({
      UserId: userId,
      Action: ActionCode.Read,
      ObjectType: ObjectType.Role,
    });
    const scenarios: Scenario[] = [
      {
        Name: 'no-role-denied',
        Context: targetContext(current.NoRoleUserId),
        ExpectedResult: { Allowed: false, Reason: 'PERMISSION_DENIED' },
        DirectDataQueryCount: 1,
        Operation: 'check',
      },
      {
        Name: 'one-active-role-allowed',
        Context: targetContext(current.OneActiveUserId),
        ExpectedResult: { Allowed: true },
        DirectDataQueryCount: 4,
        Operation: 'check',
      },
      {
        Name: 'inactive-target-grant-denied',
        Context: targetContext(current.InactiveMixUserId),
        ExpectedResult: { Allowed: false, Reason: 'PERMISSION_DENIED' },
        DirectDataQueryCount: 4,
        Operation: 'check',
      },
      {
        Name: 'many-roles-allowed',
        Context: targetContext(current.ManyRolesUserId),
        ExpectedResult: { Allowed: true },
        DirectDataQueryCount: 4,
        Operation: 'check',
      },
      {
        Name: 'scoped-check-allowed',
        Context: {
          UserId: current.ScopedUserId,
          Action: ActionCode.Read,
          ObjectType: ObjectType.Warehouse,
          Scope: { WarehouseId: current.WarehouseId },
        },
        ExpectedResult: { Allowed: true },
        DirectDataQueryCount: 5,
        Operation: 'check',
      },
      {
        Name: 'resolve-data-scope-allowed',
        Context: {
          UserId: current.ScopedUserId,
          Action: ActionCode.Read,
          ObjectType: ObjectType.Warehouse,
        },
        ExpectedResult: {
          Allowed: true,
          WarehouseIds: [current.WarehouseId],
          OwnerIds: null,
        },
        DirectDataQueryCount: 7,
        Operation: 'resolve-data-scope',
      },
    ];

    const measurements: MeasurementRecord[] = [];
    for (const scenario of scenarios) {
      const invoke = (checker: PermissionChecker): Promise<CheckResult> =>
        scenario.Operation === 'check' ? checker.Check(scenario.Context) : checker.ResolveDataScope(scenario.Context);

      measurements.push(
        await MeasureScenario({
          Scenario: scenario,
          Mode: 'request-snapshot-cold',
          ExpectedDataQueryCount: 3,
          ExpectedTransactionControlCount: 3,
          ThresholdMs: 50,
          Execute: async () =>
            snapshotContext.Run(async () => {
              snapshotContext.BindActor(scenario.Context.UserId);
              return Capture(logger, () => invoke(snapshotChecker));
            }),
        }),
      );
      measurements.push(
        await MeasureScenario({
          Scenario: scenario,
          Mode: 'request-snapshot-warm',
          ExpectedDataQueryCount: 0,
          ExpectedTransactionControlCount: 0,
          ThresholdMs: 5,
          Execute: async () =>
            snapshotContext.Run(async () => {
              snapshotContext.BindActor(scenario.Context.UserId);
              await invoke(snapshotChecker);
              return Capture(logger, () => invoke(snapshotChecker));
            }),
        }),
      );
      measurements.push(
        await MeasureScenario({
          Scenario: scenario,
          Mode: 'direct-repository',
          ExpectedDataQueryCount: scenario.DirectDataQueryCount,
          ExpectedTransactionControlCount: 0,
          ThresholdMs: scenario.Operation === 'resolve-data-scope' ? 75 : 50,
          Execute: () => Capture(logger, () => invoke(directChecker)),
        }),
      );
    }

    const versionRows = (await dataSource.query(`SELECT version() AS "Version"`)) as Array<{ Version: string }>;
    const report = {
      Story: 'RH-06',
      RunId: process.env.RH06_RUN_ID ?? randomUUID(),
      GeneratedAt: new Date().toISOString(),
      ...gitMetadata,
      NodeVersion: process.version,
      PostgreSqlVersion: versionRows[0]?.Version ?? 'unknown',
      DatabaseHost: String('host' in dataSource.options ? dataSource.options.host : ''),
      DatabasePort: Number('port' in dataSource.options ? dataSource.options.port : 0),
      DatabaseName: String(dataSource.options.database),
      DatabaseOwnership: 'runner-created-loopback-nonce',
      Fixture: {
        ManyActiveRoles: MANY_ACTIVE_ROLE_COUNT,
        ManyInactiveRoles: MANY_INACTIVE_ROLE_COUNT,
      },
      Thresholds: {
        RequestSnapshotColdOrDirectCheckP95Ms: 50,
        RequestSnapshotWarmP95Ms: 5,
        DirectResolveDataScopeP95Ms: 75,
        Status: 'proposed-pending-owner-ratification',
      },
      TemperatureDefinition: {
        Cold: 'new application request context; authoritative PostgreSQL snapshot is resolved',
        Warm: 'same application request context; memoized authorization snapshot is reused',
        Caveat: 'does not flush PostgreSQL shared_buffers or the operating-system page cache',
      },
      Measurements: measurements,
    };

    const serializedReport = `${JSON.stringify(report, null, 2)}\n`;
    const reportPath = process.env.RH06_REPORT_PATH?.trim();
    if (reportPath) {
      if (!isAbsolute(reportPath)) throw new Error('RH06_REPORT_PATH must be absolute');
      writeFileSync(reportPath, serializedReport, { encoding: 'utf8', flag: 'wx' });
    }
    process.stdout.write(`RH06_MEASUREMENT_START\n${serializedReport}RH06_MEASUREMENT_END\n`);
    expect(measurements).toHaveLength(scenarios.length * 3);
    expect(measurements.every((measurement) => measurement.Correctness)).toBe(true);
  });
});

async function Capture(logger: QueryCounterLogger, work: () => Promise<CheckResult>): Promise<CapturedResult> {
  const captureId = logger.StartCapture();
  const started = performance.now();
  try {
    const result = await work();
    const durationMs = performance.now() - started;
    return { DurationMs: durationMs, Capture: logger.StopCapture(captureId), Result: result };
  } catch (error) {
    logger.StopCapture(captureId);
    throw error;
  }
}

async function MeasureScenario(input: {
  Scenario: Scenario;
  Mode: MeasurementMode;
  ExpectedDataQueryCount: number;
  ExpectedTransactionControlCount: number;
  ThresholdMs: number;
  Execute: () => Promise<CapturedResult>;
}): Promise<MeasurementRecord> {
  for (let index = 0; index < WARMUP_COUNT; index += 1) await input.Execute();

  const samples: CapturedResult[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const sample = await input.Execute();
    expect(Number.isFinite(sample.DurationMs)).toBe(true);
    expect(sample.DurationMs).toBeGreaterThanOrEqual(0);
    expect(sample.Result).toEqual(input.Scenario.ExpectedResult);
    expect(sample.Capture.DataQueryCount).toBe(input.ExpectedDataQueryCount);
    expect(sample.Capture.SelectQueryCount).toBe(input.ExpectedDataQueryCount);
    expect(sample.Capture.TransactionControlCount).toBe(input.ExpectedTransactionControlCount);
    expect(sample.Capture.ErrorCount).toBe(0);
    samples.push(sample);
  }

  const durations = samples.map((sample) => sample.DurationMs);
  const timing = BuildTimingSummary(durations, input.ThresholdMs);
  return {
    Scenario: input.Scenario.Name,
    Mode: input.Mode,
    WarmupCount: WARMUP_COUNT,
    SampleCount: SAMPLE_COUNT,
    DataQueryCount: input.ExpectedDataQueryCount,
    SelectQueryCount: input.ExpectedDataQueryCount,
    TransactionControlCount: input.ExpectedTransactionControlCount,
    ThresholdMs: input.ThresholdMs,
    ...timing,
    ExpectedResult: input.Scenario.ExpectedResult,
    Correctness: true,
  };
}

function ReadGitMetadata(): GitMetadata {
  const baselineCommit = Git('rev-parse', 'HEAD');
  expect(baselineCommit).toMatch(/^[0-9a-f]{40}$/);
  const expectedBaseline = process.env.RH06_BASELINE_COMMIT?.trim();
  if (expectedBaseline) expect(baselineCommit).toBe(expectedBaseline);

  const verifiedCleanPaths = [
    'src',
    'package.json',
    'yarn.lock',
    'tsconfig.json',
    'tsconfig.build.json',
    'jest.config.js',
  ];
  const productionStatus = Git('status', '--porcelain', '--untracked-files=all', '--', ...verifiedCleanPaths);
  expect(productionStatus).toBe('');
  const harnessFiles = [
    'test/Helpers/QueryCounterLogger.ts',
    'test/Helpers/QueryCounterLoggerSpec.ts',
    'test/Helpers/Rh06Measurement.ts',
    'test/Helpers/Rh06MeasurementSpec.ts',
    'test/Modules/AccessControl/AccessControl.PermissionCheckerPerformanceSpec.ts',
    'test/Scripts/RunRh06PermissionCheckerPerformance.ps1',
  ];
  const hash = createHash('sha256');
  for (const file of harnessFiles) {
    hash.update(file);
    hash.update('\0');
    hash.update(readFileSync(resolve(process.cwd(), file)));
    hash.update('\0');
  }
  return {
    BaselineCommit: baselineCommit,
    Branch: Git('branch', '--show-current'),
    ProductionSourceDirty: false,
    VerifiedCleanPaths: verifiedCleanPaths,
    HarnessFiles: harnessFiles,
    HarnessSourceSha256: hash.digest('hex'),
  };
}

function Git(...args: string[]): string {
  return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trim();
}

async function CreateFixture(dataSource: DataSource): Promise<Fixture> {
  return dataSource.transaction(async (manager) => {
    const suffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    const userIds: string[] = [];
    const roleIds: string[] = [];
    const createdPermissionIds: string[] = [];
    const createUser = async (label: string): Promise<string> => {
      const id = randomUUID();
      userIds.push(id);
      await manager.query(
        `INSERT INTO users (id, first_name, last_name, email_address, password_hash, role)
         VALUES ($1, 'RH06', $2, $3, NULL, 'User')`,
        [id, label, `rh06-${label.toLowerCase()}-${id}@example.invalid`],
      );
      return id;
    };
    const targetPermission = await EnsurePermission(manager, ActionCode.Read, ObjectType.Role, createdPermissionIds);
    const unrelatedPermission = await EnsurePermission(
      manager,
      ActionCode.Read,
      ObjectType.Permission,
      createdPermissionIds,
    );
    const scopedPermission = await EnsurePermission(
      manager,
      ActionCode.Read,
      ObjectType.Warehouse,
      createdPermissionIds,
    );
    const createRole = async (
      userId: string,
      label: string,
      status: RoleStatus,
      permissionIds: string[],
    ): Promise<string> => {
      const roleId = randomUUID();
      roleIds.push(roleId);
      await manager.query(
        `INSERT INTO roles (id, role_code, role_name, is_system, status)
         VALUES ($1, $2, $3, false, $4)`,
        [roleId, `RH06_${suffix}_${label}`.slice(0, 50), `RH-06 ${label}`, status],
      );
      await manager.query(`INSERT INTO user_roles (id, user_id, role_id, source) VALUES ($1, $2, $3, $4)`, [
        randomUUID(),
        userId,
        roleId,
        UserRoleSource.Manual,
      ]);
      for (const permissionId of permissionIds) {
        await manager.query(`INSERT INTO role_permissions (id, role_id, permission_id) VALUES ($1, $2, $3)`, [
          randomUUID(),
          roleId,
          permissionId,
        ]);
      }
      return roleId;
    };

    const noRoleUserId = await createUser('NoRole');
    const oneActiveUserId = await createUser('OneActive');
    await createRole(oneActiveUserId, 'ONE_ACTIVE', RoleStatus.Active, [targetPermission]);

    const inactiveMixUserId = await createUser('InactiveMix');
    await createRole(inactiveMixUserId, 'INACTIVE_TARGET', RoleStatus.Inactive, [targetPermission]);
    await createRole(inactiveMixUserId, 'ACTIVE_UNRELATED', RoleStatus.Active, [unrelatedPermission]);

    const manyRolesUserId = await createUser('ManyRoles');
    for (let index = 0; index < MANY_ACTIVE_ROLE_COUNT; index += 1) {
      await createRole(manyRolesUserId, `MANY_A_${String(index).padStart(2, '0')}`, RoleStatus.Active, [
        targetPermission,
      ]);
    }
    for (let index = 0; index < MANY_INACTIVE_ROLE_COUNT; index += 1) {
      await createRole(manyRolesUserId, `MANY_I_${String(index).padStart(2, '0')}`, RoleStatus.Inactive, [
        unrelatedPermission,
      ]);
    }

    const scopedUserId = await createUser('Scoped');
    const scopedRoleId = await createRole(scopedUserId, 'SCOPED', RoleStatus.Active, [scopedPermission]);
    const warehouseId = randomUUID();
    const ownerId = randomUUID();
    await manager.query(
      `INSERT INTO data_scopes (
         id, principal_type, principal_id, scope_type, scope_value_id, scope_value_code,
         include_all, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, NULL, false, now(), now())`,
      [randomUUID(), PrincipalType.User, scopedUserId, DataScopeType.Warehouse, warehouseId],
    );
    await manager.query(
      `INSERT INTO data_scopes (
         id, principal_type, principal_id, scope_type, scope_value_id, scope_value_code,
         include_all, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, NULL, NULL, true, now(), now())`,
      [randomUUID(), PrincipalType.Role, scopedRoleId, DataScopeType.Owner],
    );

    return {
      UserIds: userIds,
      RoleIds: roleIds,
      CreatedPermissionIds: createdPermissionIds,
      NoRoleUserId: noRoleUserId,
      OneActiveUserId: oneActiveUserId,
      InactiveMixUserId: inactiveMixUserId,
      ManyRolesUserId: manyRolesUserId,
      ScopedUserId: scopedUserId,
      WarehouseId: warehouseId,
      OwnerId: ownerId,
    };
  });
}

async function EnsurePermission(
  manager: EntityManager,
  action: ActionCode,
  objectType: ObjectType,
  createdPermissionIds: string[],
): Promise<string> {
  const existing = (await manager.query(
    `SELECT id::text AS "Id" FROM permissions WHERE action = $1 AND object_type = $2 LIMIT 1`,
    [action, objectType],
  )) as Array<{ Id: string }>;
  if (existing[0]) return existing[0].Id.trim();
  const id = randomUUID();
  await manager.query(`INSERT INTO permissions (id, permission_code, action, object_type) VALUES ($1, $2, $3, $4)`, [
    id,
    `${action}:${objectType}`,
    action,
    objectType,
  ]);
  createdPermissionIds.push(id);
  return id;
}

async function CleanupFixture(dataSource: DataSource, fixture: Fixture): Promise<void> {
  await dataSource.transaction(async (manager) => {
    const principals = [...fixture.UserIds, ...fixture.RoleIds];
    await manager.query(`DELETE FROM data_scopes WHERE principal_id = ANY($1::bpchar[])`, [principals]);
    await manager.query(`DELETE FROM user_roles WHERE user_id = ANY($1::bpchar[])`, [fixture.UserIds]);
    await manager.query(`DELETE FROM role_permissions WHERE role_id = ANY($1::bpchar[])`, [fixture.RoleIds]);
    await manager.query(`DELETE FROM roles WHERE id = ANY($1::bpchar[])`, [fixture.RoleIds]);
    await manager.query(`DELETE FROM users WHERE id = ANY($1::bpchar[])`, [fixture.UserIds]);
    if (fixture.CreatedPermissionIds.length > 0) {
      await manager.query(`DELETE FROM permissions WHERE id = ANY($1::bpchar[])`, [fixture.CreatedPermissionIds]);
    }
  });
}
