export const SPREADSHEET_SERVICE = Symbol('ISpreadsheetService');

/** Một dòng đã parse: map theo header (key = header đã trim, value = text đã trim). */
export type SpreadsheetRow = Record<string, string>;

export interface ParsedSheet {
  Headers: string[];
  Rows: SpreadsheetRow[];
}

export interface TemplateColumn {
  Header: string;
  Key: string;
  Width?: number;
}

export interface ParseSheetOptions {
  /** Tên sheet cần đọc; mặc định worksheet đầu tiên. */
  SheetName?: string;
  /** Dòng header (1-based); mặc định 1. */
  HeaderRow?: number;
}

/**
 * Port DÙNG CHUNG đọc/ghi bảng tính (.xlsx) — generic, KHÔNG chứa nghiệp vụ. Adapter cụ thể
 * (exceljs) nằm ở Infrastructure; mọi module import token `SPREADSHEET_SERVICE` để tái dùng.
 */
export interface ISpreadsheetService {
  ParseSheet(buffer: Buffer, options?: ParseSheetOptions): Promise<ParsedSheet>;
  BuildTemplate(
    columns: TemplateColumn[],
    examples?: Array<Record<string, unknown>>,
    sheetName?: string,
  ): Promise<Buffer>;
}
