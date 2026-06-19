import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { ReasonCodeStatus } from '@modules/AccessControl/Domain/Enums/ReasonCodeStatus';
import { ReasonGroup } from '@modules/AccessControl/Domain/Enums/ReasonGroup';

/**
 * A reusable reason code consumed by audit (C4/C5), override (C7), approval (C6) and
 * exception (C9). `AppliesToActions`/`AppliesToObjects` scope where it is valid;
 * inactive codes stay readable (audit history) but cannot back a new mutation.
 */
export class ReasonCodeEntity {
  public readonly Id: string;
  public ReasonCode: string;
  public ReasonGroup: ReasonGroup;
  public Description: string | null;
  public AppliesToActions: ActionCode[];
  public AppliesToObjects: ObjectType[];
  public EvidenceRequired: boolean;
  public ApprovalRequired: boolean;
  public AllowedRoleCodes: RoleCode[] | null;
  public Status: ReasonCodeStatus;
  public Version: number;
  public EffectiveFrom: Date | null;
  public EffectiveTo: Date | null;
  public readonly CreatedAt: Date;
  public UpdatedAt: Date;
  public CreatedBy: string | null;
  public UpdatedBy: string | null;

  constructor(params: {
    Id: string;
    ReasonCode: string;
    ReasonGroup: ReasonGroup;
    Description?: string | null;
    AppliesToActions?: ActionCode[];
    AppliesToObjects?: ObjectType[];
    EvidenceRequired?: boolean;
    ApprovalRequired?: boolean;
    AllowedRoleCodes?: RoleCode[] | null;
    Status?: ReasonCodeStatus;
    Version?: number;
    EffectiveFrom?: Date | null;
    EffectiveTo?: Date | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string | null;
    UpdatedBy?: string | null;
  }) {
    this.Id = params.Id;
    this.ReasonCode = params.ReasonCode;
    this.ReasonGroup = params.ReasonGroup;
    this.Description = params.Description ?? null;
    this.AppliesToActions = params.AppliesToActions ?? [];
    this.AppliesToObjects = params.AppliesToObjects ?? [];
    this.EvidenceRequired = params.EvidenceRequired ?? false;
    this.ApprovalRequired = params.ApprovalRequired ?? false;
    this.AllowedRoleCodes = params.AllowedRoleCodes ?? null;
    this.Status = params.Status ?? ReasonCodeStatus.Active;
    this.Version = params.Version ?? 1;
    this.EffectiveFrom = params.EffectiveFrom ?? null;
    this.EffectiveTo = params.EffectiveTo ?? null;
    this.CreatedAt = params.CreatedAt;
    this.UpdatedAt = params.UpdatedAt;
    this.CreatedBy = params.CreatedBy ?? null;
    this.UpdatedBy = params.UpdatedBy ?? null;
  }

  public IsActive(): boolean {
    return this.Status === ReasonCodeStatus.Active;
  }

  public AppliesTo(action: ActionCode, objectType: ObjectType): boolean {
    return this.AppliesToActions.includes(action) && this.AppliesToObjects.includes(objectType);
  }
}
