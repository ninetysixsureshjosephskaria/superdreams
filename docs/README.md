# Super Dreams Documentation

**Version:** 1.0.0  
**Status:** Active  
**Owner:** Super Dreams Engineering Team

---

# Overview

Welcome to the official documentation for the **Super Dreams Platform**.

This repository contains the technical, architectural, operational, and product documentation required to design, develop, deploy, and maintain the platform.

All developers, designers, QA engineers, DevOps engineers, product managers, and AI assistants (Claude) must treat this documentation as the **single source of truth**.

If any implementation conflicts with these documents, the documentation takes precedence.

---

# Documentation Philosophy

The documentation is designed to answer four questions:

1. **What are we building?**
2. **Why are we building it this way?**
3. **How should it be implemented?**
4. **How should it be maintained?**

Every architectural decision must be documented.

Every major change must update the documentation.

Documentation is considered part of the product.

---

# Repository Structure

```
docs/

README.md

dna/
architecture/
adr/
api/
database/
deployment/
operations/
product/
prompts/
```

---

# Documentation Sections

## DNA

Contains the permanent engineering standards of the project.

These documents define:

- Engineering principles
- Repository standards
- Backend standards
- Frontend standards
- Database standards
- API standards
- Security standards
- Testing standards
- DevOps standards
- Claude implementation rules
- Product decisions

Every Claude implementation prompt must reference these documents.

---

## Architecture

Contains the complete enterprise architecture.

Examples:

- Business Architecture
- Domain Driven Design
- Database Architecture
- API Architecture
- Security Architecture
- Infrastructure
- Frontend
- Backend

These documents describe **why** the platform is designed the way it is.

---

## ADR (Architecture Decision Records)

Stores all permanent architecture decisions.

Example:

```
ADR-001 Modular Monolith

ADR-002 PostgreSQL

ADR-003 Event Driven Architecture
```

Architecture decisions must never disappear inside chat history.

---

## API

Contains:

- OpenAPI Specification
- Authentication Flows
- API Standards
- Request Examples
- Response Examples

API documentation should be generated whenever possible.

---

## Database

Contains:

- ER Diagrams
- Schema Documentation
- Migration Guide
- Naming Standards
- Performance Notes

---

## Deployment

Contains:

- Docker
- Docker Compose
- VPS Deployment
- Nginx
- Environment Variables
- Backup Procedures

---

## Operations

Contains:

- Monitoring
- Logging
- Incident Response
- Disaster Recovery
- Maintenance Procedures
- Operational Runbooks

---

## Product

Contains:

- Business Requirements
- Product Specifications
- Functional Requirements
- Roadmaps
- Release Notes
- Future Features

---

## Prompts

Contains reusable implementation prompts for Claude.

Examples:

```
01-bootstrap.md

02-authentication.md

03-rbac.md

04-dashboard.md

05-wallet.md
```

Prompts become part of the project documentation.

They are version-controlled alongside the source code.

---

# Engineering Principles

The Super Dreams platform follows these principles:

- Business First
- Domain Driven Design
- Clean Architecture
- SOLID Principles
- DRY
- KISS
- Security by Default
- Performance by Design
- Testability
- Documentation First

---

# Version Control

Documentation evolves together with the source code.

Every pull request that changes architecture, APIs, database structures, security, or business rules must also update the relevant documentation.

Documentation must never become outdated.

---

# AI Development

Claude is considered a development assistant.

Before generating code, Claude must always read the relevant DNA documents.

Claude must never invent architecture.

Claude must never contradict documented engineering standards.

Claude must always explain significant architectural decisions.

---

# Definition of Done

A feature is not complete until:

- Code is implemented
- Tests pass
- Documentation is updated
- Security requirements are met
- Code review is completed
- Deployment considerations are documented

---

# Project Vision

The goal of Super Dreams is to become an enterprise-grade engagement and rewards platform capable of supporting multiple applications, multiple organizations, and future SaaS deployment while maintaining a clean, scalable, and maintainable architecture.

---

**End of Document**