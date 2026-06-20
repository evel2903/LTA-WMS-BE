import { randomUUID } from 'crypto';
import { CatalogImplementationStatus } from '@modules/AccessControl/Domain/Enums/CatalogImplementationStatus';
import { ValidationRuleCatalogEntity } from '@modules/AccessControl/Domain/Entities/ValidationRuleCatalogEntity';
import { IValidationRuleCatalogRepository } from '@modules/AccessControl/Application/Interfaces/IValidationRuleCatalogRepository';

const DOC_REF = 'doc-09 RBAC-VAL';

export type ValidationRuleCatalogEntry = {
  Code: string;
  Description: string;
  Trigger: string;
  ExpectedResult: string;
  OwnerModule: string;
  ControlExceptionCode: string | null;
  ImplementationStatus: CatalogImplementationStatus;
};

/**
 * V0 validation-rule catalog (doc 09 RBAC-VAL-01..10). Each row records a core validation
 * rule the control layer enforces; VAL-04/05 are exception-closure rules owned by C9
 * (DeferredToC9), the rest are enforced in C1-C7 (Implemented). `ControlExceptionCode`
 * links a rule to the control-exception it raises (VAL-10 left null — doc 09 does not map
 * override 1-1 to a single CTRL-EX).
 */
export const ValidationRuleCatalogEntries: ReadonlyArray<ValidationRuleCatalogEntry> = [
  {
    Code: 'RBAC-VAL-01',
    Description: 'Hành động phải có permission tương ứng trong scope',
    Trigger: 'Mọi giao dịch',
    ExpectedResult: 'Chặn ở backend, ghi attempt nếu nhạy cảm',
    OwnerModule: 'C2',
    ControlExceptionCode: 'CTRL-EX-01',
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'RBAC-VAL-02',
    Description: 'Data scope theo owner/warehouse/zone',
    Trigger: 'WT-05/WT-08 và profile bật scope',
    ExpectedResult: 'Chặn xem/thao tác ngoài scope',
    OwnerModule: 'C2',
    ControlExceptionCode: 'CTRL-EX-02',
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'RBAC-VAL-03',
    Description: 'Segregation: người thực hiện ≠ người duyệt',
    Trigger: 'Mọi approval',
    ExpectedResult: 'Chặn self-approval',
    OwnerModule: 'C2,C6',
    ControlExceptionCode: 'CTRL-EX-03',
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'RBAC-VAL-04',
    Description: 'Exception phải gắn reason code hợp lệ',
    Trigger: 'Mọi exception/thay đổi quan trọng',
    ExpectedResult: 'Chặn đóng exception nếu thiếu reason',
    OwnerModule: 'C9,C3',
    ControlExceptionCode: 'CTRL-EX-04',
    ImplementationStatus: CatalogImplementationStatus.DeferredToC9,
  },
  {
    Code: 'RBAC-VAL-05',
    Description: 'Evidence bắt buộc nếu reason code yêu cầu',
    Trigger: 'Theo cấu hình reason',
    ExpectedResult: 'Chặn resolve nếu thiếu evidence',
    OwnerModule: 'C9,C3',
    ControlExceptionCode: 'CTRL-EX-04',
    ImplementationStatus: CatalogImplementationStatus.DeferredToC9,
  },
  {
    Code: 'RBAC-VAL-06',
    Description: 'Approval theo ngưỡng và cấp duyệt',
    Trigger: 'Adjustment/override/disposition theo profile',
    ExpectedResult: 'Chặn nếu chưa đủ cấp duyệt',
    OwnerModule: 'C6',
    ControlExceptionCode: null,
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'RBAC-VAL-07',
    Description: 'Compliance hard block không được override',
    Trigger: 'WT-02/03/04/08 theo R-COM',
    ExpectedResult: 'Hard block; không override path',
    OwnerModule: 'C7,B3',
    ControlExceptionCode: 'CTRL-EX-05',
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'RBAC-VAL-08',
    Description: 'Mọi giao dịch quan trọng ghi audit before/after',
    Trigger: 'Theo 09.01',
    ExpectedResult: 'Không commit nếu audit fail',
    OwnerModule: 'C4,C5',
    ControlExceptionCode: null,
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'RBAC-VAL-09',
    Description: 'Audit log immutable',
    Trigger: 'Mọi audit',
    ExpectedResult: 'Không sửa/xóa; chỉ thêm đính chính',
    OwnerModule: 'C4',
    ControlExceptionCode: null,
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
  {
    Code: 'RBAC-VAL-10',
    Description: 'Override tạo Override Log có reason/approval',
    Trigger: 'Mọi override',
    ExpectedResult: 'Chặn override nếu thiếu reason/approval',
    OwnerModule: 'C7',
    ControlExceptionCode: null,
    ImplementationStatus: CatalogImplementationStatus.Implemented,
  },
];

/** Idempotent: upsert by Code, so re-running never duplicates and keeps fields in sync. */
export async function SeedValidationRuleCatalog(repository: IValidationRuleCatalogRepository): Promise<void> {
  for (const entry of ValidationRuleCatalogEntries) {
    const now = new Date();
    await repository.Upsert(
      new ValidationRuleCatalogEntity({
        Id: randomUUID(),
        Code: entry.Code,
        Description: entry.Description,
        Trigger: entry.Trigger,
        ExpectedResult: entry.ExpectedResult,
        OwnerModule: entry.OwnerModule,
        ControlExceptionCode: entry.ControlExceptionCode,
        ImplementationStatus: entry.ImplementationStatus,
        SourceDocRef: DOC_REF,
        CreatedAt: now,
        UpdatedAt: now,
        CreatedBy: 'SEED',
        UpdatedBy: null,
      }),
    );
  }
}
