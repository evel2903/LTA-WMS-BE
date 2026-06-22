import { ReprintRequestStatus } from '@modules/BarcodeLabel/Domain/Enums/ReprintRequestStatus';

export class ReprintRequestEntity {
  public readonly Id: string;
  public readonly OriginalPrintJobId: string;
  public ReprintSequence: number;
  public ReasonCode: string;
  public ReasonCodeId: string | null;
  public ReasonNote: string | null;
  public EvidenceRefs: string[] | null;
  public Status: ReprintRequestStatus;
  public RequestedBy: string | null;
  public RequestedAt: Date;

  constructor(params: {
    Id: string;
    OriginalPrintJobId: string;
    ReprintSequence: number;
    ReasonCode: string;
    ReasonCodeId?: string | null;
    ReasonNote?: string | null;
    EvidenceRefs?: string[] | null;
    Status?: ReprintRequestStatus;
    RequestedBy?: string | null;
    RequestedAt: Date;
  }) {
    this.Id = params.Id;
    this.OriginalPrintJobId = params.OriginalPrintJobId;
    this.ReprintSequence = params.ReprintSequence;
    this.ReasonCode = params.ReasonCode;
    this.ReasonCodeId = params.ReasonCodeId ?? null;
    this.ReasonNote = params.ReasonNote ?? null;
    this.EvidenceRefs = params.EvidenceRefs ?? null;
    this.Status = params.Status ?? ReprintRequestStatus.Reprinted;
    this.RequestedBy = params.RequestedBy ?? null;
    this.RequestedAt = params.RequestedAt;
  }
}
