export type HealthStatus = 'up' | 'down' | 'skipped';

export type HealthCheckResult = {
  Status: HealthStatus;
  Details?: unknown;
};

export type ReadyReport = {
  Status: 'ok' | 'error';
  Info: Record<string, HealthCheckResult>;
  Error: Record<string, HealthCheckResult>;
  Details: Record<string, HealthCheckResult>;
};

export const HEALTH_SERVICE = Symbol('IHealthService');

export interface IHealthService {
  Live(): Promise<{ Status: 'OK' }>;
  Ready(): Promise<ReadyReport>;
}
