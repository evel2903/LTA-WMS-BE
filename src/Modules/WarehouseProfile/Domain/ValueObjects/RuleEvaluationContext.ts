/**
 * Input to the rule resolver (B3). Pure value object; PascalCase fields.
 *
 * Six V0 configuration axes (architecture 5.3) plus actor/action/object metadata
 * (stored for B4/B5/Epic C; B3 does NOT enforce permission or audit) and the
 * evaluation timestamp.
 *
 * Field-resolution contract (HỢP ĐỒNG for B4 preview input):
 *   - The six scope axes are matched against rule scope columns in the resolver's
 *     scope-match step (null on a rule = wildcard; non-null must equal the context axis).
 *   - A predicate's `Field` inside condition_json is resolved from `Attributes` only
 *     (business data the caller supplies), NOT from the scope axes.
 */
export interface RuleEvaluationContext {
  // Six V0 configuration axes.
  WarehouseTypeCode: string;
  WarehouseId?: string | null;
  ZoneId?: string | null;
  LocationType?: string | null;
  OwnerId?: string | null;
  SkuId?: string | null;
  ItemClass?: string | null;
  OrderType?: string | null;
  CustomerId?: string | null;
  SupplierId?: string | null;

  /**
   * Optional explicit profile target (B5 activation self-check / what-if). When set, the resolver
   * resolves THIS profile by id in step 2 regardless of its status (DRAFT included) instead of the
   * most-specific ACTIVE profile by scope. This lets the activation gate (AC2) evaluate the rules of
   * the candidate profile being activated; the candidate is still DRAFT at gate time and would be
   * invisible to the ACTIVE-only ListActiveByScope path. The profile must still match the context
   * scope axes; null/undefined keeps the default scope-based selection.
   */
  ProfileId?: string | null;

  // Actor/action/object context (stored for B4/B5/Epic C; B3 does not enforce).
  ActorUserId?: string | null;
  Action?: string | null;
  ObjectType?: string | null;
  ObjectId?: string | null;
  ReasonCode?: string | null;

  // Active-at-time filter input; resolver defaults to now() when absent.
  EvaluatedAt?: Date;

  // Bag of business data read by the condition evaluator via predicate Field.
  Attributes?: Record<string, unknown>;
}
