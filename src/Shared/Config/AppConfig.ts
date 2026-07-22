import { registerAs } from '@nestjs/config';
import { GetEnv } from '@shared/Config/Env/Env';

export type AppConfigValues = {
  NodeEnv: string;
  Port: number;
};

export type DatabaseConfigValues = {
  Host: string;
  Port: number;
  Username: string;
  Password: string;
  Database: string;
};

export type JwtConfigValues = {
  Secret: string;
  Expiration: string;
  RefreshSecret: string;
  RefreshExpiration: string;
};

export type RedisConfigValues = {
  Url?: string;
  KeyPrefix: string;
};

export type EmailConfigValues = {
  Host?: string;
  Port: number;
  Secure: boolean;
  Username?: string;
  Password?: string;
  From?: string;
};

export type RoleCatalogConfigValues = {
  ActiveKid: string;
  Keys: Record<string, string>;
  Valid: boolean;
};

function HasDuplicateNormalizedJsonKeys(raw: string): boolean {
  const keyPattern = /"((?:\\.|[^"\\])*)"\s*:/g;
  const seen = new Set<string>();
  for (const match of raw.matchAll(keyPattern)) {
    try {
      const key = String(JSON.parse(`"${match[1]}"`)).trim();
      if (seen.has(key)) return true;
      seen.add(key);
    } catch {
      return true;
    }
  }
  return false;
}

export const AppConfig = registerAs('App', (): AppConfigValues => {
  const env = GetEnv();
  return { NodeEnv: env.NodeEnv, Port: env.Port };
});

export const DatabaseAppConfig = registerAs('Database', (): DatabaseConfigValues => {
  const env = GetEnv();
  return {
    Host: env.DbHost,
    Port: env.DbPort,
    Username: env.DbUsername,
    Password: env.DbPassword,
    Database: env.DbDatabase,
  };
});

export const JwtAppConfig = registerAs('Jwt', (): JwtConfigValues => {
  const env = GetEnv();
  return {
    Secret: env.JwtSecret,
    Expiration: env.JwtExpiration,
    RefreshSecret: env.JwtRefreshSecret,
    RefreshExpiration: env.JwtRefreshExpiration,
  };
});

export const RedisAppConfig = registerAs('Redis', (): RedisConfigValues => {
  return {
    Url: process.env.REDIS_URL,
    KeyPrefix: process.env.REDIS_KEY_PREFIX ?? 'appseed:',
  };
});

export const EmailAppConfig = registerAs('Email', (): EmailConfigValues => {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return {
    Host: process.env.SMTP_HOST,
    Port: Number.isFinite(port) ? port : 587,
    Secure: String(process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
    Username: process.env.SMTP_USERNAME,
    Password: process.env.SMTP_PASSWORD,
    From: process.env.SMTP_FROM,
  };
});

export const RoleCatalogAppConfig = registerAs('RoleCatalog', (): RoleCatalogConfigValues => {
  const activeKid = process.env.ROLE_CATALOG_SIGNING_ACTIVE_KID?.trim() ?? '';
  const rawKeys = process.env.ROLE_CATALOG_SIGNING_KEYS?.trim();
  if (!rawKeys) return { ActiveKid: activeKid, Keys: {}, Valid: false };
  try {
    if (HasDuplicateNormalizedJsonKeys(rawKeys)) {
      return { ActiveKid: activeKid, Keys: {}, Valid: false };
    }
    const parsed = JSON.parse(rawKeys) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ActiveKid: activeKid, Keys: {}, Valid: false };
    }
    const keys: Record<string, string> = {};
    let valid = activeKid.length > 0 && activeKid.length <= 64;
    for (const [rawKid, value] of Object.entries(parsed)) {
      const kid = rawKid.trim();
      if (
        typeof value !== 'string' ||
        kid.length === 0 ||
        kid.length > 64 ||
        Buffer.byteLength(value, 'utf8') < 32 ||
        Object.prototype.hasOwnProperty.call(keys, kid)
      ) {
        valid = false;
        continue;
      }
      if (value === process.env.JWT_SECRET || value === process.env.JWT_REFRESH_SECRET) {
        valid = false;
        continue;
      }
      keys[kid] = value;
    }
    valid = valid && Object.prototype.hasOwnProperty.call(keys, activeKid);
    return { ActiveKid: activeKid, Keys: keys, Valid: valid };
  } catch {
    return { ActiveKid: activeKid, Keys: {}, Valid: false };
  }
});
