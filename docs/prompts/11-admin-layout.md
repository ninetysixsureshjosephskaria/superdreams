# Super Dreams Platform
## Phase 11 — Admin Layout (BCC Portal)

---

# ROLE

You are the Lead Frontend Architect responsible for building the BCC Admin application's shell and layout.

This phase creates the application framework only.

Do NOT implement business modules.

Do NOT implement Member Management, Wallet, Rewards, Campaigns, Reports or Settings.

Only create the Admin application layout and navigation framework.

---

# REQUIRED READING

Read before making changes:

- docs/README.md
- docs/dna/04-frontend.md
- docs/dna/10-claude-rules.md
- docs/product/PRODUCT_OVERVIEW.md

Review:

- packages/ui
- packages/theme
- Authentication module
- RBAC module

---

# OBJECTIVE

Create the complete Admin application shell.

Every future admin module must plug into this layout without modification.

---

# APPLICATION STRUCTURE

Refine the existing:

apps/bcc/

Create or organize:

```text
src/
├── app/
├── layouts/
├── navigation/
├── pages/
├── providers/
├── guards/
├── components/
│   ├── sidebar/
│   ├── header/
│   ├── footer/
│   ├── breadcrumbs/
│   ├── page-header/
│   ├── user-menu/
│   ├── notifications/
│   └── search/
├── routes/
├── hooks/
├── utils/
└── styles/
```

---

# APP SHELL

Build:

- Responsive Sidebar
- Top Header
- Breadcrumbs
- Footer
- Content Container
- Page Header
- User Profile Menu
- Notification Placeholder
- Global Search Placeholder

Use the Design System components only.

---

# SIDEBAR

Support:

- Expand / Collapse
- Nested navigation
- Active route highlighting
- Icons
- Role-aware menu filtering (using RBAC)
- Responsive mobile drawer

No hardcoded business permissions.

---

# HEADER

Include:

- Logo
- Breadcrumbs
- Search trigger
- Notifications placeholder
- Theme switcher
- User profile menu
- Logout action

---

# ROUTING

Configure protected routing.

Integrate:

- Authentication
- RBAC guards

Create placeholder routes for:

- Dashboard
- Members
- Wallet
- Rewards
- Campaigns
- Notifications
- Reports
- Settings

Display placeholder pages only.

---

# DASHBOARD

Create a generic dashboard page containing:

- Welcome section
- Summary card placeholders
- Recent activity placeholder
- Quick actions placeholder

No real business data.

---

# ERROR HANDLING

Create:

- 401 page
- 403 page
- 404 page
- 500 page

Consistent with the Design System.

---

# LOADING

Create reusable:

- Page loader
- Route loader
- Suspense fallback
- Skeleton layouts

---

# RESPONSIVENESS

Support:

- Desktop
- Tablet
- Mobile

Sidebar should become a drawer on small screens.

---

# ACCESSIBILITY

Ensure:

- Keyboard navigation
- Focus management
- ARIA labels
- Skip navigation link
- Screen reader compatibility

---

# STATE

Use existing state management.

Store:

- Sidebar collapsed state
- Theme preference
- Current user
- Navigation state

Do not duplicate authentication state.

---

# DOCUMENTATION

Create README.md including:

- Layout architecture
- Navigation system
- Route protection
- Responsive behavior
- Extension guide

---

# TESTING

Create:

- Layout tests
- Navigation tests
- Guard integration tests
- Responsive behavior tests (where feasible)

---

# QUALITY CHECKLIST

Verify:

- Protected routes work
- Sidebar navigation works
- Theme switching works
- Mobile layout works
- Breadcrumbs update correctly
- Lint passes
- Typecheck passes
- Tests pass
- Build succeeds

---

# OUTPUT FORMAT

Implement in logical phases.

For each phase:

1. Explain the objective.
2. Generate files.
3. Explain architectural decisions.
4. Verify.
5. Continue.

---

# STOP CONDITION

When the Admin Layout is complete:

Summarize:

- Folder structure
- Navigation architecture
- Route protection
- Layout components
- Responsive strategy
- Extension points

Wait for approval.

Do NOT continue to the Member Portal Layout.