import type { Executor } from '@/database/types';

/**
 * Narrow ports the partner-request service depends on, satisfied in composition
 * by the RBAC module. Keeping them as interfaces avoids a partner-requests→RBAC
 * runtime coupling and lets tests stub role assignment / role checks directly.
 */

/**
 * Transaction-aware assignment of the existing `partner` RBAC role. Split into
 * three concerns so the grant commits atomically with the caller's own writes
 * (the request flipped to APPROVED in the SAME transaction), while the non-DB
 * side effects (cache invalidation + `RoleAssigned` event) run only after commit.
 * This is the ONLY mechanism by which approval grants Partner status — no second
 * Partner concept is created.
 */
export interface PartnerRoleAssignerPort {
  /** The `partner` role id, or null when the role is not seeded. */
  resolvePartnerRoleId(): Promise<string | null>;
  /**
   * Idempotent user→partner-role INSERT through the caller's transaction
   * executor. Already-assigned is a no-op (not an error). Any later failure in
   * the same transaction rolls this grant back.
   */
  assignWithin(tx: Executor, roleId: string, userId: string, actorId: string | null): Promise<void>;
  /**
   * Post-commit side effects (resolver cache invalidation + `RoleAssigned`).
   * Called only after the enclosing transaction has committed.
   */
  finalize(userId: string, roleId: string, actorId: string | null): Promise<void>;
}

/** Reports whether a user already holds the `partner` role (submit eligibility). */
export interface PartnerRoleCheckerPort {
  isPartner(userId: string): Promise<boolean>;
}
