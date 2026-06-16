import { registerAs } from '@nestjs/config';
import { GetEnv } from './Env/Env';

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
  return { Secret: env.JwtSecret, Expiration: env.JwtExpiration };
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
