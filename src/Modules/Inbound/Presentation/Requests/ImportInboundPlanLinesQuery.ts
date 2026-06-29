import { IsOptional, IsString } from 'class-validator';

/**
 * Query cho POST /inbound-plans/import. Lý do dùng QUERY (không phải body): guard chạy TRƯỚC
 * FileInterceptor nên req.body (multipart) rỗng khi PermissionGuard đọc scope WarehouseId/OwnerId.
 * `Preview=true` → chỉ validate (không tạo). Khi commit, các field header dùng để tạo plan.
 * Field PascalCase theo convention (như ListInboundPlansQuery).
 */
export class ImportInboundPlanLinesQuery {
  @IsOptional()
  @IsString()
  public Preview?: string;

  @IsOptional()
  @IsString()
  public SourceSystem?: string;

  @IsOptional()
  @IsString()
  public SourceDocumentType?: string;

  @IsOptional()
  @IsString()
  public SourceDocumentNumber?: string;

  @IsOptional()
  @IsString()
  public SupplierId?: string;

  @IsOptional()
  @IsString()
  public OwnerId?: string;

  @IsOptional()
  @IsString()
  public WarehouseId?: string;

  @IsOptional()
  @IsString()
  public WarehouseProfileId?: string;

  @IsOptional()
  @IsString()
  public ExpectedArrivalAt?: string;
}
