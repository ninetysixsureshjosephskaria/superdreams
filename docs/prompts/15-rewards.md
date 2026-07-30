# Super Dreams Platform
## Phase 15 — Rewards Management

---

# ROLE

You are the Lead Product Engineer responsible for implementing the complete Rewards module.

The Rewards module is the heart of the Super Dreams platform.

It manages reward definitions, eligibility, accrual, redemption, expiration, adjustments, and member reward history.

Reuse all existing infrastructure and modules.

Do NOT recreate Wallet, Member Management, Authentication, or RBAC.

---

# REQUIRED READING

Read before making changes:

- docs/README.md
- docs/product/PRODUCT_OVERVIEW.md
- docs/dna/03-backend.md
- docs/dna/04-frontend.md
- docs/dna/10-claude-rules.md

Review:

- Wallet Module
- Member Module
- Identity
- Authentication
- RBAC
- Shared Packages

---

# OBJECTIVE

Implement a complete, configurable Rewards engine.

The module must support future reward programs without architectural changes.

---

# DATABASE

Create migrations and Drizzle schema for:

reward_programs

reward_rules

reward_types

reward_categories

member_rewards

reward_transactions

reward_redemptions

reward_adjustments

reward_expiry_rules

reward_history

Link rewards to members and wallets where applicable.

Follow platform naming conventions.

---

# BACKEND MODULE

Create:

backend/api/src/modules/rewards/

rewards/
├── controllers/
├── services/
├── repositories/
├── dto/
├── validators/
├── routes/
├── events/
├── policies/
├── mappers/
├── schedulers/
├── tests/
└── README.md

---

# CORE FEATURES

Implement:

- Create Reward Program
- Update Reward Program
- Activate / Deactivate Program
- Reward Accrual
- Manual Reward Allocation
- Reward Adjustment
- Reward Redemption
- Reward Expiration
- Reward Reversal
- Member Reward Balance
- Reward Transaction History

---

# REWARD ENGINE

Support configurable rules for:

- Fixed rewards
- Percentage rewards
- Tier-based rewards
- Event-triggered rewards
- Manual rewards
- Promotional rewards

Rules should be extensible for future campaigns.

---

# REDEMPTION

Support:

- Full redemption
- Partial redemption
- Validation of available balance
- Reversal of redemption
- Wallet integration where required

---

# EXPIRATION

Implement configurable expiry policies.

Support:

- Fixed expiry date
- Rolling expiry
- Never expires

Create scheduled processing hooks using the existing job infrastructure.

---

# ADMIN UI (BCC)

Create pages:

Reward Programs

Reward Rules

Reward Transactions

Member Rewards

Reward Adjustments

Reward Redemptions

Reward Analytics (placeholder)

---

# MEMBER PORTAL

Create pages:

My Rewards

Reward Balance

Reward History

Redeem Rewards

Reward Program Details

No member may access another member's rewards.

---

# SEARCH & FILTERING

Support:

- Member
- Reward Program
- Reward Type
- Status
- Date Range
- Expiry Status
- Redemption Status

Use shared pagination and filtering.

---

# API ENDPOINTS

Create endpoints:

GET /rewards/programs

POST /rewards/programs

PUT /rewards/programs/:id

PATCH /rewards/programs/:id/status

GET /rewards/members/:memberId

GET /rewards/members/:memberId/history

POST /rewards/members/:memberId/allocate

POST /rewards/members/:memberId/redeem

POST /rewards/members/:memberId/adjust

GET /rewards/transactions

Update OpenAPI documentation.

---

# EVENTS

Create events:

RewardProgramCreated

RewardAllocated

RewardAdjusted

RewardRedeemed

RewardExpired

RewardReversed

RewardProgramActivated

RewardProgramDeactivated

---

# VALIDATION

Validate:

- Reward values
- Program dates
- Redemption requests
- Expiry rules
- Adjustment amounts
- Reward availability

Reuse shared validation.

---

# AUDIT

Audit every reward-related operation using the existing audit infrastructure.

---

# TESTING

Create:

- Repository tests
- Service tests
- Reward engine tests
- Redemption tests
- Expiry tests
- Controller tests
- Validation tests

Include edge cases for concurrent allocations and redemptions.

---

# DOCUMENTATION

Create README.md including:

- Module overview
- Reward lifecycle
- Reward engine architecture
- Program management
- Redemption flow
- Expiry processing
- Wallet integration
- Extension points

---

# QUALITY CHECKLIST

Verify:

- Reward calculations are correct
- Redemptions enforce balance rules
- Expiry processing works
- Wallet integration works
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

When Rewards Management is complete:

Summarize:

- Database schema
- Backend module
- Admin pages
- Member pages
- Reward engine
- Redemption flow
- Events
- Audit integration
- Documentation

Wait for approval.

Do NOT continue to Campaigns.