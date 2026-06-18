/**
 * Input to DeactivateWarehouseProfileUseCase. `Id` identifies the ACTIVE profile to retire.
 *
 * ActorUserId / ReasonCode / ReasonNote are deactivation actor/reason CONTEXT only: B5 stores them
 * (audit_policy.LastDeactivation) for C5 to write the real audit trail. B5 does NOT validate the
 * reason against a catalog (C3) nor enforce permission/approval (Epic C).
 */
export class DeactivateWarehouseProfileDto {
  public Id!: string;
  public ActorUserId?: string | null;
  public ReasonCode?: string | null;
  public ReasonNote?: string | null;
}
