import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  ISpreadsheetService,
  ParseSheetOptions,
  ParsedSheet,
  SpreadsheetRow,
  TemplateColumn,
} from '@modules/Spreadsheet/Application/Interfaces/ISpreadsheetService';

/** Adapter exceljs cho port ISpreadsheetService. Đây là nơi DUY NHẤT phụ thuộc thư viện exceljs. */
@Injectable()
export class ExcelJsSpreadsheetService implements ISpreadsheetService {
  /**
   * Đọc một buffer .xlsx thành các dòng map theo header. Bỏ dòng hoàn toàn trống; value lấy `cell.text` đã trim.
   */
  public async ParseSheet(buffer: Buffer, options: ParseSheetOptions = {}): Promise<ParsedSheet> {
    const workbook = new ExcelJS.Workbook();
    // @types/node (v25) Buffer là generic `Buffer<ArrayBufferLike>` nên không khớp trực tiếp
    // tham số `Buffer` của exceljs — cast qua đúng kiểu tham số mà exceljs khai báo.
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    const worksheet = options.SheetName ? workbook.getWorksheet(options.SheetName) : workbook.worksheets[0];
    if (!worksheet) {
      return { Headers: [], Rows: [] };
    }

    const headerRowNumber = options.HeaderRow ?? 1;
    const headerRow = worksheet.getRow(headerRowNumber);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = this.CellText(cell);
    });

    const rows: SpreadsheetRow[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return;
      const record: SpreadsheetRow = {};
      let hasValue = false;
      headers.forEach((header, index) => {
        if (!header) return;
        const text = this.CellText(row.getCell(index + 1));
        record[header] = text;
        if (text.length > 0) hasValue = true;
      });
      if (hasValue) rows.push(record);
    });

    return { Headers: headers.filter((h) => h.length > 0), Rows: rows };
  }

  /** Tạo file .xlsx mẫu từ định nghĩa cột + (tùy chọn) các dòng ví dụ. Trả Buffer để stream về client. */
  public async BuildTemplate(
    columns: TemplateColumn[],
    examples: Array<Record<string, unknown>> = [],
    sheetName = 'Template',
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.columns = columns.map((column) => ({
      header: column.Header,
      key: column.Key,
      width: column.Width ?? 24,
    }));
    worksheet.getRow(1).font = { bold: true };
    examples.forEach((example) => worksheet.addRow(example));

    const written = await workbook.xlsx.writeBuffer();
    return Buffer.from(written as unknown as ArrayBuffer);
  }

  private CellText(cell: ExcelJS.Cell | undefined): string {
    if (!cell) return '';
    const text = cell.text;
    return typeof text === 'string' ? text.trim() : String(text ?? '').trim();
  }
}
