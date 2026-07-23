import { HttpStatus, Logger } from '@nestjs/common';
import { AppException, BusinessRuleException } from '@common/Exceptions/AppException';
import { ErrorCode } from '@common/Constants/ErrorCode';

/**
 * RH-04 (RH-ASG-01 / D3) monotonic assignment version.
 *
 * IntentVersion / EffectiveVersion / pendingEffectiveVersion travel the wire and live in
 * PostgreSQL as BIGINT, so they can exceed JS `Number.MAX_SAFE_INTEGER`. This value object wraps a
 * native `bigint` and always renders the canonical unsigned decimal string ("0", "1", … — no sign,
 * no leading zero except "0"). Malformed input is a `400`; incrementing past the BIGINT max is a
 * `503 VERSION_EXHAUSTED` so the whole transaction aborts and an operator alert can fire.
 */
const CANONICAL = /^(0|[1-9][0-9]*)$/;
const BIGINT_MAX = 9223372036854775807n; // 2^63 - 1, PostgreSQL BIGINT max

export class AssignmentVersion {
  private static readonly logger = new Logger('AssignmentVersion');

  private constructor(public readonly value: bigint) {}

  /** Parse a wire/DB decimal string; `400` on malformed/negative/out-of-range. */
  public static parse(raw: unknown, field = 'version'): AssignmentVersion {
    if (typeof raw === 'bigint') return AssignmentVersion.fromBigInt(raw, field);
    if (typeof raw === 'number') {
      // A JS number silently loses precision past 2^53 — reject it outright, never coerce.
      throw new BusinessRuleException(`${field} must be a canonical decimal string, not a number`);
    }
    if (typeof raw !== 'string' || !CANONICAL.test(raw)) {
      throw new BusinessRuleException(`${field} must be a canonical unsigned decimal string`);
    }
    return AssignmentVersion.fromBigInt(BigInt(raw), field);
  }

  public static fromBigInt(v: bigint, field = 'version'): AssignmentVersion {
    if (v < 0n || v > BIGINT_MAX) {
      throw new BusinessRuleException(`${field} is out of range`);
    }
    return new AssignmentVersion(v);
  }

  public static zero(): AssignmentVersion {
    return new AssignmentVersion(0n);
  }

  /** Next ordinal; aborts the transaction with `503 VERSION_EXHAUSTED` at the BIGINT ceiling. */
  public next(counter: 'IntentVersion' | 'EffectiveVersion'): AssignmentVersion {
    if (this.value >= BIGINT_MAX) {
      // Operational alert seam (AC4): a structured error log is the minimal hook; wire to real
      // alerting/telemetry at ops maturity. The ceiling is astronomically unreachable, so this fires
      // only on a genuine anomaly (e.g. corrupted counter) — worth paging on.
      AssignmentVersion.logger.error(
        `VERSION_EXHAUSTED: ${counter} reached the BIGINT ceiling (${BIGINT_MAX}); transaction aborted`,
      );
      throw new AppException(`${counter} exhausted`, HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.VersionExhausted, {
        Counter: counter,
      });
    }
    return new AssignmentVersion(this.value + 1n);
  }

  public equals(other: AssignmentVersion): boolean {
    return this.value === other.value;
  }

  public gte(other: AssignmentVersion): boolean {
    return this.value >= other.value;
  }

  public toString(): string {
    return this.value.toString();
  }
}
