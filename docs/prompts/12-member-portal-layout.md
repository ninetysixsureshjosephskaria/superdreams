# Super Dreams Platform
## Phase 12 — Member Portal Layout

---

# ROLE

You are the Lead Frontend Architect responsible for building the Member Portal application shell.

This phase creates the reusable layout and navigation framework for members.

Do NOT implement business modules.

Do NOT implement Wallet, Rewards, Campaigns, Notifications, or Profile features.

Only create the Member Portal layout and navigation.

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
- Admin Layout (for consistency)

---

# OBJECTIVE

Build the complete Member Portal shell.

Every future member feature must plug into this layout without modification.

Maintain visual consistency with the Admin application while optimizing the experience for end users.

---

# APPLICATION STRUCTURE

Refine:

apps/member/

Create or organize:

src/
├── app/
├── layouts/
├── navigation/
├── pages/
├── providers/
├── guards/
├── components/
│   ├── header/
│   ├── footer/
│   ├── sidebar/
│   ├── mobile-nav/
│   ├── profile-menu/
│   ├── notifications/
│   ├── page-header/
│   └── breadcrumbs/
├── routes/
├── hooks/
├── utils/
└── styles/

---

# APP SHELL

Build:

- Responsive Header
- Optional Sidebar
- Bottom Navigation (mobile)
- Footer
- Content Container
- Page Header
- Profile Menu
- Notification Placeholder

Use only components from the Design System.

---

# NAVIGATION

Prepare placeholder navigation for:

- Dashboard
- My Profile
- Wallet
- Rewards
- Campaigns
- Notifications
- Support

No business functionality yet.

Navigation visibility should support RBAC if member roles expand in the future.

---

# HEADER

Include:

- Logo
- Breadcrumbs
- Notification icon
- Theme switcher
- Profile menu
- Logout action

---

# ROUTING

Configure protected routes using the Authentication and RBAC modules.

Create placeholder pages for:

- Dashboard
- Wallet
- Rewards
- Campaigns
- Notifications
- Profile
- Support

No business logic.

---

# DASHBOARD

Create a generic dashboard page including:

- Welcome message
- Summary card placeholders
- Recent activity placeholder
- Quick links placeholder

No live data.

---

# ERROR HANDLING

Create:

- 401
- 403
- 404
- 500

Consistent with the Design System.

---

# LOADING

Create reusable:

- Page loader
- Route loader
- Skeleton placeholders
- Suspense fallback

---

# RESPONSIVENESS

Support:

- Desktop
- Tablet
- Mobile

Navigation should adapt automatically.

Provide excellent mobile usability.

---

# ACCESSIBILITY

Ensure:

- Keyboard navigation
- Proper focus handling
- ARIA labels
- Screen reader compatibility

---

# STATE

Use existing state management.

Store:

- Navigation state
- Theme preference
- Current user
- Mobile menu state

Reuse authentication state.

---

# DOCUMENTATION

Create README.md covering:

- Layout architecture
- Navigation
- Responsive behavior
- Route protection
- Extension guide

---

# TESTING

Create:

- Layout tests
- Navigation tests
- Route guard tests
- Responsive layout tests

---

# QUALITY CHECKLIST

Verify:

- Protected routes work
- Navigation works
- Theme switching works
- Mobile layout works
- Placeholder pages render correctly
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

When the Member Portal Layout is complete:

Summarize:

- Folder structure
- Navigation architecture
- Layout components
- Responsive strategy
- Extension points

Wait for approval.

Do NOT continue to Member Management.