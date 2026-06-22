import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { REQUIRE_PERMISSION_KEY } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { LabelBlockingController } from '@modules/BarcodeLabel/Presentation/Controllers/LabelBlockingController';
import { LabelTemplateController } from '@modules/BarcodeLabel/Presentation/Controllers/LabelTemplateController';
import { PrintJobController } from '@modules/BarcodeLabel/Presentation/Controllers/PrintJobController';

describe('BarcodeLabel controllers', () => {
  it('guards label template routes with LabelTemplate permissions', () => {
    expect(Reflect.getMetadata(PATH_METADATA, LabelTemplateController)).toBe('label-templates');
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, LabelTemplateController.prototype.Create)).toEqual({
      Action: ActionCode.Create,
      ObjectType: ObjectType.LabelTemplate,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, LabelTemplateController.prototype.List)).toEqual({
      Action: ActionCode.Read,
      ObjectType: ObjectType.LabelTemplate,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, LabelTemplateController.prototype.AddVersion)).toEqual({
      Action: ActionCode.Update,
      ObjectType: ObjectType.LabelTemplate,
    });
  });

  it('guards print job routes with PrintJob permissions', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PrintJobController)).toBe('print-jobs');
    expect(Reflect.getMetadata(PATH_METADATA, PrintJobController.prototype.Preview)).toBe('preview');
    expect(Reflect.getMetadata(METHOD_METADATA, PrintJobController.prototype.Preview)).toBe(1);
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, PrintJobController.prototype.Preview)).toEqual({
      Action: ActionCode.Create,
      ObjectType: ObjectType.PrintJob,
    });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, PrintJobController.prototype.Reprint)).toEqual({
      Action: ActionCode.Reprint,
      ObjectType: ObjectType.PrintJob,
    });
  });

  it('guards label blocking validation with PrintJob read and request scope', () => {
    expect(Reflect.getMetadata(PATH_METADATA, LabelBlockingController)).toBe('label-blocking');
    expect(Reflect.getMetadata(PATH_METADATA, LabelBlockingController.prototype.Validate)).toBe('validate');
    expect(Reflect.getMetadata(METHOD_METADATA, LabelBlockingController.prototype.Validate)).toBe(1);
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, LabelBlockingController.prototype.Validate)).toEqual({
      Action: ActionCode.Read,
      ObjectType: ObjectType.PrintJob,
      Scope: {
        WarehouseId: { In: 'body', Key: 'WarehouseId' },
        OwnerId: { In: 'body', Key: 'OwnerId' },
      },
    });
  });
});
