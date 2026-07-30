# Super Dreams Platform
## Phase 19 — Settings & Administration

---

# ROLE

You are the Principal Platform Engineer responsible for implementing the complete Settings & Administration module.

This module is the central configuration hub for the Super Dreams Platform.

Reuse all existing modules.

Do NOT duplicate business logic.

---

# REQUIRED READING

Read before making changes:

- docs/README.md
- docs/product/PRODUCT_OVERVIEW.md
- docs/dna/03-backend.md
- docs/dna/04-frontend.md
- docs/dna/10-claude-rules.md

Review every completed module before implementation.

---

# OBJECTIVE

Implement a centralized administration module for configuring the platform without code changes.

All configurable platform behavior should be manageable through this module where appropriate.

---

# DATABASE

Create migrations and Drizzle schema for:

system_settings

setting_categories

setting_history

branding_settings

localization_settings

email_settings

sms_settings

notification_settings

security_settings

api_settings

integration_settings

maintenance_windows

feature_toggles

backup_settings

audit_settings

Store configuration only.

Do NOT duplicate operational business data.

---

# BACKEND MODULE

Create:

backend/api/src/modules/settings/

settings/
├── controllers/
├── services/
├── repositories/
├── dto/
├── validators/
├── routes/
├── events/
├── providers/
├── policies/
├── mappers/
├── tests/
└── README.md

---

# SETTINGS CATEGORIES

Implement management for:

- General
- Branding
- Localization
- Authentication
- Security
- Notifications
- Email
- SMS
- Integrations
- API
- Backup
- Audit
- Maintenance
- Feature Toggles

Settings should be organized, versioned where appropriate, and validated.

---

# BRANDING

Support:

- Logo
- Favicon
- Primary Color
- Secondary Color
- Theme Options

Do not hardcode assets.

---

# LOCALIZATION

Support:

- Default Language
- Supported Languages
- Timezone
- Currency
- Date Format
- Number Format

Prepare for future internationalization.

---

# SECURITY SETTINGS

Manage configurable values such as:

- Password policy
- Session timeout
- Login attempt limits
- MFA flags
- Allowed origins (if applicable)
- Token lifetimes

Use the existing authentication framework.

---

# FEATURE TOGGLES

Implement a feature toggle system.

Support:

- Enable / Disable features
- Environment overrides
- User / Role targeting hooks
- Future rollout support

---

# MAINTENANCE MODE

Support:

- Enable / Disable maintenance mode
- Maintenance message
- Allowed admin bypass
- Scheduled maintenance windows

---

# BACKUPS

Provide configuration for:

- Backup schedule
- Retention policy
- Storage provider metadata

Do not implement backup engines here.

---

# ADMIN UI (BCC)

Create pages:

General Settings

Branding

Localization

Security

Notifications

Email

SMS

Integrations

API

Maintenance

Feature Toggles

Audit Settings

Backup Settings

Settings History

---

# MEMBER PORTAL

Expose only user-configurable preferences where appropriate, such as:

- Language
- Theme
- Notification preferences
- Timezone

Members must never access administrative settings.

---

# API ENDPOINTS

Create endpoints:

GET /settings

PUT /settings

GET /settings/categories

GET /settings/history

POST /settings/feature-toggles

PATCH /settings/feature-toggles/:id

POST /settings/maintenance

GET /settings/branding

PUT /settings/branding

Update OpenAPI documentation.

---

# EVENTS

Create events:

SettingUpdated

FeatureToggleChanged

MaintenanceModeEnabled

MaintenanceModeDisabled

BrandingUpdated

LocalizationUpdated

SecuritySettingChanged

---

# VALIDATION

Validate:

- Configuration values
- URLs
- Colors
- Localization settings
- Security policies
- Feature toggle definitions

Reuse shared validation.

---

# AUDIT

Audit every configuration change using the existing audit infrastructure.

Include previous and new values where practical.

---

# TESTING

Create:

- Repository tests
- Service tests
- Controller tests
- Validation tests
- Feature toggle tests

---

# DOCUMENTATION

Create README.md including:

- Module overview
- Configuration architecture
- Feature toggle strategy
- Maintenance mode
- Branding system
- Extension guide

---

# QUALITY CHECKLIST

Verify:

- Settings persist correctly
- Validation works
- Feature toggles work
- Maintenance mode works
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

When Settings & Administration is complete:

Summarize:

- Database schema
- Backend module
- Admin pages
- Member preferences
- Feature toggle system
- Configuration architecture
- Events
- Audit integration
- Documentation

Wait for approval.

Do NOT continue to Final Hardening.