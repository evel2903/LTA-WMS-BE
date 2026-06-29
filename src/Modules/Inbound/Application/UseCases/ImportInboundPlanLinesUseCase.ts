import { BusinessRuleException } from '@common/Exceptions/AppException';
import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CreateInboundPlanDto, InboundPlanDto } from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import {
  ImportInboundLinesPreviewDto,
  ImportInboundLineRowDto,
  ImportInboundPlanHeaderDto,
} from '@modules/Inbound/Application/DTOs/ImportInboundPlanLinesDto';
import {
  CreateInboundPlanUseCase,
  ResolvedInboundLine,
} from '@modules/Inbound/Application/UseCases/CreateInboundPlanUseCase';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import {
  ISkuCodeBatchLookup,
  IUomCodeBatchLookup,
} from '@modules/Inbound/Application/Interfaces/IMasterDataCodeLookup';
import { ISpreadsheetService, ParsedSheet } from '@modules/Spreadsheet/Application/Interfaces/ISpreadsheetService';

const REQUIRED_HEADERS = ['skuCode', 'uomCode', 'expectedQuantity'] as const;
// Các cột use-case THỰC SỰ đọc — chỉ chặn trùng tên ở những cột này (cột rác trùng tên vô hại).
const CONSUMED_HEADERS = ['skuCode', 'uomCode', 'expectedQuantity', 'externalLineReference'] as const;

/**
 * Import dòng kế hoạch nhập kho từ file Excel (server-side). Đọc qua SpreadsheetService,
 * batch-validate SKU/UOM (bỏ N+1), trả per-row errors. Preview KHÔNG tạo; Commit tạo plan
 * atomic qua CreateInboundPlanUseCase.ExecuteWithResolvedLines (lỗi → ném, không partial).
 */
export class ImportInboundPlanLinesUseCase {
  constructor(
    private readonly spreadsheet: ISpreadsheetService,
    private readonly skus: ISkuCodeBatchLookup,
    private readonly uoms: IUomCodeBatchLookup,
    private readonly createInboundPlan: CreateInboundPlanUseCase,
  ) {}

  /** Tạo file .xlsx mẫu (header + 1-2 dòng ví dụ) cho người dùng tải về. */
  public async BuildTemplate(): Promise<Buffer> {
    return this.spreadsheet.BuildTemplate(
      [
        { Header: 'skuCode', Key: 'skuCode' },
        { Header: 'uomCode', Key: 'uomCode' },
        { Header: 'expectedQuantity', Key: 'expectedQuantity' },
        { Header: 'externalLineReference', Key: 'externalLineReference' },
      ],
      [
        { skuCode: 'SKU-A', uomCode: 'EA', expectedQuantity: 12, externalLineReference: '10' },
        { skuCode: 'SKU-B', uomCode: 'CASE', expectedQuantity: 24, externalLineReference: '20' },
      ],
    );
  }

  /** Parse + batch-validate, trả preview. KHÔNG tạo plan. */
  public async Preview(fileBuffer: Buffer, fileName: string): Promise<ImportInboundLinesPreviewDto> {
    return this.ValidateRows(fileBuffer, fileName);
  }

  /** Validate; nếu sạch lỗi thì tạo plan atomic, ngược lại ném BusinessRuleException (không tạo). */
  public async Commit(
    fileBuffer: Buffer,
    fileName: string,
    header: ImportInboundPlanHeaderDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<InboundPlanDto> {
    const preview = await this.ValidateRows(fileBuffer, fileName);
    if (preview.HeaderError) {
      throw new BusinessRuleException(preview.HeaderError);
    }
    if (preview.Rows.some((row) => row.Errors.length > 0)) {
      throw new BusinessRuleException(
        `Import có ${preview.Summary.Invalid} dòng lỗi — vui lòng kiểm tra preview trước khi tạo.`,
      );
    }

    const lineRefs: ResolvedInboundLine[] = preview.Rows.map((row, index) => ({
      Request: {
        LineNumber: index + 1,
        SkuId: row.SkuId as string,
        UomId: row.UomId as string,
        ExpectedQuantity: Number(row.ExpectedQuantity),
        ExternalLineReference: row.ExternalLineReference || null,
      },
      SkuCode: row.SkuCode,
      UomCode: row.UomCode,
    }));

    const request: CreateInboundPlanDto = {
      SourceSystem: header.SourceSystem,
      SourceDocumentType: header.SourceDocumentType?.trim() || 'ASN',
      SourceDocumentNumber: header.SourceDocumentNumber,
      SupplierId: header.SupplierId,
      OwnerId: header.OwnerId,
      WarehouseId: header.WarehouseId,
      WarehouseProfileId: header.WarehouseProfileId ?? null,
      ExpectedArrivalAt: header.ExpectedArrivalAt ?? null,
      Lines: lineRefs.map((line) => line.Request),
    };

    return this.createInboundPlan.ExecuteWithResolvedLines(request, lineRefs, context);
  }

  private async ValidateRows(fileBuffer: Buffer, fileName: string): Promise<ImportInboundLinesPreviewDto> {
    const emptySummary = { Total: 0, Valid: 0, Invalid: 0 };
    let parsed: ParsedSheet;
    try {
      parsed = await this.spreadsheet.ParseSheet(fileBuffer);
    } catch {
      throw new BusinessRuleException('File Excel không hợp lệ hoặc không đọc được.');
    }

    const missingHeaders = REQUIRED_HEADERS.filter((header) => !parsed.Headers.includes(header));
    if (missingHeaders.length > 0) {
      return {
        FileName: fileName,
        Rows: [],
        Summary: emptySummary,
        HeaderError: `Thiếu cột bắt buộc: ${missingHeaders.join(', ')}.`,
      };
    }
    // Header trùng tên → ParseSheet map "last column wins" âm thầm; chặn ở các cột use-case đọc.
    const duplicateHeaders = CONSUMED_HEADERS.filter((header) => parsed.Headers.filter((h) => h === header).length > 1);
    if (duplicateHeaders.length > 0) {
      return {
        FileName: fileName,
        Rows: [],
        Summary: emptySummary,
        HeaderError: `Cột bị lặp: ${duplicateHeaders.join(', ')}.`,
      };
    }
    if (parsed.Rows.length === 0) {
      return {
        FileName: fileName,
        Rows: [],
        Summary: emptySummary,
        HeaderError: 'File không có dòng dữ liệu nào.',
      };
    }

    // Batch-resolve SKU/UOM theo code (bỏ N+1), chỉ giữ bản ghi Active.
    const skuCodes = this.UniqueCodes(parsed.Rows.map((row) => row.skuCode));
    const uomCodes = this.UniqueCodes(parsed.Rows.map((row) => row.uomCode));
    const skuEntities = await this.skus.FindByCodes(skuCodes);
    const uomEntities = await this.uoms.FindByCodes(uomCodes);
    const skuByCode = new Map(
      skuEntities.filter((sku) => sku.ItemStatus === SkuStatus.Active).map((sku) => [sku.SkuCode, sku]),
    );
    const uomByCode = new Map(
      uomEntities.filter((uom) => uom.Status === MasterDataStatus.Active).map((uom) => [uom.UomCode, uom]),
    );

    const seenReferences = new Set<string>();
    const rows: ImportInboundLineRowDto[] = parsed.Rows.map((row, index) => {
      const skuCode = (row.skuCode ?? '').trim();
      const uomCode = (row.uomCode ?? '').trim();
      const expectedQuantity = (row.expectedQuantity ?? '').trim();
      const externalLineReference = (row.externalLineReference ?? '').trim();
      const sku = skuCode ? skuByCode.get(skuCode) : undefined;
      const uom = uomCode ? uomByCode.get(uomCode) : undefined;
      const quantity = Number(expectedQuantity);
      const errors: string[] = [];

      if (!skuCode) {
        errors.push('Thiếu skuCode.');
      } else if (!sku) {
        errors.push(`SKU ${skuCode} không tồn tại hoặc không active.`);
      }
      if (!uomCode) {
        errors.push('Thiếu uomCode.');
      } else if (!uom) {
        errors.push(`Đơn vị tính ${uomCode} không tồn tại hoặc không active.`);
      }
      if (!expectedQuantity || !Number.isFinite(quantity) || quantity <= 0) {
        errors.push('expectedQuantity phải lớn hơn 0.');
      }
      if (externalLineReference) {
        if (seenReferences.has(externalLineReference)) {
          errors.push(`externalLineReference ${externalLineReference} bị trùng trong file.`);
        }
        seenReferences.add(externalLineReference);
      }

      return {
        RowNumber: index + 2,
        SkuCode: skuCode,
        UomCode: uomCode,
        ExpectedQuantity: expectedQuantity,
        ExternalLineReference: externalLineReference,
        SkuId: sku?.Id,
        UomId: uom?.Id,
        Errors: errors,
      };
    });

    const invalid = rows.filter((row) => row.Errors.length > 0).length;
    return {
      FileName: fileName,
      Rows: rows,
      Summary: { Total: rows.length, Valid: rows.length - invalid, Invalid: invalid },
      HeaderError: null,
    };
  }

  private UniqueCodes(values: Array<string | undefined>): string[] {
    const set = new Set<string>();
    for (const value of values) {
      const trimmed = (value ?? '').trim();
      if (trimmed) set.add(trimmed);
    }
    return Array.from(set);
  }
}
