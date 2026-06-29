import { BusinessRuleException } from '@common/Exceptions/AppException';
import { SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ImportInboundPlanLinesUseCase } from '@modules/Inbound/Application/UseCases/ImportInboundPlanLinesUseCase';
import { CreateInboundPlanUseCase } from '@modules/Inbound/Application/UseCases/CreateInboundPlanUseCase';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import {
  ISkuCodeBatchLookup,
  IUomCodeBatchLookup,
} from '@modules/Inbound/Application/Interfaces/IMasterDataCodeLookup';
import { ExcelJsSpreadsheetService } from '@modules/Spreadsheet/Infrastructure/Adapters/ExcelJsSpreadsheetService';

const HEADERS = ['skuCode', 'uomCode', 'expectedQuantity', 'externalLineReference'];

const spreadsheet = new ExcelJsSpreadsheetService();

async function xlsxBuffer(rows: Array<Record<string, unknown>>, headers: string[] = HEADERS): Promise<Buffer> {
  return spreadsheet.BuildTemplate(
    headers.map((header) => ({ Header: header, Key: header })),
    rows,
  );
}

function sku(code: string, status: SkuStatus = SkuStatus.Active): SkuEntity {
  return { Id: `${code}-id`, SkuCode: code, ItemStatus: status } as unknown as SkuEntity;
}
function uom(code: string, status: MasterDataStatus = MasterDataStatus.Active): UomEntity {
  return { Id: `${code}-id`, UomCode: code, Status: status } as unknown as UomEntity;
}

// Fake repo trả về các bản ghi khớp code trong tập đã biết (mô phỏng FindByCodes batch).
function fakeSkuRepo(known: SkuEntity[]): ISkuCodeBatchLookup {
  return {
    FindByCodes: jest.fn((codes: string[]) => Promise.resolve(known.filter((s) => codes.includes(s.SkuCode)))),
  } as unknown as ISkuCodeBatchLookup;
}
function fakeUomRepo(known: UomEntity[]): IUomCodeBatchLookup {
  return {
    FindByCodes: jest.fn((codes: string[]) => Promise.resolve(known.filter((u) => codes.includes(u.UomCode)))),
  } as unknown as IUomCodeBatchLookup;
}

const header = {
  SourceSystem: 'ERP',
  SourceDocumentType: 'ASN',
  SourceDocumentNumber: 'ASN-10001',
  SupplierId: 'supplier-1',
  OwnerId: 'owner-1',
  WarehouseId: 'warehouse-1',
};

describe('ImportInboundPlanLinesUseCase', () => {
  it('previews valid rows: resolves ids and reports all valid (no plan created)', async () => {
    const create = { ExecuteWithResolvedLines: jest.fn() } as unknown as CreateInboundPlanUseCase;
    const useCase = new ImportInboundPlanLinesUseCase(
      spreadsheet,
      fakeSkuRepo([sku('SKU-A'), sku('SKU-B')]),
      fakeUomRepo([uom('EA'), uom('CASE')]),
      create,
    );
    const buffer = await xlsxBuffer([
      { skuCode: 'SKU-A', uomCode: 'EA', expectedQuantity: 12, externalLineReference: '10' },
      { skuCode: 'SKU-B', uomCode: 'CASE', expectedQuantity: 24, externalLineReference: '20' },
    ]);

    const preview = await useCase.Preview(buffer, 'lines.xlsx');

    expect(preview.HeaderError).toBeNull();
    expect(preview.Summary).toEqual({ Total: 2, Valid: 2, Invalid: 0 });
    expect(preview.Rows[0].SkuId).toBe('SKU-A-id');
    expect(preview.Rows[0].UomId).toBe('EA-id');
    expect(create.ExecuteWithResolvedLines).not.toHaveBeenCalled();
  });

  it('previews per-row errors: unknown sku/uom, non-positive quantity, duplicate reference', async () => {
    const create = { ExecuteWithResolvedLines: jest.fn() } as unknown as CreateInboundPlanUseCase;
    const useCase = new ImportInboundPlanLinesUseCase(
      spreadsheet,
      fakeSkuRepo([sku('SKU-A')]),
      fakeUomRepo([uom('EA')]),
      create,
    );
    const buffer = await xlsxBuffer([
      { skuCode: 'SKU-X', uomCode: 'EA', expectedQuantity: 0, externalLineReference: '10' },
      { skuCode: 'SKU-A', uomCode: 'BAD', expectedQuantity: 5, externalLineReference: '10' },
    ]);

    const preview = await useCase.Preview(buffer, 'lines.xlsx');

    expect(preview.Summary.Invalid).toBe(2);
    expect(preview.Rows[0].Errors.join(' ')).toContain('SKU SKU-X không tồn tại');
    expect(preview.Rows[0].Errors.join(' ')).toContain('expectedQuantity phải lớn hơn 0');
    expect(preview.Rows[1].Errors.join(' ')).toContain('Đơn vị tính BAD không tồn tại');
    expect(preview.Rows[1].Errors.join(' ')).toContain('bị trùng trong file');
  });

  it('reports a header error when a required column is missing', async () => {
    const create = { ExecuteWithResolvedLines: jest.fn() } as unknown as CreateInboundPlanUseCase;
    const useCase = new ImportInboundPlanLinesUseCase(spreadsheet, fakeSkuRepo([]), fakeUomRepo([]), create);
    const buffer = await xlsxBuffer([{ skuCode: 'SKU-A', uomCode: 'EA' }], ['skuCode', 'uomCode']);

    const preview = await useCase.Preview(buffer, 'lines.xlsx');

    expect(preview.HeaderError).toContain('expectedQuantity');
    expect(preview.Rows).toHaveLength(0);
  });

  it('commits a clean file: creates the plan atomically with resolved line ids', async () => {
    const executeWithResolvedLines = jest.fn().mockResolvedValue({ Id: 'plan-1' });
    const create = { ExecuteWithResolvedLines: executeWithResolvedLines } as unknown as CreateInboundPlanUseCase;
    const useCase = new ImportInboundPlanLinesUseCase(
      spreadsheet,
      fakeSkuRepo([sku('SKU-A')]),
      fakeUomRepo([uom('EA')]),
      create,
    );
    const buffer = await xlsxBuffer([
      { skuCode: 'SKU-A', uomCode: 'EA', expectedQuantity: 12, externalLineReference: '10' },
    ]);

    const result = await useCase.Commit(buffer, 'lines.xlsx', header, SystemAuditContext);

    expect(result).toEqual({ Id: 'plan-1' });
    expect(executeWithResolvedLines).toHaveBeenCalledTimes(1);
    const [request, lineRefs] = executeWithResolvedLines.mock.calls[0];
    expect(request).toMatchObject({ SourceDocumentNumber: 'ASN-10001', WarehouseId: 'warehouse-1' });
    expect(request.Lines[0]).toMatchObject({ SkuId: 'SKU-A-id', UomId: 'EA-id', ExpectedQuantity: 12 });
    expect(lineRefs[0]).toMatchObject({ SkuCode: 'SKU-A', UomCode: 'EA' });
  });

  it('refuses to commit a file with row errors (no partial create)', async () => {
    const executeWithResolvedLines = jest.fn();
    const create = { ExecuteWithResolvedLines: executeWithResolvedLines } as unknown as CreateInboundPlanUseCase;
    const useCase = new ImportInboundPlanLinesUseCase(
      spreadsheet,
      fakeSkuRepo([sku('SKU-A')]),
      fakeUomRepo([uom('EA')]),
      create,
    );
    const buffer = await xlsxBuffer([
      { skuCode: 'SKU-A', uomCode: 'EA', expectedQuantity: 12, externalLineReference: '10' },
      { skuCode: 'SKU-X', uomCode: 'EA', expectedQuantity: 5, externalLineReference: '20' },
    ]);

    await expect(useCase.Commit(buffer, 'lines.xlsx', header, SystemAuditContext)).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
    expect(executeWithResolvedLines).not.toHaveBeenCalled();
  });

  it('handles a large file (1000 rows) with a single batch lookup per master-data type', async () => {
    const skuRepo = fakeSkuRepo([sku('SKU-A')]);
    const uomRepo = fakeUomRepo([uom('EA')]);
    const create = { ExecuteWithResolvedLines: jest.fn() } as unknown as CreateInboundPlanUseCase;
    const useCase = new ImportInboundPlanLinesUseCase(spreadsheet, skuRepo, uomRepo, create);
    const rows = Array.from({ length: 1000 }, (_, index) => ({
      skuCode: 'SKU-A',
      uomCode: 'EA',
      expectedQuantity: 1,
      externalLineReference: String(index + 1),
    }));
    const buffer = await xlsxBuffer(rows);

    const preview = await useCase.Preview(buffer, 'big.xlsx');

    expect(preview.Summary.Total).toBe(1000);
    expect(preview.Summary.Valid).toBe(1000);
    // No N+1: exactly one FindByCodes call per master-data repository regardless of row count.
    expect(skuRepo.FindByCodes).toHaveBeenCalledTimes(1);
    expect(uomRepo.FindByCodes).toHaveBeenCalledTimes(1);
  });

  it('rejects a file with a duplicated required header (no silent wrong-column mapping)', async () => {
    const create = { ExecuteWithResolvedLines: jest.fn() } as unknown as CreateInboundPlanUseCase;
    const useCase = new ImportInboundPlanLinesUseCase(
      spreadsheet,
      fakeSkuRepo([sku('SKU-A')]),
      fakeUomRepo([uom('EA')]),
      create,
    );
    // Hai cột cùng header 'skuCode' (key khác nhau để addRow ghi được cả hai).
    const buffer = await spreadsheet.BuildTemplate(
      [
        { Header: 'skuCode', Key: 'skuCode' },
        { Header: 'skuCode', Key: 'skuCodeDup' },
        { Header: 'uomCode', Key: 'uomCode' },
        { Header: 'expectedQuantity', Key: 'expectedQuantity' },
      ],
      [{ skuCode: 'SKU-A', skuCodeDup: 'WRONG', uomCode: 'EA', expectedQuantity: 1 }],
    );

    const preview = await useCase.Preview(buffer, 'dup.xlsx');

    expect(preview.HeaderError).toContain('skuCode');
    expect(preview.Rows).toHaveLength(0);
  });

  it('maps required columns correctly even with an extra column in the middle', async () => {
    const create = { ExecuteWithResolvedLines: jest.fn() } as unknown as CreateInboundPlanUseCase;
    const useCase = new ImportInboundPlanLinesUseCase(
      spreadsheet,
      fakeSkuRepo([sku('SKU-A')]),
      fakeUomRepo([uom('EA')]),
      create,
    );
    const buffer = await spreadsheet.BuildTemplate(
      [
        { Header: 'skuCode', Key: 'skuCode' },
        { Header: 'note', Key: 'note' },
        { Header: 'uomCode', Key: 'uomCode' },
        { Header: 'expectedQuantity', Key: 'expectedQuantity' },
      ],
      [{ skuCode: 'SKU-A', note: 'ghi chú', uomCode: 'EA', expectedQuantity: 3 }],
    );

    const preview = await useCase.Preview(buffer, 'extra-col.xlsx');

    expect(preview.HeaderError).toBeNull();
    expect(preview.Rows[0].SkuId).toBe('SKU-A-id');
    expect(preview.Rows[0].UomId).toBe('EA-id');
    expect(preview.Rows[0].Errors).toHaveLength(0);
  });

  it('throws a BusinessRuleException (not 500) for a corrupt / non-xlsx buffer', async () => {
    const create = { ExecuteWithResolvedLines: jest.fn() } as unknown as CreateInboundPlanUseCase;
    const useCase = new ImportInboundPlanLinesUseCase(spreadsheet, fakeSkuRepo([]), fakeUomRepo([]), create);

    await expect(useCase.Preview(Buffer.from('this is not an xlsx file'), 'bad.xlsx')).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('accepts decimal quantity but rejects comma-decimal and non-positive', async () => {
    const create = { ExecuteWithResolvedLines: jest.fn() } as unknown as CreateInboundPlanUseCase;
    const useCase = new ImportInboundPlanLinesUseCase(
      spreadsheet,
      fakeSkuRepo([sku('SKU-A')]),
      fakeUomRepo([uom('EA')]),
      create,
    );
    const buffer = await xlsxBuffer([
      { skuCode: 'SKU-A', uomCode: 'EA', expectedQuantity: 12.5, externalLineReference: '1' },
      { skuCode: 'SKU-A', uomCode: 'EA', expectedQuantity: '1,5', externalLineReference: '2' },
      { skuCode: 'SKU-A', uomCode: 'EA', expectedQuantity: 0, externalLineReference: '3' },
    ]);

    const preview = await useCase.Preview(buffer, 'qty.xlsx');

    expect(preview.Rows[0].Errors).toHaveLength(0); // 12.5 hợp lệ (contract cho thập phân)
    expect(preview.Rows[1].Errors.join(' ')).toContain('expectedQuantity phải lớn hơn 0'); // "1,5" -> NaN
    expect(preview.Rows[2].Errors.join(' ')).toContain('expectedQuantity phải lớn hơn 0'); // 0
  });
});
