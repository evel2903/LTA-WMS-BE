import { createHmac, timingSafeEqual } from 'crypto';
import { CatalogVersionUnavailableException, ValidationAppException } from '@common/Exceptions/AppException';
import { ROLE_CATALOG_ORDER, RoleCatalogTokenPayload } from '@modules/AccessControl/Application/DTOs/RoleCatalogDto';
import { IRoleCatalogTokenCodec } from '@modules/AccessControl/Application/Interfaces/IRoleCatalogTokenCodec';

export interface RoleCatalogSigningOptions {
  ActiveKid: string;
  Keys: Record<string, string>;
  Valid?: boolean;
}

const DECIMAL = /^(0|[1-9][0-9]*)$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const MAX_TOKEN_LENGTH = 4096;
const MAX_KID_LENGTH = 64;
const MAX_BIGINT = 9223372036854775807n;

export class RoleCatalogTokenCodec implements IRoleCatalogTokenCodec {
  private readonly activeKid: string;
  private readonly keys: ReadonlyMap<string, Buffer>;
  private readonly configurationValid: boolean;

  constructor(options: RoleCatalogSigningOptions) {
    this.activeKid = options.ActiveKid.trim();
    const keys = new Map<string, Buffer>();
    let valid = options.Valid !== false && this.activeKid.length > 0 && this.activeKid.length <= MAX_KID_LENGTH;
    for (const [rawKid, rawSecret] of Object.entries(options.Keys)) {
      const kid = rawKid.trim();
      const secret = Buffer.from(rawSecret, 'utf8');
      if (kid.length === 0 || kid.length > MAX_KID_LENGTH || secret.length < 32 || keys.has(kid)) {
        valid = false;
        continue;
      }
      keys.set(kid, secret);
    }
    this.keys = keys;
    this.configurationValid = valid;
  }

  public IsAvailable(): boolean {
    return this.configurationValid && this.keys.has(this.activeKid);
  }

  public ActiveKid(): string {
    if (!this.IsAvailable()) throw new CatalogVersionUnavailableException('Role catalog signing key is unavailable');
    return this.activeKid;
  }

  public Sign(payload: RoleCatalogTokenPayload): string {
    const key = this.keys.get(payload.kid);
    if (!key || payload.kid !== this.ActiveKid()) {
      throw new CatalogVersionUnavailableException('Active role catalog signing key is unavailable');
    }
    this.AssertPayload(payload);
    const encodedPayload = Buffer.from(this.Serialize(payload), 'utf8').toString('base64url');
    const signature = createHmac('sha256', key).update(encodedPayload, 'ascii').digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  public Verify(token: string): RoleCatalogTokenPayload {
    try {
      if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) throw new Error('token length');
      const parts = token.split('.');
      if (parts.length !== 2) throw new Error('segment count');
      const [encodedPayload, encodedSignature] = parts;
      if (!BASE64URL.test(encodedPayload) || !BASE64URL.test(encodedSignature)) throw new Error('base64url');
      const payloadBuffer = Buffer.from(encodedPayload, 'base64url');
      if (payloadBuffer.toString('base64url') !== encodedPayload) throw new Error('non-canonical base64url');
      const parsed = JSON.parse(payloadBuffer.toString('utf8')) as RoleCatalogTokenPayload;
      this.AssertPayload(parsed);
      if (this.Serialize(parsed) !== payloadBuffer.toString('utf8')) throw new Error('non-canonical payload');
      const key = this.keys.get(parsed.kid);
      if (!key) throw new Error('unknown kid');
      const actual = Buffer.from(encodedSignature, 'base64url');
      if (actual.toString('base64url') !== encodedSignature) throw new Error('non-canonical signature');
      const expected = createHmac('sha256', key).update(encodedPayload, 'ascii').digest();
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('signature');
      return parsed;
    } catch {
      throw new ValidationAppException('Invalid role catalog token', { Reason: 'CATALOG_TOKEN_INVALID' });
    }
  }

  private Serialize(payload: RoleCatalogTokenPayload): string {
    return JSON.stringify({
      v: 1,
      kid: payload.kid,
      catalogVersion: payload.catalogVersion,
      pageSize: payload.pageSize,
      order: payload.order,
      nextPage: payload.nextPage,
      totalItems: payload.totalItems,
      totalPages: payload.totalPages,
    });
  }

  private AssertPayload(payload: RoleCatalogTokenPayload): void {
    if (
      !payload ||
      payload.v !== 1 ||
      typeof payload.kid !== 'string' ||
      payload.kid.length === 0 ||
      payload.kid.length > MAX_KID_LENGTH ||
      typeof payload.catalogVersion !== 'string' ||
      !DECIMAL.test(payload.catalogVersion) ||
      payload.catalogVersion.length > 19 ||
      BigInt(payload.catalogVersion) > MAX_BIGINT ||
      payload.order !== ROLE_CATALOG_ORDER ||
      !Number.isSafeInteger(payload.pageSize) ||
      payload.pageSize < 1 ||
      payload.pageSize > 100 ||
      !Number.isSafeInteger(payload.nextPage) ||
      payload.nextPage < 2 ||
      !Number.isSafeInteger(payload.totalItems) ||
      payload.totalItems < 0 ||
      !Number.isSafeInteger(payload.totalPages) ||
      payload.totalPages < 1
    ) {
      throw new Error('invalid payload');
    }
  }
}
