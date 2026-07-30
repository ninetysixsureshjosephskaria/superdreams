# Super Dreams Platform
## Phase 13 — Member Management

---

# ROLE

You are the Lead Product Engineer responsible for implementing the complete Member Management module for the Super Dreams Platform.

This is the first business module of the platform.

The implementation must integrate seamlessly with:

- Core Identity
- Authentication
- RBAC
- Database Foundation
- Design System
- Admin Layout
- Member Portal Layout

Do NOT recreate any existing infrastructure.

Reuse all shared packages and platform services.

---

# REQUIRED READING

Read before making changes:

- docs/README.md
- docs/product/PRODUCT_OVERVIEW.md
- docs/dna/03-backend.md
- docs/dna/04-frontend.md
- docs/dna/10-claude-rules.md

Review existing modules:

- Identity
- Authentication
- RBAC
- Shared UI
- Shared Validation
- API Client

---

# OBJECTIVE

Implement the complete Member Management module for both:

- Admin (BCC)
- Member Portal

The module must support the full member lifecycle.

---

# DATABASE

Create migrations and Drizzle schema only for member-specific data.

Create tables such as:

members

member_profiles

member_addresses

member_contacts

member_documents

member_notes

member_status_history

member_activity_logs

Reuse existing users table by linking members to identity where appropriate.

Do not duplicate user authentication data.

Follow platform naming conventions.

---

# BACKEND MODULE

Create:

backend/api/src/modules/members/

```text
members/
├── controllers/
├── services/
├── repositories/
├── dto/
├── validators/
├── routes/
├── events/
├── mappers/
├── policies/
├── tests/
└── README.md
```

---

# FEATURES

Implement:

- Create Member
- Update Member
- View Member
- Search Members
- Filter Members
- Suspend Member
- Reactivate Member
- Archive Member (soft delete)
- Member notes
- Member documents metadata
- Activity history
- Member status history

---

# SEARCH & FILTERING

Support:

- Name
- Member ID
- Email
- Phone
- Status
- Date Joined
- Custom filters

Pagination, sorting, and filtering must use the shared utilities.

---

# ADMIN UI (BCC)

Create pages:

Members List

Member Details

Create Member

Edit Member

Activity Timeline

Documents (metadata only)

Notes

Status History

Use reusable components from the Design System.

---

# MEMBER PORTAL

Create pages:

My Profile

Edit Profile

Contact Information

Addresses

Uploaded Documents (metadata only)

Activity History

Members may only access their own data.

Enforce RBAC and ownership policies.

---

# API ENDPOINTS

Create endpoints for:

GET /members

GET /members/:id

POST /members

PUT /members/:id

PATCH /members/:id/status

DELETE /members/:id

GET /members/:id/activity

GET /members/:id/notes

POST /members/:id/notes

GET /members/:id/documents

POST /members/:id/documents

Document with OpenAPI.

---

# EVENTS

Create domain events:

MemberCreated

MemberUpdated

MemberSuspended

MemberReactivated

MemberArchived

MemberNoteAdded

MemberDocumentAdded

---

# VALIDATION

Validate:

- Names
- Email
- Phone
- Address
- Status transitions
- Notes
- Document metadata

Reuse shared validation schemas where possible.

---

# AUDIT

Every create, update, status change, note, and document action must be audited using the existing audit infrastructure.

---

# TESTING

Create:

- Repository tests
- Service tests
- Controller tests
- Policy tests
- Validation tests

---

# DOCUMENTATION

Create README.md including:

- Module overview
- Data model
- API reference
- Admin workflow
- Member workflow
- Extension points

---

# QUALITY CHECKLIST

Verify:

- CRUD operations work
- Search/filter works
- Pagination works
- RBAC enforced
- Ownership enforced
- Audit logging works
- OpenAPI updated
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

Do not generate everything in one response.

---

# STOP CONDITION

When Member Management is complete:

Summarize:

- Database schema
- Backend module
- Admin pages
- Member Portal pages
- API endpoints
- Events
- Audit integration
- Documentation

Wait for approval.

Do NOT continue to Wallet.