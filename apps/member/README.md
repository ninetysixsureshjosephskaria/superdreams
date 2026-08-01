# @superdreams/member

The Super Dreams **Member Portal** — the member-facing web application.

> **Phase 12 — Member Portal Layout.** This app provides the complete member
> **layout and navigation framework** plus a mock dashboard. It uses **static
> mock data only** — no authentication, no API calls, and no business logic.
> Member features plug into this shell without modifying it. The navigation is
> intentionally focused on Home, Games, Dream Store, Wallet and Profile. It shares
> the design system and engineering standards with `@superdreams/bcc`, optimizing
> the experience for end users.

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
│   ├── header/     # AppHeader (sticky)
│   ├── sidebar/    # SidebarNav (desktop, collapsible) + NavList
│   ├── mobile-nav/ # BottomNav (mobile) + MoreDrawer
│   ├── notifications/  # NotificationsMenu (mock dropdown)
│   ├── profile-menu/   # ProfileMenu (avatar dropdown, mock sign-out)
│   ├── breadcrumbs/    # config-aware Breadcrumbs
│   ├── page-header/    # PageHeader (breadcrumb + title + actions)
│   ├── footer/     # AppFooter
│   ├── dashboard/  # dashboard widgets (mock)
│   ├── loaders/    # PageLoader, CardSkeleton
│   ├── skip-link/  # SkipLink (a11y)
│   └── feedback/   # NotificationContainer (toasts)
├── navigation/     # nav config + types + useNavItems (permission-filtered)
├── guards/         # ProtectedRoute (mock auth/RBAC seam)
├── layouts/        # AppLayout (member shell), PublicLayout
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
SkipLink → AppHeader (sticky) → [ SidebarNav | main(Outlet) + AppFooter ] → BottomNav + MoreDrawer + Toasts
```

- **Header** — brand, notifications (mock), theme switch, profile menu (sticky).
- **Sidebar (desktop, `md`+)** — collapsible (persisted), icon-only when collapsed.
- **Bottom navigation (mobile, `< md`)** — thumb-friendly bar with the primary
  items plus a **More** button that opens a full-navigation drawer.
- **Content** — routed pages render inside `<main id="main-content">` behind a
  `Suspense` `PageLoader`; extra bottom padding on mobile clears the bottom bar.

## Navigation system

Navigation is **configuration-driven** — see `navigation/nav-config.ts`, the
single source of truth. The final product design keeps the member navigation
intentionally small:

1. **Home** (`/`)
2. **Games** (`/games`) — three static demo games (illustrative only; no backend)
3. **Dream Store** (`/dream-store`) — static demo product catalog (illustrative only; no backend)
4. **Wallet** (`/wallet`, functional)
5. **Profile** (`/profile`, functional)

The same config drives the sidebar, mobile bottom bar, "More" drawer and
breadcrumbs; pages never hardcode nav. Add a `NavItem` (label, path, icon,
optional `permission`, optional `primary` for the mobile bar) to surface a new
destination. Other member feature pages/APIs (rewards, campaigns, notifications,
statements, support) remain in the codebase but are not surfaced in navigation
or routing.

## Route protection

`ProtectedRoute` wraps the member area. **This phase performs no real
authentication** — it consults a _mock_ session/permission store, so it always
allows access and simply demonstrates the seam (unauthenticated → `/401`, missing
permission → `/403`). When authentication + RBAC land, only `guards/`,
`hooks/use-permissions`, `store/session-store`, and `mocks/` change.

## Responsive behavior

Mobile-first, tuned for members. Desktop/tablet show the sidebar; **on mobile the
navigation becomes a fixed bottom bar** (+ a "More" drawer). The header is sticky;
dashboard grids adapt at `md`/`lg`/`xl`. Layout uses only design-system tokens.

## Accessibility

Skip-to-content link, focus-visible rings, `role`/ARIA on the sidebar
(`complementary`), navigation landmarks, breadcrumbs (`aria-current`), and menus;
icon-only controls are labeled; the more-drawer is a dialog that closes on
Escape/backdrop.

## Extension guide

1. Add a route path to `constants/routes.ts`.
2. Add a `NavItem` to `navigation/nav-config.ts` (optional `permission` / `primary`).
3. Create the feature page(s) under `pages/<feature>/` and route them in
   `routes/router.tsx` (wrap in `ProtectedRoute`, optionally with a `permission`).
4. Compose the page from `@superdreams/ui` components and a `PageHeader`.

No shell, layout, or navigation-component changes are required.

---

## Commands

| Command                                       | Description               |
| --------------------------------------------- | ------------------------- |
| `pnpm --filter @superdreams/member dev`       | Start the dev server.     |
| `pnpm --filter @superdreams/member build`     | Type-check and build.     |
| `pnpm --filter @superdreams/member typecheck` | Type-check (tsc).         |
| `pnpm --filter @superdreams/member lint`      | Lint (ESLint).            |
| `pnpm --filter @superdreams/member test`      | Run tests (Vitest + RTL). |

These also run via Turborepo from the root.
