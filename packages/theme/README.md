# @superdreams/theme

The Super Dreams design tokens: a Tailwind **preset**, design-token **CSS**, and
typed **token constants**. Shared by every frontend application so theming stays
consistent and in one place.

## Public API

- `@superdreams/theme` → `{ preset }` (also the default export) plus all token
  constants (`tokens`, `breakpoints`, `spacing`, `radii`, `shadows`, `elevation`,
  `zIndex`, `fontSize`, `fontWeight`, `lineHeight`, `duration`, `easing`,
  `SEMANTIC_COLORS`, …).
- `@superdreams/theme/preset` → the Tailwind preset.
- `@superdreams/theme/styles.css` → design-token CSS variables (light + dark).

## Usage

`tailwind.config.ts` — add the preset and **scan the shared UI package** so its
component classes are generated:

```ts
import { preset } from '@superdreams/theme';

export default {
    presets: [preset],
    content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
};
```

Application `globals.css`:

```css
@import '@superdreams/theme/styles.css';
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Design tokens

Colors are **semantic** and resolve to CSS variables, so they switch with the
theme. Reference them via Tailwind utilities (`bg-primary`, `text-muted-foreground`,
`border-info`) — **never** hardcode a color.

| Group           | Tokens                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| Brand / neutral | `background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `card`, `popover`, `border`, `input`, `ring` |
| Semantic        | `success`, `warning`, `info`, `destructive`                                                                         |
| Typography      | `fontSize` (xs–4xl, each with line-height), `fontWeight`, `lineHeight`, `fontFamily` (sans, mono)                   |
| Spacing         | Tailwind numeric scale + semantic `spacing` (xs–3xl)                                                                |
| Radius          | `none`, `sm`, `md`, `lg` (from `--radius`), `xl`, `2xl`, `full`                                                     |
| Elevation       | `shadow-sm/md/lg/xl`, `shadow-card`, `shadow-overlay`; `elevation` 0–5                                              |
| Z-index         | `hide … dropdown, sticky, banner, overlay, modal, popover, drawer, toast, tooltip`                                  |
| Breakpoints     | `xs 480 · sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536` (mobile-first)                                            |
| Motion          | `duration` (instant–slower), `easing` (standard/emphasized/decelerate/accelerate)                                   |

Every value is available both as a Tailwind utility (via the preset) and as a JS
constant (via `tokens`), which stay in lockstep because the preset is built from
the token module.

### Theming

Light and dark values live in `styles.css` under `:root` and `.dark`. Toggling
the `dark` class on `<html>` switches the theme; the `ThemeProvider` in
`@superdreams/ui` manages this, including system-preference detection.

## Folder Structure

```text
src/
├── tokens.ts     # typed token constants (single source of truth)
├── preset.ts     # Tailwind preset, built from tokens
├── styles.css    # CSS variables (:root / .dark)
└── index.ts      # public exports
```

## Development

`pnpm --filter @superdreams/theme test | lint | typecheck`. Tokens only — no
business logic.
