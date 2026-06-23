import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { InventoryControlController } from '@modules/InventoryExecution/Presentation/Controllers/InventoryControlController';
import { PutawayTaskController } from '@modules/InventoryExecution/Presentation/Controllers/PutawayTaskController';
import { ChangeInventoryStatusRequest } from '@modules/InventoryExecution/Presentation/Requests/ChangeInventoryStatusRequest';
import { ConfirmPutawayTaskRequest } from '@modules/InventoryExecution/Presentation/Requests/ConfirmPutawayTaskRequest';
import { MoveInventoryInternalRequest } from '@modules/InventoryExecution/Presentation/Requests/MoveInventoryInternalRequest';

describe('InventoryExecution putaway controller contract', () => {
  it('exposes confirm endpoint with PutawayTask Update permission metadata', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PutawayTaskController)).toBe('putaway/tasks');
    expect(Reflect.getMetadata(PATH_METADATA, PutawayTaskController.prototype.Confirm)).toBe(':id/confirm');
    expect(Reflect.getMetadata(METHOD_METADATA, PutawayTaskController.prototype.Confirm)).toBe(1);
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, PutawayTaskController.prototype.Confirm)).toEqual({
      Action: ActionCode.Update,
      ObjectType: ObjectType.PutawayTask,
      Scope: undefined,
    });
  });

  it('validates required confirm scans, positive quantity and idempotency key', () => {
    const request = plainToInstance(ConfirmPutawayTaskRequest, {
      ConfirmedQuantity: 0,
      EvidenceRefs: Array.from({ length: 21 }, (_, index) => `scan://${index}`),
    });
    const properties = validateSync(request).map((error) => error.property);

    expect(properties).toEqual(
      expect.arrayContaining([
        'SourceLocationScan',
        'TargetLocationScan',
        'ConfirmedQuantity',
        'EvidenceRefs',
        'IdempotencyKey',
      ]),
    );
  });

  it('accepts valid confirm request shape', () => {
    const request = plainToInstance(ConfirmPutawayTaskRequest, {
      SourceLocationScan: 'RCV-STG-01',
      TargetLocationScan: 'A-01',
      LpnScan: 'LPN-001',
      ConfirmedQuantity: 5,
      EvidenceRefs: ['scan://confirm-1'],
      DeviceCode: 'RF-01',
      SessionId: 'session-1',
      IdempotencyKey: 'confirm-key-1',
    });

    expect(validateSync(request)).toHaveLength(0);
  });

  it('exposes inventory control status and movement endpoints with InventoryMovement Adjust permission', () => {
    expect(Reflect.getMetadata(PATH_METADATA, InventoryControlController)).toBe('inventory-control');
    expect(Reflect.getMetadata(PATH_METADATA, InventoryControlController.prototype.ChangeStatus)).toBe(
      'status-changes',
    );
    expect(Reflect.getMetadata(PATH_METADATA, InventoryControlController.prototype.MoveInternal)).toBe('movements');
    expect(Reflect.getMetadata(METHOD_METADATA, InventoryControlController.prototype.ChangeStatus)).toBe(1);
    expect(Reflect.getMetadata(METHOD_METADATA, InventoryControlController.prototype.MoveInternal)).toBe(1);
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, InventoryControlController.prototype.ChangeStatus)).toEqual({
      Action: ActionCode.Adjust,
      ObjectType: ObjectType.InventoryMovement,
      Scope: undefined,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, InventoryControlController.prototype.MoveInternal)).toEqual({
      Action: ActionCode.Adjust,
      ObjectType: ObjectType.InventoryMovement,
      Scope: undefined,
    });
  });

  it('validates inventory control request shapes and requires reason/idempotency', () => {
    const statusRequest = plainToInstance(ChangeInventoryStatusRequest, {
      Quantity: 0,
      EvidenceRefs: Array.from({ length: 21 }, (_, index) => `evidence://${index}`),
    });
    const moveRequest = plainToInstance(MoveInventoryInternalRequest, { Quantity: 0 });

    expect(validateSync(statusRequest).map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'SourceBalanceId',
        'TargetInventoryStatusCode',
        'Quantity',
        'ReasonCode',
        'EvidenceRefs',
        'IdempotencyKey',
      ]),
    );
    expect(validateSync(moveRequest).map((error) => error.property)).toEqual(
      expect.arrayContaining(['SourceBalanceId', 'TargetLocationId', 'Quantity', 'ReasonCode', 'IdempotencyKey']),
    );
  });

  it('accepts valid inventory control request shapes', () => {
    const statusRequest = plainToInstance(ChangeInventoryStatusRequest, {
      SourceBalanceId: 'balance-source',
      TargetInventoryStatusCode: 'AVAILABLE',
      Quantity: 1,
      ReasonCode: 'INV_RELEASE',
      ReasonNote: 'Release sau QC',
      EvidenceRefs: ['qc://result-1'],
      IdempotencyKey: 'status-key-1',
    });
    const moveRequest = plainToInstance(MoveInventoryInternalRequest, {
      SourceBalanceId: 'balance-source',
      TargetLocationId: 'loc-target',
      Quantity: 1,
      ReasonCode: 'INTERNAL_MOVE',
      ReasonNote: 'Move nội bộ',
      EvidenceRefs: ['move://work-1'],
      IdempotencyKey: 'move-key-1',
    });

    expect(validateSync(statusRequest)).toHaveLength(0);
    expect(validateSync(moveRequest)).toHaveLength(0);
  });
});
