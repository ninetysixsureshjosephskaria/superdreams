# Super Dreams Platform
## Phase 18 — Reports & Analytics

---

# ROLE

You are the Lead Data & Reporting Architect for the Super Dreams Platform.

Your responsibility is to build a centralized reporting and analytics module that consolidates data from all existing platform modules.

Reuse all existing modules.

Do NOT duplicate business logic.

Reports must consume existing services and repositories.

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
- Wallet
- Rewards
- Campaigns
- Notifications
- Audit
- Shared Packages

---

# OBJECTIVE

Implement a flexible reporting engine capable of generating operational, financial, and analytical reports.

The architecture must support adding new reports without modifying the reporting framework.

---

# DATABASE

Create migrations and Drizzle schema for:

reports

report_definitions

report_categories

report_exports

report_schedules

report_execution_history

dashboard_widgets

dashboard_layouts

saved_filters

favorite_reports

Do NOT duplicate operational data.

These tables store report metadata, execution history, and user preferences.

---

# BACKEND MODULE

Create:

backend/api/src/modules/reports/

reports/
├── controllers/
├── services/
├── repositories/
├── dto/
├── validators/
├── routes/
├── generators/
├── exporters/
├── schedulers/
├── widgets/
├── policies/
├── mappers/
├── tests/
└── README.md

---

# REPORT TYPES

Implement:

- Member Reports
- Wallet Reports
- Reward Reports
- Campaign Reports
- Notification Reports
- Audit Reports
- User Activity Reports

Each report should consume existing modules rather than querying duplicate structures.

---

# DASHBOARDS

Create configurable dashboards.

Support:

- KPI Cards
- Charts (data providers only)
- Tables
- Summary Widgets
- Recent Activity Widgets

Dashboard layout should be configurable per user.

---

# FILTERING

Support:

- Date Range
- Member
- Status
- Campaign
- Reward Program
- Wallet
- Notification Channel
- Custom filters

Support saved filters.

---

# EXPORTS

Support export generation for:

- CSV
- Excel (.xlsx)
- PDF

Reuse existing export utilities where available.

Large exports should execute through the existing job/queue infrastructure.

---

# SCHEDULING

Support:

- Run Now
- Scheduled Reports
- Daily
- Weekly
- Monthly
- Custom Cron expressions (validated)

Integrate with the existing scheduler.

---

# ADMIN UI (BCC)

Create pages:

Dashboard

Reports

Saved Reports

Scheduled Reports

Report History

Dashboard Customization

Export History

Analytics Overview

Use Design System components only.

---

# MEMBER PORTAL

Create pages:

My Reports (if permitted)

My Statements

Reward History Summary

Wallet Summary

Members must only access their own report data.

---

# SEARCH & FILTERING

Support:

- Report Name
- Category
- Created By
- Schedule
- Execution Status

Use shared pagination.

---

# API ENDPOINTS

Create endpoints:

GET /reports

GET /reports/:id

POST /reports/run

POST /reports/schedule

GET /reports/history

GET /reports/exports

POST /reports/exports

GET /dashboards

PUT /dashboards/layout

GET /reports/saved-filters

POST /reports/saved-filters

Update OpenAPI documentation.

---

# EVENTS

Create events:

ReportGenerated

ReportScheduled

ReportExported

DashboardUpdated

SavedFilterCreated

---

# VALIDATION

Validate:

- Filters
- Date ranges
- Schedule definitions
- Export formats
- Dashboard layouts

Reuse shared validation.

---

# AUDIT

Audit:

- Report execution
- Export generation
- Dashboard updates
- Schedule changes

---

# TESTING

Create:

- Repository tests
- Service tests
- Report generation tests
- Export tests
- Scheduler tests
- Controller tests
- Validation tests

Mock long-running jobs where appropriate.

---

# DOCUMENTATION

Create README.md including:

- Module overview
- Reporting architecture
- Dashboard architecture
- Export process
- Scheduling
- Extension guide

---

# QUALITY CHECKLIST

Verify:

- Reports generate correctly
- Filters work
- Dashboards load
- Exports succeed
- Scheduled reports execute
- RBAC enforced
- Ownership enforced
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

When Reports & Analytics is complete:

Summarize:

- Database schema
- Backend module
- Dashboard architecture
- Reporting engine
- Export system
- Scheduling
- Events
- Audit integration
- Documentation

Wait for approval.

Do NOT continue to Settings.