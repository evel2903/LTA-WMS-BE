import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SPREADSHEET_SERVICE } from '@modules/Spreadsheet/Application/Interfaces/ISpreadsheetService';
import { ExcelJsSpreadsheetService } from '@modules/Spreadsheet/Infrastructure/Adapters/ExcelJsSpreadsheetService';

// Giới hạn kích thước file upload dùng chung cho các luồng import bảng tính.
const MAX_SPREADSHEET_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Module DÙNG CHUNG cho ingest bảng tính (.xlsx): cấu hình Multer (memoryStorage + giới hạn
 * kích thước) và port `SPREADSHEET_SERVICE` (adapter exceljs). Module khác import để dùng
 * `FileInterceptor` + parse/template.
 */
@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: MAX_SPREADSHEET_FILE_SIZE },
    }),
  ],
  providers: [{ provide: SPREADSHEET_SERVICE, useClass: ExcelJsSpreadsheetService }],
  exports: [SPREADSHEET_SERVICE, MulterModule],
})
export class SpreadsheetModule {}
