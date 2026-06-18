import { ConflictException } from '@common/Exceptions/AppException';
import { ItemCoverageEntity } from '@modules/MasterData/Domain/Entities/ItemCoverageEntity';
import { PackDefinitionEntity } from '@modules/MasterData/Domain/Entities/PackDefinitionEntity';
import { SkuBarcodeEntity } from '@modules/MasterData/Domain/Entities/SkuBarcodeEntity';
import { UomConversionEntity } from '@modules/MasterData/Domain/Entities/UomConversionEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { ItemCoverageRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/ItemCoverageRepository';
import { PackDefinitionRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/PackDefinitionRepository';
import { SkuBarcodeRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/SkuBarcodeRepository';
import { UomConversionRepository } from '@modules/MasterData/Infrastructure/Persistence/Repositories/UomConversionRepository';

const DuplicateKeyError = () => Object.assign(new Error('duplicate key'), { code: '23505' });
const ExclusionViolationError = () => Object.assign(new Error('exclusion constraint'), { code: '23P01' });
const Now = new Date('2026-01-01T00:00:00.000Z');

describe('SKU support repositories', () => {
  it('maps SkuBarcode DB unique violation 23505 to ConflictException', async () => {
    const ormRepository = { save: jest.fn().mockRejectedValue(DuplicateKeyError()) };
    const repository = new SkuBarcodeRepository(ormRepository as never);

    await expect(
      repository.Create(
        new SkuBarcodeEntity({
          Id: 'barcode-1',
          SkuId: 'sku-1',
          OwnerId: null,
          UomId: 'uom-ea',
          PackCode: null,
          BarcodeValue: '0123456789012',
          BarcodeType: 'EAN13',
          IsPrimary: false,
          Status: MasterDataStatus.Active,
          CreatedAt: Now,
          UpdatedAt: Now,
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps PackDefinition DB unique violation 23505 to ConflictException', async () => {
    const ormRepository = { save: jest.fn().mockRejectedValue(DuplicateKeyError()) };
    const repository = new PackDefinitionRepository(ormRepository as never);

    await expect(
      repository.Create(
        new PackDefinitionEntity({
          Id: 'pack-1',
          SkuId: 'sku-1',
          PackCode: 'CASE',
          PackName: 'Case',
          UomId: 'uom-ea',
          QuantityPerPack: 12,
          IsDefault: true,
          Status: MasterDataStatus.Active,
          CreatedAt: Now,
          UpdatedAt: Now,
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps UomConversion DB unique violation 23505 to ConflictException', async () => {
    const ormRepository = { save: jest.fn().mockRejectedValue(DuplicateKeyError()) };
    const repository = new UomConversionRepository(ormRepository as never);

    await expect(
      repository.Create(
        new UomConversionEntity({
          Id: 'conversion-1',
          SkuId: 'sku-1',
          FromUomId: 'uom-case',
          ToUomId: 'uom-ea',
          Factor: 12,
          EffectiveFrom: Now,
          EffectiveTo: null,
          Status: MasterDataStatus.Active,
          CreatedAt: Now,
          UpdatedAt: Now,
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps UomConversion DB exclusion violation 23P01 to ConflictException', async () => {
    const ormRepository = { save: jest.fn().mockRejectedValue(ExclusionViolationError()) };
    const repository = new UomConversionRepository(ormRepository as never);

    await expect(
      repository.Create(
        new UomConversionEntity({
          Id: 'conversion-1',
          SkuId: 'sku-1',
          FromUomId: 'uom-case',
          ToUomId: 'uom-ea',
          Factor: 12,
          EffectiveFrom: Now,
          EffectiveTo: null,
          Status: MasterDataStatus.Active,
          CreatedAt: Now,
          UpdatedAt: Now,
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps ItemCoverage DB unique violation 23505 to ConflictException', async () => {
    const ormRepository = { save: jest.fn().mockRejectedValue(DuplicateKeyError()) };
    const repository = new ItemCoverageRepository(ormRepository as never);

    await expect(
      repository.Create(
        new ItemCoverageEntity({
          Id: 'coverage-1',
          SkuId: 'sku-1',
          WarehouseId: 'warehouse-tier-1',
          OwnerId: null,
          Status: MasterDataStatus.Active,
          CreatedAt: Now,
          UpdatedAt: Now,
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
