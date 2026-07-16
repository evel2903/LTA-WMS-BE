import { BusinessRuleException } from '@common/Exceptions/AppException';

export interface InboundPlanLineLike {
  LineNumber: number;
  ExpectedQuantity: number;
}

// IFB-24 review fix: LineNumber integer/positive is already checked at the DTO layer
// (@IsInt @Min(1)) but per-array uniqueness can't be expressed with a per-item
// class-validator decorator -- checked here instead. Shared by Create and Update so
// both request shapes stay symmetric (per the story's own "đối xứng Create" requirement).
export function AssertValidInboundPlanLines(lines: InboundPlanLineLike[] | undefined | null): void {
  if (!lines?.length) throw new BusinessRuleException('Inbound plan requires at least one line');
  const seenLineNumbers = new Set<number>();
  for (const line of lines) {
    // Re-review fix: a non-HTTP caller (or malformed JSON that skipped class-validator
    // entirely) can pass a null/undefined array element -- reading .LineNumber off it
    // below would throw a raw TypeError instead of this use-case's own BusinessRuleException.
    if (!line) throw new BusinessRuleException('Inbound plan line is required');
    if (!Number.isInteger(line.LineNumber) || line.LineNumber < 1) {
      throw new BusinessRuleException(`Line number must be a positive integer at line ${line.LineNumber}`);
    }
    if (seenLineNumbers.has(line.LineNumber)) {
      throw new BusinessRuleException(`Duplicate line number ${line.LineNumber}`);
    }
    seenLineNumbers.add(line.LineNumber);
    // Re-review fix: `NaN <= 0` and `Infinity <= 0` both evaluate to false, so the old
    // `<= 0` check silently let NaN/Infinity through for non-HTTP callers. Number.isFinite
    // rejects both while still allowing any real positive quantity.
    if (!Number.isFinite(line.ExpectedQuantity) || line.ExpectedQuantity <= 0) {
      throw new BusinessRuleException(`Expected quantity must be positive at line ${line.LineNumber}`);
    }
  }
}

// Re-review fix: request.ExpectedArrivalAt reaches Create/UpdateInboundPlanUseCase as
// `Date | string | null` -- HTTP callers are checked by @IsDateString() at the DTO layer,
// but a non-HTTP caller can pass a malformed string straight through to `new Date(...)`,
// producing an Invalid Date that would otherwise reach TypeORM/Postgres unchecked.
export function AssertValidExpectedArrivalAt(value: Date | string | null | undefined): void {
  if (value === null || value === undefined) return;
  if (Number.isNaN(new Date(value).getTime())) {
    throw new BusinessRuleException('ExpectedArrivalAt must be a valid date');
  }
}

// IFB-24 review fix: header string fields are @IsString() at the DTO layer, which
// allows an empty string -- @IsNotEmpty() was added there for the HTTP boundary, this
// use-case-level check is the defense-in-depth twin for any non-HTTP caller (matches
// the existing AssertValidInboundPlanLines / AssertRequest use-case-level pattern).
export function AssertNonEmptyInboundPlanHeader(fields: Record<string, string | undefined | null>): void {
  for (const [field, value] of Object.entries(fields)) {
    if (!value || !value.trim()) {
      throw new BusinessRuleException(`${field} is required`);
    }
  }
}

// Re-review fix (P1): InboundPlan.BusinessReference (SourceSystem:SourceDocumentType:
// SourceDocumentNumber) has no app-level length ceiling of its own -- only the DB column
// (varchar(160)) caps it. But ConfirmInboundPlanUseCase copies this value verbatim into
// CoreFlowInstanceEntity, whose own column is a stricter varchar(100) -- a plan created
// with a 101-160 char BusinessReference passes Create cleanly and then 500s on Confirm
// with a raw Postgres "value too long" error. Cap at CoreFlow's limit here, at Create/
// Update time, so a plan can never reach a state where Confirm is guaranteed to fail.
const CoreFlowBusinessReferenceMaxLength = 100;

export function AssertValidBusinessReferenceLength(businessReference: string): void {
  if (businessReference.length > CoreFlowBusinessReferenceMaxLength) {
    throw new BusinessRuleException(
      `Business reference must be at most ${CoreFlowBusinessReferenceMaxLength} characters (got ${businessReference.length})`,
    );
  }
}
