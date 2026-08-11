import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import type { Redis } from 'ioredis';
import { describe, expect, it, vi } from 'vitest';

import { ForbiddenError } from '@/errors';

import { PERMISSION_DEFINITIONS, PERMISSIONS, ROLES, SYSTEM_ROLE_DEFINITIONS } from '../catalog';
import { RequirePermission } from '../decorators';
import { RbacEventBus } from '../events';
import {
  requireAllPermissions,
  requireAnyPermission,
  requirePermission,
  requireRole,
  type GuardDeps,
} from '../guards';
import { authorizePolicy, definePolicy, isOwner, toAuthorizationContext } from '../policies';
import { RedisPermissionCache } from '../services';
import type { AuthorizationService } from '../services';

const REPLY = {} as unknown as FastifyReply;

function requestFor(userId: string): FastifyRequest {
  return { auth: { userId, sessionId: 's' }, authz: null } as unknown as FastifyRequest;
}

function guardsFor(roleKeys: string[], permissionKeys: string[]): GuardDeps {
  const authorization = {
    getEffective: () => Promise.resolve({ roleKeys, permissionKeys }),
  } as unknown as AuthorizationService;
  return { authorization, events: new RbacEventBus() };
}

/** Invokes a preHandler as a plain function (bypassing its Fastify `this` context). */
function invoke(handler: preHandlerAsyncHookHandler, userId: string): Promise<void> {
  const fn = handler as unknown as (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  return fn(requestFor(userId), REPLY);
}

describe('rbac catalog', () => {
  it('defines a permission entry for every permission constant', () => {
    const definedKeys = PERMISSION_DEFINITIONS.map((definition) => definition.key).sort();
    expect(definedKeys).toEqual(Object.values(PERMISSIONS).sort());
  });

  it('grants the super-admin role every permission', () => {
    const superAdmin = SYSTEM_ROLE_DEFINITIONS.find((role) => role.key === ROLES.SUPER_ADMIN);
    expect(superAdmin?.permissions).toBe('*');
  });

  it('scopes the partner and admin partner.* grants (P1.1)', () => {
    const partner = SYSTEM_ROLE_DEFINITIONS.find((role) => role.key === ROLES.PARTNER);
    const member = SYSTEM_ROLE_DEFINITIONS.find((role) => role.key === ROLES.MEMBER);
    const adminRole = SYSTEM_ROLE_DEFINITIONS.find((role) => role.key === ROLES.ADMIN);

    // Partner holds exactly its own-network read capability — no request-management power.
    expect(partner?.permissions).toEqual([PERMISSIONS.PARTNER_NETWORK_READ]);
    expect(partner?.permissions).not.toContain(PERMISSIONS.PARTNER_REQUEST_APPROVE);
    expect(partner?.permissions).not.toContain(PERMISSIONS.PARTNER_REQUEST_REJECT);

    // Admin holds the request-management permissions but NOT the partner-scoped read.
    const adminPerms = adminRole?.permissions as readonly string[];
    expect(adminPerms).toEqual(
      expect.arrayContaining([
        PERMISSIONS.PARTNER_REQUEST_READ,
        PERMISSIONS.PARTNER_REQUEST_APPROVE,
        PERMISSIONS.PARTNER_REQUEST_REJECT,
      ]),
    );
    expect(adminPerms).not.toContain(PERMISSIONS.PARTNER_NETWORK_READ);

    // Member remains an empty role (no partner capabilities granted).
    expect(member?.permissions).toEqual([]);
  });
});

describe('rbac guards', () => {
  it('requirePermission allows and denies correctly', async () => {
    const deps = guardsFor([], [PERMISSIONS.ROLES_READ]);
    await expect(
      invoke(requirePermission(deps, PERMISSIONS.ROLES_READ), 'u'),
    ).resolves.toBeUndefined();
    await expect(
      invoke(requirePermission(deps, PERMISSIONS.ROLES_ASSIGN), 'u'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('requireAllPermissions requires every key', async () => {
    const deps = guardsFor([], [PERMISSIONS.ROLES_READ]);
    await expect(
      invoke(requireAllPermissions(deps, [PERMISSIONS.ROLES_READ]), 'u'),
    ).resolves.toBeUndefined();
    await expect(
      invoke(requireAllPermissions(deps, [PERMISSIONS.ROLES_READ, PERMISSIONS.ROLES_ASSIGN]), 'u'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('requireAnyPermission requires at least one key', async () => {
    const deps = guardsFor([], [PERMISSIONS.ROLES_READ]);
    await expect(
      invoke(requireAnyPermission(deps, [PERMISSIONS.ROLES_ASSIGN, PERMISSIONS.ROLES_READ]), 'u'),
    ).resolves.toBeUndefined();
    await expect(
      invoke(requireAnyPermission(deps, [PERMISSIONS.ROLES_ASSIGN]), 'u'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('requireRole checks role membership', async () => {
    const deps = guardsFor([ROLES.SUPER_ADMIN], []);
    await expect(invoke(requireRole(deps, ROLES.SUPER_ADMIN), 'u')).resolves.toBeUndefined();
    await expect(invoke(requireRole(deps, 'nope'), 'u')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('RequirePermission decorator requires all listed permissions', async () => {
    const deps = guardsFor([], [PERMISSIONS.ROLES_READ]);
    await expect(
      invoke(RequirePermission(deps, PERMISSIONS.ROLES_READ), 'u'),
    ).resolves.toBeUndefined();
    await expect(
      invoke(RequirePermission(deps, PERMISSIONS.ROLES_READ, PERMISSIONS.ROLES_ASSIGN), 'u'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('rbac policies', () => {
  it('isOwner compares ownership', () => {
    const context = toAuthorizationContext('user-1', { roleKeys: [], permissionKeys: [] });
    expect(isOwner(context, 'user-1')).toBe(true);
    expect(isOwner(context, 'user-2')).toBe(false);
    expect(isOwner(context, null)).toBe(false);
  });

  it('authorizePolicy runs onDeny and throws when denied', async () => {
    const context = toAuthorizationContext('user-1', { roleKeys: [], permissionKeys: [] });
    const policy = definePolicy<{ ownerId: string }>('own', (ctx, resource) =>
      isOwner(ctx, resource.ownerId),
    );
    const onDeny = vi.fn();
    await expect(
      authorizePolicy(policy, context, { ownerId: 'user-2' }, onDeny),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(onDeny).toHaveBeenCalledTimes(1);
  });
});

describe('RedisPermissionCache', () => {
  function fakeRedis(): Redis {
    const store = new Map<string, string>();
    return {
      get: (key: string) => Promise.resolve(store.get(key) ?? null),
      set: (key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve('OK');
      },
      del: (key: string) => {
        const existed = store.delete(key);
        return Promise.resolve(existed ? 1 : 0);
      },
    } as unknown as Redis;
  }

  it('stores, reads and invalidates resolved authorization', async () => {
    const cache = new RedisPermissionCache(fakeRedis(), 300);
    const value = { roleKeys: ['admin'], permissionKeys: ['roles.read'] };
    expect(await cache.get('user-1')).toBeNull();
    await cache.set('user-1', value);
    expect(await cache.get('user-1')).toEqual(value);
    await cache.invalidate('user-1');
    expect(await cache.get('user-1')).toBeNull();
  });
});
