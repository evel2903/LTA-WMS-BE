import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@common/Constants/ErrorCode';
import { AppException } from '@common/Exceptions/AppException';

export const ACTOR_SNAPSHOT_UNAVAILABLE = 'ACTOR_SNAPSHOT_UNAVAILABLE';

/** Narrow failure boundary for constructing an authoritative actor snapshot. */
export class SnapshotResolutionError extends AppException {
  constructor(cause?: unknown) {
    super('Authorization snapshot unavailable', HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.Unknown, {
      Reason: ACTOR_SNAPSHOT_UNAVAILABLE,
    });
    if (cause !== undefined) Object.defineProperty(this, 'cause', { value: cause, enumerable: false });
  }
}
