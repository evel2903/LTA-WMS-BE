import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PutawayTaskController } from '@modules/InventoryExecution/Presentation/Controllers/PutawayTaskController';
import { ConfirmPutawayTaskRequest } from '@modules/InventoryExecution/Presentation/Requests/ConfirmPutawayTaskRequest';

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
});
