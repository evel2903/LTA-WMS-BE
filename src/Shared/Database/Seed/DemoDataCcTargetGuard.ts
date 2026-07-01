import type { AppEnv } from '@shared/Config/Env/Env';

type TypeOrmConnectionTargetOptions = {
  host?: unknown;
  port?: unknown;
  database?: unknown;
};

export type DemoDataCcTargetSummary = {
  NodeEnv: AppEnv['NodeEnv'];
  DbHost: string;
  DbPort: number;
  DbDatabase: string;
  EnvSource: string;
};

export const DemoDataCcAllowedLocalHosts = [
  'localhost',
  '127.0.0.1',
  '::1',
  'postgres',
  'host.docker.internal',
] as const;

export const DemoDataCcRejectedDatabaseNameTerms = ['production', 'staging', 'prod', 'stage', 'uat', 'live'] as const;

export const BuildDemoDataCcTargetSummary = (
  env: Pick<AppEnv, 'NodeEnv' | 'DbHost' | 'DbPort' | 'DbDatabase'>,
  envSource = 'process.env',
): DemoDataCcTargetSummary => ({
  NodeEnv: env.NodeEnv,
  DbHost: env.DbHost.trim(),
  DbPort: env.DbPort,
  DbDatabase: env.DbDatabase.trim(),
  EnvSource: envSource,
});

export const FormatDemoDataCcTargetSummary = (summary: DemoDataCcTargetSummary): string => {
  return [
    `NODE_ENV=${summary.NodeEnv}`,
    `DB_HOST=${summary.DbHost}`,
    `DB_PORT=${summary.DbPort}`,
    `DB_DATABASE=${summary.DbDatabase}`,
    `ENV_SOURCE=${summary.EnvSource}`,
  ].join(' ');
};

export const ValidateDemoDataCcTarget = (summary: DemoDataCcTargetSummary): void => {
  if (!summary.DbHost) {
    throw new Error('DEMO-DATA-LTA reset blocked: DB_HOST is required.');
  }

  if (!summary.DbDatabase) {
    throw new Error('DEMO-DATA-LTA reset blocked: DB_DATABASE is required.');
  }

  if (!Number.isFinite(summary.DbPort) || summary.DbPort <= 0) {
    throw new Error('DEMO-DATA-LTA reset blocked: DB_PORT must be a positive number.');
  }

  if (summary.NodeEnv === 'production') {
    throw new Error('DEMO-DATA-LTA reset blocked: NODE_ENV=production is not allowed.');
  }

  const host = summary.DbHost.toLowerCase();
  if (!DemoDataCcAllowedLocalHosts.includes(host as (typeof DemoDataCcAllowedLocalHosts)[number])) {
    throw new Error(`DEMO-DATA-LTA reset blocked: DB_HOST=${summary.DbHost} is not an allowed local target.`);
  }

  const dbName = summary.DbDatabase.toLowerCase();
  const rejectedTerm = DemoDataCcRejectedDatabaseNameTerms.find((term) => dbName.includes(term));
  if (rejectedTerm) {
    throw new Error(`DEMO-DATA-LTA reset blocked: DB_DATABASE contains forbidden term "${rejectedTerm}".`);
  }
};

export const AssertDemoDataCcLocalTarget = (
  env: Pick<AppEnv, 'NodeEnv' | 'DbHost' | 'DbPort' | 'DbDatabase'>,
  envSource = 'process.env',
): DemoDataCcTargetSummary => {
  const summary = BuildDemoDataCcTargetSummary(env, envSource);
  ValidateDemoDataCcTarget(summary);
  return summary;
};

const ReadConnectionTextOption = (
  options: TypeOrmConnectionTargetOptions,
  key: keyof TypeOrmConnectionTargetOptions,
): string => (typeof options[key] === 'string' ? options[key].trim() : '');

const ReadConnectionPortOption = (options: TypeOrmConnectionTargetOptions): number => {
  const port = options.port;
  if (typeof port === 'number') return port;
  if (typeof port === 'string') return Number(port);

  return Number.NaN;
};

export const BuildDemoDataCcTargetSummaryFromConnectionOptions = (
  options: TypeOrmConnectionTargetOptions,
  env: Pick<AppEnv, 'NodeEnv'>,
  envSource = 'TypeORM connection options',
): DemoDataCcTargetSummary => ({
  NodeEnv: env.NodeEnv,
  DbHost: ReadConnectionTextOption(options, 'host'),
  DbPort: ReadConnectionPortOption(options),
  DbDatabase: ReadConnectionTextOption(options, 'database'),
  EnvSource: envSource,
});

export const AssertDemoDataCcLocalConnectionTarget = (
  options: TypeOrmConnectionTargetOptions,
  env: Pick<AppEnv, 'NodeEnv'>,
  envSource = 'TypeORM connection options',
): DemoDataCcTargetSummary => {
  const summary = BuildDemoDataCcTargetSummaryFromConnectionOptions(options, env, envSource);
  ValidateDemoDataCcTarget(summary);
  return summary;
};
