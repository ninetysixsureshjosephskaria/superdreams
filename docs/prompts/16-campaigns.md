# Super Dreams Platform
## Phase 16 — Campaign Management

---

# ROLE

You are the Lead Product Engineer responsible for implementing the Campaign Management module.

This module manages marketing, engagement, and reward campaigns across the Super Dreams Platform.

Reuse all existing infrastructure and business modules.

Do NOT recreate Rewards, Wallet, Member Management, Authentication, or RBAC.

---

# REQUIRED READING

Read before making changes:

- docs/README.md
- docs/product/PRODUCT_OVERVIEW.md
- docs/dna/03-backend.md
- docs/dna/04-frontend.md
- docs/dna/10-claude-rules.md

Review:

- Rewards Module
- Wallet Module
- Member Module
- Shared Packages
- Admin Layout
- Member Portal Layout

---

# OBJECTIVE

Implement a flexible Campaign Management system capable of supporting promotional campaigns, reward campaigns, referral campaigns, seasonal campaigns, and future campaign types without architectural changes.

---

# DATABASE

Create migrations and Drizzle schema for:

campaigns

campaign_types

campaign_rules

campaign_segments

campaign_targets

campaign_rewards

campaign_schedules

campaign_executions

campaign_member_status

campaign_history

Link campaigns to reward programs where applicable.

Follow platform naming conventions.

---

# BACKEND MODULE

Create:

backend/api/src/modules/campaigns/

campaigns/
├── controllers/
├── services/
├── repositories/
├── dto/
├── validators/
├── routes/
├── events/
├── schedulers/
├── policies/
├── mappers/
├── tests/
└── README.md

---

# CORE FEATURES

Implement:

- Create Campaign
- Update Campaign
- Activate / Pause / Complete Campaign
- Schedule Campaign
- Assign Reward Program
- Define Target Audience
- Campaign Execution
- Campaign History
- Campaign Analytics placeholders

---

# TARGETING

Support targeting by:

- Member
- Member Segment
- Member Status
- Reward Eligibility
- Join Date
- Manual Selection
- Future extensibility

---

# SCHEDULING

Support:

- Immediate
- Scheduled Start
- Scheduled End
- Recurring Campaign hooks

Integrate with the existing job/scheduler infrastructure.

---

# REWARD INTEGRATION

Allow campaigns to:

- Allocate rewards
- Trigger reward rules
- Associate existing reward programs
- Trigger wallet adjustments where approved

Reuse existing Rewards and Wallet services.

---

# ADMIN UI (BCC)

Create pages:

Campaign List

Campaign Details

Create Campaign

Edit Campaign

Campaign Scheduling

Target Audience

Campaign History

Campaign Analytics (placeholder)

---

# MEMBER PORTAL

Create pages:

Available Campaigns

Campaign Details

My Campaign Participation

Campaign History

Members must only access campaigns intended for them.

---

# SEARCH & FILTERING

Support:

- Campaign Name
- Campaign Type
- Status
- Date Range
- Reward Program
- Target Segment

Use shared pagination and filtering.

---

# API ENDPOINTS

Create endpoints:

GET /campaigns

GET /campaigns/:id

POST /campaigns

PUT /campaigns/:id

PATCH /campaigns/:id/status

POST /campaigns/:id/schedule

POST /campaigns/:id/execute

GET /campaigns/:id/history

GET /campaigns/member/:memberId

Update OpenAPI documentation.

---

# EVENTS

Create events:

CampaignCreated

CampaignUpdated

CampaignActivated

CampaignPaused

CampaignCompleted

CampaignScheduled

CampaignExecuted

CampaignRewardIssued

---

# VALIDATION

Validate:

- Campaign dates
- Schedule rules
- Target audience
- Reward associations
- Status transitions

Reuse shared validation where possible.

---

# AUDIT

Audit every campaign lifecycle event using the existing audit infrastructure.

---

# TESTING

Create:

- Repository tests
- Service tests
- Campaign execution tests
- Scheduling tests
- Controller tests
- Validation tests

Include tests for scheduling and execution edge cases.

---

# DOCUMENTATION

Create README.md including:

- Module overview
- Campaign lifecycle
- Scheduling architecture
- Reward integration
- Targeting strategy
- Extension points

---

# QUALITY CHECKLIST

Verify:

- Campaign CRUD works
- Scheduling works
- Reward integration works
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

Do not generate everything in one response.

---

# STOP CONDITION

When Campaign Management is complete:

Summarize:

- Database schema
- Backend module
- Admin pages
- Member pages
- Scheduling model
- Reward integration
- Events
- Audit integration
- Documentation

Wait for approval.

Do NOT continue to Notifications.