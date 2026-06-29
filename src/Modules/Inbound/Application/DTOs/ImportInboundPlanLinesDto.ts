/**
 * Header (thông tin chứng từ) gửi kèm khi COMMIT import — tương đương CreateInboundPlanDto
 * nhưng KHÔNG có Lines (lines lấy từ file Excel).
 */
export interface ImportInboundPlanHeaderDto {
  SourceSystem: string;
  SourceDocumentType?: string;
  SourceDocumentNumber: string;
  SupplierId: string;
  OwnerId: string;
  WarehouseId: string;
  WarehouseProfileId?: string | null;
  ExpectedArrivalAt?: string | null;
}

/** Một dòng trong preview import, kèm kết quả resolve + lỗi per-row. */
export interface ImportInboundLineRowDto {
  RowNumber: number;
  SkuCode: string;
  UomCode: string;
  ExpectedQuantity: string;
  ExternalLineReference: string;
  SkuId?: string;
  UomId?: string;
  Errors: string[];
}

export interface ImportInboundLinesSummaryDto {
  Total: number;
  Valid: number;
  Invalid: number;
}

/** Kết quả preview: danh sách dòng + tổng hợp + lỗi header (nếu có). KHÔNG tạo plan. */
export interface ImportInboundLinesPreviewDto {
  FileName: string;
  Rows: ImportInboundLineRowDto[];
  Summary: ImportInboundLinesSummaryDto;
  HeaderError: string | null;
}
