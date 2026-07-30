# Super Dreams Platform
## Phase 17 — Notification Center

---

# ROLE

You are the Lead Platform Engineer responsible for implementing the Notification Center for the Super Dreams Platform.

This module provides a centralized notification system for all platform modules.

Reuse existing infrastructure and business modules.

Do NOT recreate Authentication, RBAC, Member Management, Wallet, Rewards, or Campaigns.

---

# REQUIRED READING

Read before making changes:

- docs/README.md
- docs/product/PRODUCT_OVERVIEW.md
- docs/dna/03-backend.md
- docs/dna/04-frontend.md
- docs/dna/10-claude-rules.md

Review:

- Member Management
- Rewards
- Campaigns
- Shared Packages
- Admin Layout
- Member Portal Layout

---

# OBJECTIVE

Implement a centralized Notification Center supporting multiple delivery channels and reusable templates.

The architecture must allow future channels to be added without modifying existing code.

---

# DATABASE

Create migrations and Drizzle schema for:

notification_templates

notification_channels

notification_preferences

notification_queue

notifications

notification_deliveries

notification_logs

notification_events

notification_subscriptions

notification_groups

Follow platform naming conventions.

---

# BACKEND MODULE

Create:

backend/api/src/modules/notifications/

notifications/
├── controllers/
├── services/
├── repositories/
├── dto/
├── validators/
├── routes/
├── events/
├── queue/
├── providers/
├── templates/
├── schedulers/
├── policies/
├── mappers/
├── tests/
└── README.md

---

# DELIVERY CHANNELS

Support a provider-based architecture for:

- In-App
- Email
- SMS (provider abstraction)
- Push Notifications (provider abstraction)

Implement interfaces so providers can be swapped without changing business logic.

Actual SMS/Push providers may use mock implementations initially if credentials are unavailable.

---

# TEMPLATE SYSTEM

Support reusable templates with:

- Variables
- Localization readiness
- Preview support
- Versioning
- Active / Inactive status

---

# CORE FEATURES

Implement:

- Create Template
- Update Template
- Send Notification
- Schedule Notification
- Retry Failed Delivery
- Cancel Pending Notification
- Notification Preferences
- Mark Read / Unread
- Archive Notification

---

# EVENT INTEGRATION

Allow modules to publish notification events.

Integrate with:

- Member Management
- Wallet
- Rewards
- Campaigns
- Authentication

Do not tightly couple modules.

---

# QUEUE

Reuse existing job infrastructure.

Support:

- Queue
- Retry
- Dead Letter handling
- Processing status
- Delivery history

---

# ADMIN UI (BCC)

Create pages:

Notification Dashboard

Templates

Queue

Delivery Logs

Preferences

Channel Configuration

Notification Analytics (placeholder)

---

# MEMBER PORTAL

Create pages:

My Notifications

Notification Preferences

Notification History

Mark Read

Archive

---

# SEARCH & FILTERING

Support:

- Member
- Channel
- Status
- Date Range
- Template
- Delivery Result

Use shared pagination.

---

# API ENDPOINTS

Create endpoints:

GET /notifications

GET /notifications/:id

POST /notifications

POST /notifications/send

POST /notifications/schedule

PATCH /notifications/:id/read

PATCH /notifications/:id/archive

GET /notifications/preferences

PUT /notifications/preferences

GET /notification-templates

POST /notification-templates

PUT /notification-templates/:id

Update OpenAPI documentation.

---

# EVENTS

Create events:

NotificationCreated

NotificationQueued

NotificationSent

NotificationDelivered

NotificationFailed

NotificationRead

NotificationArchived

PreferenceUpdated

---

# VALIDATION

Validate:

- Template variables
- Channel selection
- Recipient selection
- Scheduling
- Preferences

Reuse shared validation.

---

# AUDIT

Audit:

- Template changes
- Preference updates
- Manual sends
- Queue actions
- Delivery retries

---

# TESTING

Create:

- Repository tests
- Service tests
- Queue tests
- Provider tests
- Controller tests
- Validation tests

Mock external providers where appropriate.

---

# DOCUMENTATION

Create README.md including:

- Module overview
- Notification lifecycle
- Queue architecture
- Provider architecture
- Template system
- Event integration
- Extension guide

---

# QUALITY CHECKLIST

Verify:

- Notifications queue correctly
- Delivery pipeline works
- Templates render correctly
- Preferences enforced
- RBAC enforced
- Audit logging works
- OpenAPI updated
- Tests pass
- Typecheck passes
- Lint passes
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

When the Notification Center is complete:

Summarize:

- Database schema
- Backend module
- Admin pages
- Member pages
- Queue architecture
- Provider architecture
- Template system
- Events
- Audit integration
- Documentation

Wait for approval.

Do NOT continue to Reports.