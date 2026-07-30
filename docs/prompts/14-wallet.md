# Super Dreams Platform
## Phase 14 — Wallet Management

---

# ROLE

You are the Lead FinTech Backend & Full-Stack Engineer for the Super Dreams Platform.

Your responsibility is to build the complete Wallet module.

This module manages member balances, transactions, statements, and financial integrity.

Reuse all existing platform foundations.

Do NOT recreate Identity, Authentication, RBAC, or Member Management.

---

# REQUIRED READING

Read before making changes:

- docs/README.md
- docs/product/PRODUCT_OVERVIEW.md
- docs/dna/03-backend.md
- docs/dna/04-frontend.md
- docs/dna/10-claude-rules.md

Review:

- Database Foundation
- Identity
- Authentication
- RBAC
- Member Management
- Shared Packages

---

# OBJECTIVE

Implement a secure wallet system supporting member balances, transactions, adjustments, and statements.

Every financial operation must be auditable and consistent.

---

# DATABASE

Create migrations and Drizzle schema for:

wallets

wallet_balances

wallet_transactions

wallet_transaction_types

wallet_adjustments

wallet_holds

wallet_statements

wallet_limits

Link wallets to members.

Do not duplicate member information.

Follow platform naming conventions.

---

# BACKEND MODULE

Create:

backend/api/src/modules/wallet/

wallet/
├── controllers/
├── services/
├── repositories/
├── dto/
├── validators/
├── routes/
├── events/
├── policies/
├── mappers/
├── tests/
└── README.md

---

# CORE FEATURES

Implement:

- Create Wallet
- Activate Wallet
- Suspend Wallet
- Close Wallet
- Get Wallet Balance
- Wallet Statement
- Wallet Transaction History
- Manual Adjustment (Admin)
- Wallet Hold / Release
- Daily Balance Validation

---

# TRANSACTIONS

Support:

- Credit
- Debit
- Adjustment
- Hold
- Release
- Reversal (where applicable)

Every transaction must have:

- Unique reference
- Type
- Amount
- Currency
- Status
- Created By
- Audit trail

---

# BALANCE RULES

Maintain:

- Available Balance
- Held Balance
- Total Balance

Prevent negative balances unless explicitly allowed by business rules.

Use database transactions to guarantee consistency.

---

# ADMIN UI (BCC)

Create pages:

Wallet List

Wallet Details

Transaction History

Adjust Balance

Wallet Holds

Statements

Wallet Status

Use Design System components only.

---

# MEMBER PORTAL

Create pages:

My Wallet

Current Balance

Transaction History

Statements

Hold Information

Members may only access their own wallet.

---

# SEARCH & FILTERING

Support:

- Member
- Wallet ID
- Transaction Reference
- Date Range
- Transaction Type
- Status
- Amount Range

Use shared pagination and filtering.

---

# API ENDPOINTS

Create endpoints:

GET /wallets

GET /wallets/:id

GET /wallets/:id/balance

GET /wallets/:id/transactions

POST /wallets

PATCH /wallets/:id/status

POST /wallets/:id/adjustments

POST /wallets/:id/holds

DELETE /wallets/:id/holds/:holdId

GET /wallets/:id/statements

Document with OpenAPI.

---

# EVENTS

Create events:

WalletCreated

WalletActivated

WalletSuspended

WalletClosed

WalletCredited

WalletDebited

WalletAdjusted

WalletHoldPlaced

WalletHoldReleased

StatementGenerated

---

# VALIDATION

Validate:

- Amounts
- Currency
- Balance rules
- Transaction references
- Wallet status
- Hold requests

Reuse shared validation.

---

# AUDIT

Audit every financial operation using the existing audit framework.

No balance-changing action may occur without an audit record.

---

# TESTING

Create:

- Repository tests
- Service tests
- Transaction tests
- Balance consistency tests
- Controller tests
- Validation tests

Include tests for concurrent balance updates.

---

# DOCUMENTATION

Create README.md including:

- Module overview
- Wallet lifecycle
- Transaction lifecycle
- Balance calculation
- Statement generation
- Audit integration
- Extension points

---

# QUALITY CHECKLIST

Verify:

- Balance calculations are correct
- Database transactions are atomic
- Concurrency is handled safely
- Statements generate correctly
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

When Wallet Management is complete:

Summarize:

- Database schema
- Backend module
- Admin pages
- Member pages
- Balance model
- Transaction model
- Events
- Audit integration
- Documentation

Wait for approval.

Do NOT continue to Rewards.