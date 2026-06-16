export type NodeEnv = 'development' | 'test' | 'production';

export type AppEnv = {
  NodeEnv: NodeEnv;
  Port: number;
  DbHost: string;
  DbPort: number;
  DbUsername: string;
  DbPassword: string;
  DbDatabase: string;
  JwtSecret: string;
  JwtExpiration: string;
};

type EnvSource = Record<string, string | undefined>;

const GetRequired = (key: string, value: string | undefined): string => {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const ParseNumber = (key: string, raw: string | undefined, defaultValue?: number): number => {
  const value = raw ?? (defaultValue !== undefined ? String(defaultValue) : undefined);
  const requiredValue = GetRequired(key, value);
  const parsed = Number(requiredValue);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for environment variable: ${key}`);
  }
  return parsed;
};

const ParseNodeEnv = (raw: string | undefined): NodeEnv => {
  const value = (raw ?? 'development') as NodeEnv;
  if (value !== 'development' && value !== 'test' && value !== 'production') {
    throw new Error(`Invalid NODE_ENV: ${raw}`);
  }
  return value;
};

export const GetEnv = (source: EnvSource = process.env): AppEnv => {
  return {
    NodeEnv: ParseNodeEnv(source.NODE_ENV),
    Port: ParseNumber('PORT', source.PORT, 3000),
    DbHost: GetRequired('DB_HOST', source.DB_HOST),
    DbPort: ParseNumber('DB_PORT', source.DB_PORT, 3306),
    DbUsername: GetRequired('DB_USERNAME', source.DB_USERNAME),
    DbPassword: GetRequired('DB_PASSWORD', source.DB_PASSWORD),
    DbDatabase: GetRequired('DB_DATABASE', source.DB_DATABASE),
    JwtSecret: GetRequired('JWT_SECRET', source.JWT_SECRET),
    JwtExpiration: GetRequired('JWT_EXPIRATION', source.JWT_EXPIRATION),
  };
};

export const ValidateProcessEnv = (source: Record<string, unknown>): Record<string, unknown> => {
  GetEnv(source as EnvSource);
  return source;
};
