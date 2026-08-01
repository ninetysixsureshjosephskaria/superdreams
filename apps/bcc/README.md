# @superdreams/bcc

The Super Dreams **Business Control Center** — the administrative web application.

> **Phase 11 — Admin Application Shell.** This app provides the complete admin
> **layout and navigation framework** plus a mock dashboard. It uses **static
> mock data only** — no authentication, no API calls, and no business logic.
> Business modules (Members, Wallet, Rewards, …) plug into this shell in later
> phases without modifying it.

---

## Technology

React + TypeScript + Vite, Tailwind CSS (via `@superdreams/theme`), the shared
`@superdreams/ui` design system, React Router, Zustand (client state), TanStack
Query (server state — reserved for later), react-helmet-async, react-error-boundary.

---

## Folder structure

```text
src/
├── app/            # Composition root (App)
├── components/
│   ├── sidebar/    # SidebarNav (desktop, collapsible) + MobileNav (drawer) + NavList
│   ├── header/     # AppHeader (sticky)
│   ├── search/     # GlobalSearch (UI only)
│   ├── notifications/  # NotificationsMenu (mock dropdown)
│   ├── user-menu/  # UserMenu (avatar dropdown, mock sign-out)
│   ├── quick-actions/  # QuickActions (header menu)
│   ├── breadcrumbs/    # config-aware Breadcrumbs
│   ├── page-header/    # PageHeader (breadcrumb + title + actions)
│   ├── footer/     # AppFooter
│   ├── dashboard/  # dashboard widgets (mock)
│   ├── loaders/    # PageLoader, CardSkeleton
│   ├── skip-link/  # SkipLink (a11y)
│   └── feedback/   # NotificationContainer (toasts)
├── navigation/     # nav config + types + useNavItems (permission-filtered)
├── guards/         # ProtectedRoute (mock auth/RBAC seam)
├── layouts/        # AppLayout (admin shell), PublicLayout
├── pages/          # dashboard, placeholder, errors (401/403/404/500)
├── mocks/          # static mock data (user, permissions, dashboard, notifications)
├── hooks/          # usePermissions, useBreadcrumbs, useTheme, …
├── store/          # Zustand (navigation, session, theme, notifications, app)
├── constants/      # routes, app metadata, env
├── utils/          # breadcrumb/nav helpers
└── main.tsx
```

---

## Layout architecture

`AppLayout` composes the shell from design-system components:

```
SkipLink → AppHeader (sticky) → [ SidebarNav | main(Outlet) + AppFooter ] → MobileNav (portal) + Toasts
```

- **Header** — nav toggles, global search (UI only), quick actions, notifications
  (mock), theme switch, user menu.
- **Sidebar** — collapsible on desktop (persisted), icon-only when collapsed.
- **Mobile drawer** — the sidebar becomes an overlay (`@superdreams/ui` `Drawer`)
  below `md`.
- **Content** — routed pages render inside `<main id="main-content">` behind a
  `Suspense` `PageLoader`. Each page renders a `PageHeader` (breadcrumb + title).

## Navigation system

Navigation is **configuration-driven** — see `navigation/nav-config.ts`. Add a
future module by adding one `NavItem` (label, path, icon, optional `permission`).
`useNavItems()` filters items by the caller's permissions, and the same config
drives the sidebar, mobile drawer, and breadcrumbs. Pages never hardcode nav.

## Route protection

`ProtectedRoute` wraps the admin area. **This phase performs no real
authentication** — it consults a _mock_ session/permission store, so it always
allows access and simply demonstrates the seam:

- unauthenticated → redirect to `/401`
- missing permission → redirect to `/403`

When the authentication + RBAC phase lands, only `guards/`, `hooks/use-permissions`,
`store/session-store`, and `mocks/` change — the shell, navigation, and pages stay
as-is.

## Responsive behavior

Mobile-first. Desktop shows the sidebar; **below `md` it collapses into a drawer**
opened from the header. The header is sticky; content padding and grids adapt at
`sm`/`lg`/`xl`. Layout uses only design-system tokens and utilities.

## Accessibility

Skip-to-content link, focus-visible rings, `role`/ARIA on the sidebar
(`complementary`), nav, breadcrumbs (`aria-current`), and menus; icon-only
controls are labeled; the mobile drawer traps within a dialog and closes on
Escape/backdrop.

## Extension guide

1. Add a route path to `constants/routes.ts`.
2. Add a `NavItem` to `navigation/nav-config.ts` (with an optional `permission`).
3. Create the module page(s) under `pages/<module>/` and route them in
   `routes/router.tsx` (wrap in `ProtectedRoute`, optionally with a `permission`).
4. Compose the page from `@superdreams/ui` components and a `PageHeader`.

No shell, layout, or navigation-component changes are required.

---

## Commands

| Command                                    | Description               |
| ------------------------------------------ | ------------------------- |
| `pnpm --filter @superdreams/bcc dev`       | Start the dev server.     |
| `pnpm --filter @superdreams/bcc build`     | Type-check and build.     |
| `pnpm --filter @superdreams/bcc typecheck` | Type-check (tsc).         |
| `pnpm --filter @superdreams/bcc lint`      | Lint (ESLint).            |
| `pnpm --filter @superdreams/bcc test`      | Run tests (Vitest + RTL). |

These also run via Turborepo from the root.
