# Super Dreams Platform
## Phase 10 — Design System

---

# ROLE

You are the Lead Product Designer and Frontend Architect for the Super Dreams Platform.

Your responsibility is to transform the existing UI package into a complete enterprise Design System.

Do NOT implement business modules.

Do NOT build dashboards.

Do NOT create business pages.

Only build the reusable design language.

---

# REQUIRED READING

Read before making changes:

- docs/README.md
- docs/dna/04-frontend.md
- docs/dna/10-claude-rules.md
- docs/product/PRODUCT_OVERVIEW.md

Also review:

- packages/ui
- packages/theme

---

# OBJECTIVE

Create a scalable Design System that every frontend application (BCC Admin and Member Portal) will use.

The Design System must provide consistency, accessibility, responsiveness, and extensibility.

---

# DESIGN PRINCIPLES

Every component must be:

- Accessible (WCAG AA)
- Responsive
- Theme-aware
- Fully typed
- Keyboard navigable
- Reusable
- Business-agnostic

No module-specific styling.

---

# DESIGN TOKENS

Expand the theme package with:

- Brand colors
- Semantic colors (success, warning, error, info)
- Neutral palette
- Typography scale
- Font weights
- Line heights
- Spacing scale
- Border radius
- Shadows
- Z-index scale
- Breakpoints
- Motion durations
- Easing curves

Expose all tokens as reusable constants and CSS variables.

---

# COMPONENT LIBRARY

Review and enhance existing components.

Ensure every component supports:

- Variants
- Sizes
- Disabled state
- Loading state
- Error state
- Accessibility attributes
- Keyboard interaction
- Dark mode
- RTL readiness (where practical)

Components include:

- Button
- Input
- Textarea
- Select
- Checkbox
- Radio
- Switch
- Badge
- Avatar
- Card
- Modal
- Dialog
- Drawer
- Tabs
- Table
- Pagination
- Tooltip
- Popover
- Dropdown
- Toast
- Spinner
- Skeleton
- Empty State
- Error State
- File Upload
- Date Picker
- Search Box

---

# LAYOUT PRIMITIVES

Create reusable layout components:

- AppShell
- PageContainer
- Section
- Grid
- Stack
- Flex
- Divider
- Surface
- ScrollArea

These will be used by every application.

---

# FEEDBACK COMPONENTS

Create consistent patterns for:

- Loading
- Empty
- Error
- Success
- Confirmation
- Inline validation
- Global notifications

---

# ICON SYSTEM

Configure a single icon library.

Create wrappers to ensure consistent sizing and styling.

---

# FORM SYSTEM

Standardize:

- Labels
- Required indicators
- Help text
- Validation messages
- Error presentation
- Field grouping

Ensure seamless integration with React Hook Form.

---

# TABLE SYSTEM

Create a reusable data table foundation supporting:

- Sorting
- Filtering
- Pagination
- Loading
- Empty state
- Row actions
- Bulk selection hooks
- Responsive behavior

Do not bind to any specific data source.

---

# THEMING

Support:

- Light mode
- Dark mode
- Theme switching
- System preference detection

Prepare for future branding customization.

---

# DOCUMENTATION

Create documentation including:

- Design principles
- Token reference
- Component catalog
- Usage guidelines
- Accessibility guidance
- Theming guide

If Storybook is part of the stack, configure it and document component usage there.

---

# TESTING

Create:

- Component tests
- Accessibility checks (where feasible)
- Visual regression preparation
- Type tests

---

# QUALITY CHECKLIST

Verify:

- Components build successfully
- No duplicate styles
- Theme switching works
- Accessibility standards are met
- Typecheck passes
- Lint passes
- Tests pass

---

# OUTPUT FORMAT

Implement in logical phases.

For each phase:

1. Explain the objective.
2. Generate the files.
3. Explain design decisions.
4. Verify.
5. Continue.

---

# STOP CONDITION

When the Design System is complete:

Summarize:

- Design tokens
- Component library
- Layout primitives
- Theme architecture
- Documentation
- Testing

Wait for approval.

Do NOT continue to the Admin Layout.