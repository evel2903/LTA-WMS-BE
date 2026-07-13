import {
  InboundDiscrepancyDto,
  InboundLpnDto,
  InboundPutawayReleaseDto,
  QcResultDto,
  QcTaskDto,
  ReceiptLineDto,
  ReceivingSessionDto,
} from '@modules/Inbound/Application/DTOs/InboundPlanDto';

/**
 * Read-only aggregate of post-gate-in operational progress for one inbound plan,
 * keyed by InboundPlanId. Lets the operator console rehydrate the correct workflow
 * step after a page reload instead of relying on in-session mutation results.
 * Additive read model (IRM-01) — reuses the existing per-entity DTOs.
 */
export interface InboundOperationalStateDto {
  InboundPlanId: string;
  ReceivingSessions: ReceivingSessionDto[];
  ReceiptLines: ReceiptLineDto[];
  QcTasks: QcTaskDto[];
  QcResults: QcResultDto[];
  Lpns: InboundLpnDto[];
  Releases: InboundPutawayReleaseDto[];
  Discrepancies: InboundDiscrepancyDto[];
}
