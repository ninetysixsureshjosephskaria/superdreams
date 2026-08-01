# @superdreams/ui

The Super Dreams **Design System**: a shared, presentation-only React component
library. No business logic, no data access, no API calls, no store/router
coupling — state and router-aware content are injected via props. Built entirely
on `@superdreams/theme` tokens (no hardcoded colors).

## Design principles

Every component is accessible (WCAG AA where practical), responsive (mobile-first),
theme-aware (light/dark), fully typed, keyboard-navigable, reusable, and
business-agnostic.

## Component catalog

| Group            | Components                                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Buttons**      | `Button`, `IconButton`                                                                                                                                                |
| **Inputs**       | `Input`, `PasswordInput`, `Textarea`, `Select`, `MultiSelect`, `Checkbox`, `RadioGroup`, `Switch`, `SearchBox`, `DateInput`, `FileUpload`                             |
| **Form system**  | `Label`, `FormField`, `FormSection`, `Form`, `FieldError`                                                                                                             |
| **Data display** | `Badge`, `Avatar`, `Card` (+ parts), `StatCard`, `Skeleton`, `Progress`, `Tabs`, `Accordion`, `Pagination`, `DataTable`                                               |
| **Overlays**     | `Modal`, `ConfirmationDialog`, `Drawer`, `Tooltip`, `Popover`, `DropdownMenu`                                                                                         |
| **Feedback**     | `Alert`, `Spinner`, `LoadingScreen`, `EmptyState`, `ErrorState`, `NetworkError`, `NotificationList`, `AppErrorFallback`, Toast (`ToastProvider` + `useToast`)         |
| **Screens**      | `ErrorScreen`, `UnauthorizedScreen`, `NotFoundScreen`                                                                                                                 |
| **Layout**       | `AppShell`, `PageContainer`, `Section`, `ContentCard`, `Surface`, `Stack`, `Flex`, `Grid`, `Divider`, `ScrollArea`, `AppHeader`, `SidebarNav`, `Footer`, `Breadcrumb` |
| **Icons**        | `Icon` (in-house set), `ICON_NAMES`                                                                                                                                   |
| **Theming**      | `ThemeProvider`, `ThemeToggle`, `useTheme`                                                                                                                            |
| **Hooks**        | `useDisclosure`                                                                                                                                                       |

## Usage examples

```tsx
import { Button, Icon, FormField, Input, useToast } from '@superdreams/ui';

<Button variant="primary" leftIcon={<Icon name="plus" size="sm" />}>
    New
</Button>;

<FormField label="Email" required error={error?.message} hint="Work email">
    <Input type="email" {...register('email')} />
</FormField>;

const { toast } = useToast();
toast({ variant: 'success', title: 'Saved' });
```

`DataTable` is fully controlled (sorting/selection/pagination emitted as events,
never bound to a data source):

```tsx
<DataTable
    columns={columns}
    rows={rows}
    getRowId={(row) => row.id}
    sort={sort}
    onSortChange={setSort}
    selectable
    selectedIds={selected}
    onSelectionChange={setSelected}
/>
```

## Theming

Wrap the app once; toggle anywhere:

```tsx
<ThemeProvider storageId="bcc" defaultMode="system">
    <App /> {/* <ThemeToggle /> flips light/dark */}
</ThemeProvider>
```

`ThemeProvider` toggles the `dark` class on `<html>`, persists the choice, and
follows the OS preference in `system` mode.

## Accessibility

- Focusable, keyboard-operable controls with visible `focus-visible` rings.
- Correct roles/ARIA: `Tabs` (roving `tablist`/`tab`/`tabpanel`), `Accordion`
  (`aria-expanded` + region), `Switch` (`role="switch"`), `Progress`
  (`role="progressbar"`), `Alert`/`Toast` (`role="alert"` / live region),
  `Pagination` (`aria-current`), `DataTable` (`aria-sort`).
- Icon-only controls (`IconButton`) require a `label`; decorative icons are
  `aria-hidden`.
- `FormField` wires `id` / `aria-invalid` / `aria-describedby` automatically.

## Responsive strategy

Mobile-first. Layout primitives (`Grid`, `Stack`, `Flex`) and `AppShell` collapse
gracefully; `DataTable` scrolls horizontally within its container; breakpoints
come from the shared token scale.

## Architecture

- Presentation only — no business logic, API calls, auth or RBAC.
- Depends on `@superdreams/theme`, `@superdreams/constants`, `@superdreams/utils`,
  `@superdreams/types`. Peer: `react`, `react-dom`, `react-hook-form`,
  `react-error-boundary`.
- The consuming app's Tailwind `content` **must** include
  `../../packages/ui/src/**/*.{ts,tsx}` (see `@superdreams/theme` README).

## Folder Structure

```text
src/
├── components/
│   ├── common/    # buttons, inputs, badges, cards, tabs, accordion, pagination, …
│   ├── form/      # Label, FormField, FormSection
│   ├── feedback/  # Alert, Toast, spinners, states, screens
│   ├── layout/    # AppShell + layout primitives + app shells
│   ├── overlay/   # Tooltip, Popover, DropdownMenu, Drawer
│   ├── data/      # DataTable
│   └── icons/     # Icon + icon set
├── theming/       # ThemeProvider, ThemeToggle, useTheme
└── hooks/         # useDisclosure
```

## Development

`pnpm --filter @superdreams/ui test | lint | typecheck`. (Storybook is not part
of the current stack; component usage is documented here and exercised by tests.)
