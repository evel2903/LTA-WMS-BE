import { ExcelJsSpreadsheetService } from '@modules/Spreadsheet/Infrastructure/Adapters/ExcelJsSpreadsheetService';

describe('ExcelJsSpreadsheetService', () => {
  const service = new ExcelJsSpreadsheetService();

  const columns = [
    { Header: 'skuCode', Key: 'skuCode' },
    { Header: 'uomCode', Key: 'uomCode' },
    { Header: 'expectedQuantity', Key: 'expectedQuantity' },
    { Header: 'externalLineReference', Key: 'externalLineReference' },
  ];

  it('builds an .xlsx template buffer that round-trips through ParseSheet', async () => {
    const buffer = await service.BuildTemplate(columns, [
      { skuCode: 'SKU-A', uomCode: 'EA', expectedQuantity: 12, externalLineReference: '10' },
      { skuCode: 'SKU-B', uomCode: 'CASE', expectedQuantity: 24, externalLineReference: '20' },
    ]);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);

    const parsed = await service.ParseSheet(buffer);
    expect(parsed.Headers).toEqual(['skuCode', 'uomCode', 'expectedQuantity', 'externalLineReference']);
    expect(parsed.Rows).toHaveLength(2);
    expect(parsed.Rows[0]).toMatchObject({
      skuCode: 'SKU-A',
      uomCode: 'EA',
      expectedQuantity: '12',
      externalLineReference: '10',
    });
    expect(parsed.Rows[1].skuCode).toBe('SKU-B');
  });

  it('builds an empty template (header only) and parses zero rows', async () => {
    const buffer = await service.BuildTemplate(columns);
    const parsed = await service.ParseSheet(buffer);
    expect(parsed.Headers).toContain('skuCode');
    expect(parsed.Rows).toHaveLength(0);
  });

  it('trims cell values and skips fully empty rows', async () => {
    const buffer = await service.BuildTemplate(columns, [
      { skuCode: '  SKU-A  ', uomCode: 'EA', expectedQuantity: 5, externalLineReference: '' },
    ]);
    const parsed = await service.ParseSheet(buffer);
    expect(parsed.Rows).toHaveLength(1);
    expect(parsed.Rows[0].skuCode).toBe('SKU-A');
  });
});
