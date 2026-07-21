import {
  InboundDiscrepancyDto,
  InboundLpnDto,
  InboundPutawayReleaseDto,
  QcResultDto,
  QcTaskDto,
  ReceiptDto,
  ReceiptLineDto,
  ReceivingSessionDto,
} from '@modules/Inbound/Application/DTOs/InboundPlanDto';

export interface ReceiptOperationalStateDto {
  ReceiptId: string;
  InboundPlanId: string | null;
  Receipt: ReceiptDto;
  ReceivingSessions: ReceivingSessionDto[];
  ReceiptLines: ReceiptLineDto[];
  QcTasks: QcTaskDto[];
  QcResults: QcResultDto[];
  Lpns: InboundLpnDto[];
  Releases: InboundPutawayReleaseDto[];
  Discrepancies: InboundDiscrepancyDto[];
}
