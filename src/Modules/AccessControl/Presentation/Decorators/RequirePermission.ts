import { SetMetadata } from '@nestjs/common';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';

export const REQUIRE_PERMISSION_KEY = 'RequirePermission';

/** Where a scope id is read from on the incoming request. */
export interface ScopeSource {
  In: 'param' | 'body' | 'query';
  Key: string;
}

/**
 * Per-route data-scope config: which request location supplies each axis. Only
 * request-resident scope is enforced by the guard; omit an axis (or the whole
 * config) when scope is entity-resident (PATCH/:id) or the object has no scope.
 */
export interface ScopeConfig {
  WarehouseId?: ScopeSource;
  ZoneId?: ScopeSource;
  OwnerId?: ScopeSource;
}

export interface RequirePermissionMetadata {
  Action: ActionCode;
  ObjectType: ObjectType;
  Scope?: ScopeConfig;
}

/**
 * Declares the `(action, object)` a route requires, plus optional request-resident
 * scope sources. `PermissionGuard` reads this metadata. Args are enum members
 * (e.g. `ObjectType.Sku`), not raw strings.
 */
export const RequirePermission = (action: ActionCode, objectType: ObjectType, scope?: ScopeConfig) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, {
    Action: action,
    ObjectType: objectType,
    Scope: scope,
  } as RequirePermissionMetadata);
