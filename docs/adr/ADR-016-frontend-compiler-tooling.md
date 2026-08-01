# ADR-016 — Frontend Compiler & Tooling Decisions

**Status:** Approved
**Date:** 2026-07-30
**Owner:** Super Dreams Engineering Team
**Applies to:** `apps/bcc`, `apps/member` (frontend applications only)
**Relates to:** DNA‑01 (Platform), DNA‑04 (Frontend), DNA‑08 (Testing), ADR‑003 (React + Vite)

---

## Context

Phase 03 bootstrapped the two frontend applications on the approved stack
(React + TypeScript + Vite, per ADR‑003). The repository's shared TypeScript base
(`tsconfig.base.json`) is intentionally strict and is tuned for **library and
backend** code. Applying every base compiler flag verbatim to React application
code, and pairing arbitrary test/build tool majors, introduced friction that was
resolved during Phase 03 and approved at review.

This ADR records those decisions so they are not re-litigated and are applied
consistently to future frontend applications.

The decisions are deliberately **scoped to applications only**. The backend
(`backend/api`) and shared packages retain the stricter base settings.

---

## Decision

The following settings apply to frontend application packages, configured in each
app's `tsconfig.json` / `package.json` (overriding the shared base where noted).

### 1. `exactOptionalPropertyTypes: false` (React code: apps + `packages/ui`)

Disabled for React application code **and the React UI component library
(`packages/ui`)**. `strict` remains **on**; `exactOptionalPropertyTypes` is not
part of the `strict` family.

- **Why:** React composition forwards optional props ubiquitously
  (`<Modal description={maybeUndefined} />`, `{...props}` spreads). With the flag
  on, every optional value passed to an optional prop becomes a type error unless
  each call site is rewritten with conditional spreads, adding noise without
  catching real defects in presentational components. `packages/ui` is React
  presentational code with the same ergonomics, so it shares this exception.
- **Scope:** `backend/api` and all **non-React** shared packages (`types`,
  `utils`, `validation`, `api-client`, `constants`, `theme`) keep
  `exactOptionalPropertyTypes: true` (inherited from the base).

### 2. `declaration: false` (applications only)

Applications do not emit type declarations; **reusable packages keep
`declaration: true`** (inherited from the base).

- **Why:** Apps are deployable artifacts, not libraries — declaration emit adds
  cost and surfaced `TS2742` ("inferred type cannot be named without a reference
  to …") for third-party inferred types (e.g. the router), which is irrelevant
  to a bundled app. Shared packages, by contrast, are proper libraries whose
  public types matter, so they retain full declaration checking (type-checked via
  `tsc --noEmit`).
- **Scope:** Applications set `declaration: false` / `declarationMap: false`.
  All shared packages (`types`, `utils`, `validation`, `api-client`,
  `constants`, `theme`, `ui`) keep `declaration: true` from the base.

### 3. Vitest 3 (apps)

Frontend applications use **Vitest 3.x** with React Testing Library.

- **Why:** The apps use Vite 6 (see below). Vitest 2 peer-depends on Vite 5, which
  caused two Vite majors to resolve simultaneously and produced incompatible
  `PluginOption` config types. Vitest 3 supports Vite 6, yielding a single Vite.
- **Scope:** `backend/api` (no Vite) remains on **Vitest 2**; there is no need to
  bump it, and the two coexist cleanly as isolated workspace dependencies.

### 4. Vite 6 (apps)

Frontend applications build and serve with **Vite 6.x** (with
`@vitejs/plugin-react`).

- **Why:** Current major with first-class Node 24 support; keeps the apps on the
  modern toolchain. Paired with Vitest 3 for a single, consistent Vite version.

---

## Consequences

**Positive**
- Idiomatic, low-friction React code without weakening `strict`.
- A single Vite version per app; no dual-major type conflicts.
- Clear, documented per-package tuning: apps vs. backend vs. shared packages.

**Trade-offs / risks**
- Applications lose the extra safety of `exactOptionalPropertyTypes`. Mitigation:
  `strict` and other strict-adjacent flags (`noUncheckedIndexedAccess`,
  `noImplicitOverride`, etc.) remain on; **shared packages keep the flag**, so
  reusable code extracted in later phases is still checked at full strictness.
- Two Vitest majors exist in the monorepo (backend v2, apps v3). This is
  intentional and isolated; revisit if/when the backend adopts Vite tooling.

**Non-goals**
- This ADR does not change the approved stack (ADR‑003). It records compiler/tool
  configuration only.

---

## Alternatives Considered

- **Keep `exactOptionalPropertyTypes: true` for apps** — rejected: pervasive
  conditional-spread boilerplate in presentational components with negligible
  defect-catching value.
- **Keep declaration emit for apps** — rejected: apps are not libraries; emit adds
  cost and `TS2742` noise.
- **Vite 5 + Vitest 2 (align down)** — viable and stable, but pins the apps to an
  older Vite major with no benefit; rejected in favor of the current toolchain.
- **Bump the backend to Vitest 3 for uniformity** — out of scope; the backend has
  no Vite dependency and a forced bump adds churn without value.

---

## Change Process

These settings are stable. Changing them (e.g. re-enabling
`exactOptionalPropertyTypes` for apps, or moving to a new Vite/Vitest major)
requires a superseding ADR that documents the migration and its impact, per the
process in DNA‑11.
