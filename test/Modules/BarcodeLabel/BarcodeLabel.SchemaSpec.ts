import { BarcodeLabelModule } from '@modules/BarcodeLabel/BarcodeLabelModule';
import { LabelTemplateOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/LabelTemplateOrmEntity';
import { LabelTemplateVersionOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/LabelTemplateVersionOrmEntity';
import { PrintJobOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/PrintJobOrmEntity';
import { ReprintRequestOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/ReprintRequestOrmEntity';
import dataSource from '@shared/Database/TypeOrmDataSource';

describe('BarcodeLabel schema registration', () => {
  it('registers ORM entities in module and migration datasource', () => {
    expect(Reflect.getMetadata('imports', BarcodeLabelModule)).toBeTruthy();
    expect(dataSource.options.entities).toEqual(
      expect.arrayContaining([
        LabelTemplateOrmEntity,
        LabelTemplateVersionOrmEntity,
        PrintJobOrmEntity,
        ReprintRequestOrmEntity,
      ]),
    );
  });
});
