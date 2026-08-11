/**
 * Collaboration ports for the authentication module.
 *
 * The auth module must not import the Members or RBAC modules directly — those
 * modules already depend on auth (`createAuthenticate`, RBAC guards), so a
 * reverse import would create a cycle. Instead, auth defines these small ports;
 * the composition root (`routes/index.ts`) injects concrete adapters after every
 * module is registered. All ports are optional at construction and no-op when
 * unset, so the auth module remains independently testable.
 */

/** Creates/links and activates the loyalty Member profile for a user account. */
export interface MemberProvisioningPort {
  /**
   * Idempotently ensures a Member profile exists and is linked to the user
   * (`users.id → members.user_id`). New profiles start in the PENDING member
   * state, mirroring the PENDING (unverified) auth account.
   */
  ensureForUser(input: {
    userId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    /** Inbound self-service referral code (`?ref=`); optional, never trusted for eligibility here. */
    referralCode?: string | undefined;
  }): Promise<void>;

  /**
   * Idempotently transitions the user's linked Member profile to its ACTIVE
   * state on account activation (email verification). No-op if already active or
   * if no profile exists.
   */
  activateForUser(userId: string): Promise<void>;
}

/** Assigns an RBAC role to a user by role key (e.g. the default `member` role). */
export interface RoleAssignmentPort {
  assignRoleByKey(userId: string, roleKey: string): Promise<void>;
}

/** Reads a user's effective authorization for enriching the `/me` response. */
export interface AuthorizationReaderPort {
  resolve(userId: string): Promise<{ roleKeys: string[]; permissionKeys: string[] }>;
}
