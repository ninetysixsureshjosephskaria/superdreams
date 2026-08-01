# RBAC Module (Authorization)

Role-Based Access Control foundation. Provides roles, permissions, assignments,
centralized permission resolution, reusable guards/policies, and protected
management endpoints. It **reuses** the Identity module (user existence) and the
Authentication module (the authentication preHandler) — no user or session logic
is duplicated here.

Authorization only. No business modules, and — per the DNA (ADR-007, DNA-07) —
**no permission groups and no role hierarchy** (the DNA defines flat RBAC).

## RBAC architecture

```
User ──< user_roles >── Role ──< role_permissions >── Permission
```

- **Permissions** — atomic capabilities identified by a stable `key`
  (e.g. `roles.assign`). Referenced in code only via the `PERMISSIONS` catalog
  constants, never string literals.
- **Roles** — named permission collections. System roles (e.g. `super-admin`)
  are seeded and flagged `is_system`.
- **Assignments** — `user_roles` (multiple roles per user) and
  `role_permissions` are join tables; removal is a real delete.

The code-defined catalog (`catalog.ts`) is synced into the database idempotently
by `syncRbacCatalog` (registered as the `rbac-catalog` seed for every
environment).

## Permission resolution

`PermissionResolver` is the single place effective authorization is computed:

```
resolve(userId):
  1. cache.get(userId) ── hit ─→ return
  2. roleKeys       = roles.listKeysForUser(userId)          (user_roles ⋈ roles)
  3. permissionKeys = permissions.listKeysForUser(userId)    (user_roles ⋈ role_permissions ⋈ permissions)
  4. cache.set(userId, { roleKeys, permissionKeys })
```

Resolution is **always server-side**. Any assignment change invalidates the
cache for the affected user(s): role changes invalidate that user; role↔permission
changes invalidate every user holding the role.

## Caching

`PermissionCache` has two implementations: `RedisPermissionCache` (used when
Redis is available and `RBAC_CACHE_ENABLED` is true) and `NoopPermissionCache`.
TTL is `RBAC_PERMISSION_CACHE_TTL_SECONDS` (default 300s). Cache is a performance
optimization only — it never changes authorization outcomes.

## Guards (authentication → authorization, always)

Guards are preHandlers applied **after** the authentication preHandler. They read
`request.auth`, resolve effective authorization (memoized on `request.authz`),
and throw the canonical `ForbiddenError` on denial (emitting `AuthorizationDenied`).

| Guard                               | Requires                |
| ----------------------------------- | ----------------------- |
| `requirePermission(deps, key)`      | the permission          |
| `requireAllPermissions(deps, keys)` | all permissions         |
| `requireAnyPermission(deps, keys)`  | at least one permission |
| `requireRole(deps, roleKey)`        | the role                |

Helpers (`decorators/`): `RequirePermission(deps, ...keys)`,
`RequireRole(deps, key)`, `currentUser(request)`, `currentPermissions(request)`,
`currentRoles(request)`. The `loadPermissions(authorization)` middleware
pre-attaches `request.authz` for authenticated requests.

## Policy framework

For rules that go beyond a static permission (resource + ownership + custom
logic). This phase ships only the framework — no module-specific policies.

```ts
const canEdit = definePolicy<Post>(
    'post.edit',
    (ctx, post) => contextHasPermission(ctx, PERMISSIONS.ROLES_READ) || isOwner(ctx, post.authorId),
);
await authorizePolicy(canEdit, toAuthorizationContext(userId, resolved), post);
```

## Endpoints (`/api/v1`, all protected)

| Method | Path                                   | Permission                 |
| ------ | -------------------------------------- | -------------------------- |
| GET    | `/roles`                               | `roles.read`               |
| GET    | `/permissions`                         | `permissions.read`         |
| POST   | `/roles/:id/users`                     | `roles.assign`             |
| DELETE | `/roles/:id/users/:userId`             | `roles.assign`             |
| POST   | `/roles/:id/permissions`               | `roles.permissions.manage` |
| DELETE | `/roles/:id/permissions/:permissionId` | `roles.permissions.manage` |
| GET    | `/users/:id/permissions`               | `users.permissions.read`   |

## Events

`RoleAssigned`, `RoleRemoved`, `PermissionAssigned`, `PermissionRemoved`,
`AuthorizationDenied` (audit hook) — via the in-process `RbacEventBus`.

## Integration example

```ts
// In a future module's routes:
instance.post(
    '/posts',
    { preHandler: [authenticate, requirePermission(guardDeps, 'posts.create')] },
    controller.create,
);
```

## Bootstrapping the first admin

`syncRbacCatalog` seeds permissions and the `super-admin` role (granted every
permission). Assigning that role to the first user is a deliberate operational
step (`pnpm db:seed` populates the catalog; role assignment is done via the API
or a manual insert). See the Phase 09 report for details.
