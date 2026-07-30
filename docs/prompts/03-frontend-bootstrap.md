# Super Dreams Platform
## Phase 03 — Frontend Bootstrap

---

# ROLE

You are the Lead Frontend Architect for the Super Dreams Platform.

Your responsibility is to build the complete frontend foundation that all future applications will use.

This phase establishes the architecture, layouts, routing, state management, design system integration, and development standards.

Do NOT implement business features.

Only build the frontend infrastructure.

---

# REQUIRED READING

Before making any changes, read and follow:

- docs/README.md
- docs/dna/01-platform.md
- docs/dna/02-repository.md
- docs/dna/04-frontend.md
- docs/dna/10-claude-rules.md
- docs/product/PRODUCT_OVERVIEW.md

These documents are mandatory.

---

# OBJECTIVE

Bootstrap the frontend applications.

Create:

apps/
    bcc/
    member/

Both applications must share the same engineering standards while allowing different layouts and business modules.

Do NOT implement:

- Authentication screens
- Dashboard widgets
- Members
- Wallet
- Rewards
- Campaigns
- Reports
- Notifications
- Settings

Only build the application foundation.

---

# TECHNOLOGY STACK

Use exactly:

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Axios
- React Helmet
- React Error Boundary

Do not introduce additional UI frameworks.

---

# APPLICATION STRUCTURE

Each application should follow:

```text
src/
├── app/
├── assets/
├── components/
│   ├── common/
│   ├── layout/
│   └── feedback/
├── features/
├── hooks/
├── layouts/
├── pages/
├── providers/
├── routes/
├── services/
├── store/
├── styles/
├── types/
├── utils/
├── constants/
└── main.tsx
```

---

# APPLICATION BOOTSTRAP

Configure:

React Root

Providers

Routing

Theme

Global Styles

React Query

Error Boundary

Axios Provider

Application Configuration

Everything should be modular.

---

# ROUTING

Configure React Router.

Create:

Public Layout

Application Layout

404 Page

Error Page

Home Page

Use lazy loading.

Prepare route guards.

Do not implement authentication.

---

# LAYOUTS

Create reusable layouts.

Application Layout

Should include:

Sidebar placeholder

Header placeholder

Content area

Breadcrumb area

Footer placeholder

Responsive layout

Public Layout

Simple centered layout.

---

# COMPONENT LIBRARY

Create reusable components.

Button

Input

Card

Modal

Badge

Spinner

Loading Screen

Page Container

Empty State

Error State

Confirmation Dialog

Notification Container

Do not include business logic.

---

# STATE MANAGEMENT

Configure Zustand.

Create stores for:

Application

Theme

User Session (placeholder)

Navigation

Do not implement authentication.

Use TanStack Query only for server state.

---

# SERVICES

Create Axios API client.

Configure:

Base URL

Timeout

Request interceptor

Response interceptor

Typed responses

Error normalization

No authentication logic.

---

# FORMS

Configure:

React Hook Form

Zod

Shared form helpers

Form error handling

Reusable form wrapper

---

# STYLING

Configure Tailwind CSS.

Create:

Design tokens

Typography

Spacing

Border radius

Shadows

Transitions

Responsive breakpoints

Support light and dark themes.

---

# THEME

Create theme provider.

Support:

Light

Dark

System

Persist user preference.

---

# ERROR HANDLING

Create:

Global Error Boundary

Error Page

Network Error Component

Empty State Component

Loading Component

Fallback UI

---

# ACCESSIBILITY

Ensure:

Keyboard navigation

Focus indicators

ARIA attributes

Semantic HTML

Accessible forms

Responsive typography

---

# PERFORMANCE

Enable:

Lazy loading

Code splitting

Route splitting

Memoization where appropriate

Optimize bundle structure.

---

# TESTING

Configure:

Vitest

React Testing Library

Component test utilities

Sample layout test

No business tests.

---

# README

Generate README.md for both applications.

Include:

Purpose

Folder structure

Development

Commands

Architecture

---

# QUALITY CHECKLIST

Verify:

Applications start successfully

Routing works

Layouts render

Tailwind works

React Query configured

Zustand configured

Tests pass

Lint passes

Typecheck passes

Build passes

No placeholder code

---

# OUTPUT FORMAT

Work in small phases.

For every phase:

Explain the objective.

Generate files.

Explain architectural decisions.

Verify.

Continue.

---

# STOP CONDITION

When frontend bootstrap is complete:

Summarize:

- Folder structure
- Generated components
- Installed packages
- Architecture decisions
- Shared patterns

Wait for approval.

Do not continue to shared packages.