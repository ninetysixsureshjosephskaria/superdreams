import { ForbiddenError } from '@/errors';

import type { ResolvedAuthorization } from '../dto';

/** The authorization state a policy evaluates against. */
export interface AuthorizationContext {
  userId: string;
  roleKeys: string[];
  permissionKeys: string[];
}

export function toAuthorizationContext(
  userId: string,
  resolved: ResolvedAuthorization,
): AuthorizationContext {
  return { userId, roleKeys: resolved.roleKeys, permissionKeys: resolved.permissionKeys };
}

/**
 * A reusable authorization policy. Future business modules define concrete
 * policies (resource + ownership + custom rules) using {@link definePolicy};
 * this phase ships only the framework, no module-specific policies.
 */
export interface Policy<TResource = unknown> {
  readonly name: string;
  authorize(context: AuthorizationContext, resource: TResource): boolean | Promise<boolean>;
}

export function definePolicy<TResource>(
  name: string,
  authorize: (context: AuthorizationContext, resource: TResource) => boolean | Promise<boolean>,
): Policy<TResource> {
  return { name, authorize };
}

export function contextHasPermission(context: AuthorizationContext, key: string): boolean {
  return context.permissionKeys.includes(key);
}

export function contextHasRole(context: AuthorizationContext, roleKey: string): boolean {
  return context.roleKeys.includes(roleKey);
}

/** Ownership check helper for resource policies. */
export function isOwner(
  context: AuthorizationContext,
  ownerId: string | null | undefined,
): boolean {
  return ownerId != null && context.userId === ownerId;
}

/** Evaluates a policy, throwing the canonical Forbidden error when denied. */
export async function authorizePolicy<TResource>(
  policy: Policy<TResource>,
  context: AuthorizationContext,
  resource: TResource,
  onDeny?: () => void | Promise<void>,
): Promise<void> {
  const allowed = await policy.authorize(context, resource);
  if (!allowed) {
    if (onDeny) {
      await onDeny();
    }
    throw new ForbiddenError('You are not allowed to perform this action.');
  }
}
