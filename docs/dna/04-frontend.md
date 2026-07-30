# Frontend Engineering DNA

**Document ID:** DNA-04  
**Version:** 1.0.0  
**Status:** Approved  
**Owner:** Super Dreams Engineering Team

---

# Purpose

This document defines the frontend engineering standards for the Super Dreams platform.

It establishes how applications should be structured, how components should be built, how state should be managed, and how the user interface should remain consistent across the platform.

Every frontend application must follow these standards.

---

# Technology Stack

The frontend stack is standardized across the platform.

- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- Zustand
- React Hook Form
- Zod
- React Router

Alternative libraries require an approved Architecture Decision Record (ADR).

---

# Frontend Applications

Current applications:

- Business Control Center (BCC)
- Member Portal

Future applications:

- Mobile Web
- Partner Portal
- Public Portal

All applications should share common packages wherever possible.

---

# Application Structure

Every application should follow this structure.

```
src/
├── app/
├── assets/
├── components/
├── features/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── services/
├── store/
├── styles/
├── types/
├── utils/
└── main.tsx
```

Every folder has a single responsibility.

---

# Folder Responsibilities

## app/

Application bootstrap.

Responsible for:

- Providers
- Theme initialization
- Router setup
- Global configuration

---

## components/

Reusable UI components.

Examples:

- Button
- Modal
- Table
- Card
- Badge
- Input

Components must remain presentation-focused.

---

## features/

Business-specific functionality.

Examples:

- Wallet
- Rewards
- Campaigns
- Members

Feature modules own their business UI.

---

## layouts/

Application layouts.

Examples:

- Dashboard Layout
- Authentication Layout
- Public Layout

Layouts should not contain business logic.

---

## pages/

Top-level route pages.

Pages coordinate features but should not contain complex business logic.

---

## routes/

Application routing.

Responsibilities:

- Route definitions
- Route guards
- Lazy loading
- Navigation structure

---

## services/

HTTP clients and API integrations.

Services should not contain UI logic.

---

## store/

Global application state using Zustand.

Only global state belongs here.

Local UI state should remain inside components.

---

## hooks/

Reusable React hooks.

Hooks should encapsulate reusable logic.

Examples:

- useAuth
- usePermissions
- useMember
- useWallet

---

## utils/

Pure utility functions.

Utilities must not depend on React.

---

# Component Principles

Every component should be:

- Reusable
- Predictable
- Accessible
- Testable
- Small
- Well documented

Avoid creating large monolithic components.

---

# Component Naming

Use PascalCase.

Examples:

```
MemberCard.tsx

RewardTable.tsx

CampaignEditor.tsx
```

---

# Props

Always define explicit TypeScript interfaces.

Example:

```typescript
interface ButtonProps {
    label: string;
    disabled?: boolean;
    onClick: () => void;
}
```

Avoid using `any`.

---

# State Management

Use state based on scope.

Local component state:

- useState

Shared UI state:

- Zustand

Server state:

- TanStack Query

Form state:

- React Hook Form

Avoid storing server data inside Zustand.

---

# API Communication

All API requests must go through service modules.

Components must never call fetch() directly.

Services should return typed responses.

---

# Forms

All forms should use:

- React Hook Form
- Zod validation

Validation rules should be shared with the backend whenever practical.

---

# Routing

Use React Router.

Guidelines:

- Lazy load pages
- Protect authenticated routes
- Centralize route definitions
- Avoid deeply nested routing

---

# Permissions

Permission checks should occur at multiple levels.

- Route level
- Feature level
- Component level

Hidden UI elements are not a replacement for backend authorization.

---

# UI Consistency

The platform should maintain consistent:

- Typography
- Colors
- Spacing
- Icons
- Buttons
- Tables
- Forms
- Modals
- Notifications

Never duplicate design patterns.

---

# Responsive Design

Support:

- Desktop
- Tablet
- Mobile

Responsive behavior should be considered during implementation rather than added later.

---

# Accessibility

Every interface should support:

- Keyboard navigation
- Screen readers
- Visible focus states
- Sufficient color contrast
- Semantic HTML
- Accessible form labels

Accessibility is mandatory.

---

# Performance

Prefer:

- Lazy loading
- Code splitting
- Memoization when appropriate
- Virtualized lists for large datasets

Avoid unnecessary re-renders.

---

# Error Handling

Provide clear feedback for:

- Validation errors
- Network failures
- Permission issues
- Empty states
- Loading states

Never expose technical errors directly to users.

---

# Testing

Frontend testing should cover:

- Component rendering
- User interactions
- Form validation
- Permission logic
- Navigation
- Error handling

---

# Documentation

Every feature should include:

- README.md
- API usage
- Permission notes
- Component documentation

---

# Definition of Done

A frontend feature is complete only when it includes:

- Responsive layout
- Accessibility
- Validation
- Loading states
- Error states
- Permission handling
- Tests
- Documentation

---

# Related Documents

- docs/dna/01-platform.md
- docs/dna/02-repository.md
- docs/dna/03-backend.md
- docs/dna/06-api.md
- docs/dna/10-claude-rules.md

---

# End of Document