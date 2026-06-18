/**
 * Input to ActivateWarehouseProfileUseCase. `Id` identifies the DRAFT profile to activate.
 *
 * ActorUserId / ReasonCode / ReasonNote are activation actor/reason CONTEXT only: B5 echoes/stores
 * them (audit_policy.LastActivation) for C5 to write the real audit trail. B5 does NOT validate
 * ReasonCode against a catalog (C3) nor enforce permission/approval (Epic C). Per handoff rule 11,
 * the reason carrier is ReasonCode; ReasonNote is a secondary free-text note.
 *
 * EffectiveFrom / EffectiveTo are optional: when present they override the profile's effective
 * window at activation (re-validated + re-checked for overlap). When absent the existing window
 * is used. Date strings are YYYY-MM-DD or ISO (parsed by ParseEffectiveDate).
 */
export class ActivateWarehouseProfileDto {
  public Id!: string;
  public ActorUserId?: string | null;
  public ReasonCode?: string | null;
  public ReasonNote?: string | null;
  public EffectiveFrom?: string;
  public EffectiveTo?: string | null;
}
