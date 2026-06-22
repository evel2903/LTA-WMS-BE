import { BarcodeLabelModule } from '@modules/BarcodeLabel/BarcodeLabelModule';
import { LabelBlockingController } from '@modules/BarcodeLabel/Presentation/Controllers/LabelBlockingController';
import { LabelBlockingDecision } from '@modules/BarcodeLabel/Domain/Enums/LabelBlockingDecision';
import { LabelTemplateOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/LabelTemplateOrmEntity';
import { LabelTemplateVersionOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/LabelTemplateVersionOrmEntity';
import { PrintJobOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/PrintJobOrmEntity';
import { ReprintRequestOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/ReprintRequestOrmEntity';
import { PrintJobStatus } from '@modules/BarcodeLabel/Domain/Enums/PrintJobStatus';
import dataSource from '@shared/Database/TypeOrmDataSource';

describe('BarcodeLabel schema registration', () => {
  it('registers ORM entities in module and migration datasource', () => {
    expect(Reflect.getMetadata('imports', BarcodeLabelModule)).toBeTruthy();
    expect(Reflect.getMetadata('controllers', BarcodeLabelModule)).toEqual(
      expect.arrayContaining([LabelBlockingController]),
    );
    expect(dataSource.options.entities).toEqual(
      expect.arrayContaining([
        LabelTemplateOrmEntity,
        LabelTemplateVersionOrmEntity,
        PrintJobOrmEntity,
        ReprintRequestOrmEntity,
      ]),
    );
  });

  it('keeps label blocking decisions out of InventoryStatus and print job lifecycle', () => {
    expect(Object.values(LabelBlockingDecision)).toEqual(
      expect.arrayContaining(['NotRequired', 'Allowed', 'Blocked', 'OverrideAccepted']),
    );
    for (const forbidden of ['LABEL_PRINTED', 'LABEL_READY', 'SHIPPED', 'GATE_OUT', 'GOODS_ISSUE_POSTED']) {
      expect(Object.values(PrintJobStatus)).not.toContain(forbidden);
    }
  });
});
