import { RoleCatalogTokenPayload } from '@modules/AccessControl/Application/DTOs/RoleCatalogDto';

export const ROLE_CATALOG_TOKEN_CODEC = Symbol('IRoleCatalogTokenCodec');

export interface IRoleCatalogTokenCodec {
  IsAvailable(): boolean;
  ActiveKid(): string;
  Sign(payload: RoleCatalogTokenPayload): string;
  Verify(token: string): RoleCatalogTokenPayload;
}
