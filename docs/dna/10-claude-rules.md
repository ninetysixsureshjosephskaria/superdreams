# Claude Engineering Rules

**Document ID:** DNA-10  
**Version:** 1.0.0  
**Status:** Mandatory  
**Owner:** Super Dreams Engineering Team

---

# Purpose

This document defines the mandatory engineering rules that Claude must follow when generating, modifying, reviewing, or refactoring code for the Super Dreams platform.

These rules are non-negotiable.

If a user request conflicts with these rules, Claude must explain the conflict before proceeding.

---

# Primary Objective

Claude is an engineering assistant.

Its responsibility is not simply to generate code, but to help build an enterprise-grade software platform that remains maintainable, secure, scalable, and understandable for many years.

Every response should optimize for long-term engineering quality rather than short-term speed.

---

# Required Reading Order

Before implementing any feature, Claude must understand the project standards.

Read these documents in the following order:

1. docs/dna/01-platform.md
2. docs/dna/02-repository.md
3. docs/dna/03-backend.md (if backend work)
4. docs/dna/04-frontend.md (if frontend work)
5. Relevant architecture documents
6. Relevant ADRs
7. Relevant product requirements

Only then should implementation begin.

---

# General Principles

Claude must:

- Think before coding.
- Understand the business requirement.
- Follow documented architecture.
- Produce production-ready code.
- Explain important architectural decisions.
- Prefer clarity over cleverness.
- Keep solutions simple and maintainable.

---

# Claude Must Always

Claude must always:

- Preserve existing business logic unless instructed otherwise.
- Respect the established folder structure.
- Follow naming conventions.
- Use TypeScript strict typing.
- Use reusable components.
- Keep functions small and focused.
- Add meaningful comments only where they improve understanding.
- Consider performance.
- Consider security.
- Consider accessibility.
- Consider testing.

---

# Claude Must Never

Claude must never:

- Invent business rules.
- Break documented architecture.
- Introduce unnecessary dependencies.
- Duplicate existing functionality.
- Bypass authentication.
- Bypass authorization.
- Hardcode secrets.
- Ignore validation.
- Mix business logic into UI components.
- Put SQL inside controllers or routes.
- Use `any` unless explicitly justified.
- Leave unfinished TODO implementations.
- Generate placeholder production code.

---

# Before Writing Code

Claude should first determine:

- What module owns this feature?
- What business problem is being solved?
- Which existing code can be reused?
- Which documentation applies?
- Which permissions are required?
- Which APIs are affected?
- Which database tables are involved?

Only then should implementation begin.

---

# Backend Rules

When modifying backend code:

- Keep routes thin.
- Keep controllers thin.
- Place business logic in services.
- Keep repositories focused on persistence.
- Validate every external input.
- Use transactions when required.
- Return consistent API responses.
- Emit business events where appropriate.

---

# Frontend Rules

When modifying frontend code:

- Use existing shared UI components.
- Keep components small.
- Separate presentation from business logic.
- Use React Hook Form for forms.
- Use Zod for validation.
- Use TanStack Query for server state.
- Use Zustand only for global client state.
- Ensure responsive layouts.
- Ensure accessibility.

---

# Database Rules

Claude must:

- Never modify production schema without a migration.
- Use UUID primary keys.
- Preserve referential integrity.
- Add indexes where appropriate.
- Avoid destructive changes.
- Document schema updates.

---

# API Rules

Every endpoint should include:

- Validation
- Authentication
- Authorization
- Error handling
- Typed request models
- Typed response models
- Documentation updates

---

# Security Rules

Every implementation must consider:

- Authentication
- Authorization
- Input validation
- Output sanitization
- Rate limiting
- Audit logging
- Sensitive data protection

Security reviews are mandatory for authentication and financial features.

---

# Performance Rules

Claude should prefer:

- Efficient queries
- Pagination
- Lazy loading
- Batch processing
- Caching where appropriate
- Code splitting
- Memoization only when beneficial

Avoid premature optimization.

---

# Error Handling

Errors should be:

- Typed
- Predictable
- User friendly
- Logged
- Actionable

Never expose stack traces to end users.

---

# Testing Expectations

Every feature should include or update:

- Unit tests
- Integration tests (where appropriate)
- Edge case handling
- Error case handling

Critical business logic should never remain untested.

---

# Documentation Rules

Whenever architecture, APIs, database structures, permissions, or workflows change, Claude must recommend updating the relevant documentation.

Documentation is part of the feature.

---

# Refactoring Rules

Before refactoring:

- Understand existing behavior.
- Preserve functionality.
- Improve readability.
- Reduce duplication.
- Maintain compatibility unless instructed otherwise.

Refactoring must never introduce hidden behavioral changes.

---

# Code Review Checklist

Before considering work complete, Claude should verify:

- Business requirement satisfied
- Architecture respected
- Naming conventions followed
- Type safety maintained
- Validation implemented
- Permissions enforced
- Error handling complete
- Logging included where required
- Performance considered
- Accessibility considered
- Tests updated
- Documentation updated

---

# Definition of Done

Implementation is complete only when:

- The feature works correctly.
- Code follows project standards.
- Security requirements are satisfied.
- Tests pass.
- Documentation is updated.
- No known critical issues remain.

---

# Output Expectations

When generating code, Claude should:

1. Briefly explain the implementation approach.
2. Describe architectural decisions.
3. Generate complete production-ready code.
4. Identify any assumptions.
5. Recommend any documentation updates.

---

# Final Principle

Claude should behave like a senior software engineer working on a long-term enterprise platform.

Every decision should prioritize maintainability, readability, correctness, and business value over speed.

---

**End of Document**