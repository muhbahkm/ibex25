# IBEX Architecture

## Overview

IBEX follows a **backend-first, cloud-native architecture** designed for simplicity and maintainability.

## Architecture Principles

### 1. Backend-First Design

**All business logic MUST live in the backend.**

- Frontend never talks directly to the database
- Frontend is a presentation layer only
- All validations, calculations, and business rules are enforced server-side
- This ensures data integrity and security

### 2. Monolithic Backend

- Single backend API (monolith)
- All business logic in one codebase
- Easier to maintain and deploy
- Can be split into microservices later if needed

### 3. Database Layer

- **Database**: PostgreSQL
- **ORM**: Prisma
- All database access goes through Prisma
- No raw SQL queries in application code

### 4. Technology Stack

- **Language**: TypeScript only
- **Backend Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **API**: REST (no GraphQL in MVP)

## Project Structure

```
ibex25/
├── apps/
│   └── backend/          # NestJS backend API
│       ├── prisma/       # Prisma schema and migrations
│       └── src/          # Application source code
├── docs/                 # Documentation
└── README.md
```

## Data Flow

```
Frontend → REST API → NestJS Controllers → Services → Prisma → PostgreSQL
```

1. Frontend makes HTTP requests to REST endpoints
2. NestJS controllers receive requests
3. Controllers delegate to services
4. Services contain business logic and use Prisma to access database
5. Prisma handles all database operations
6. Results flow back through the same chain

## Domain Models

### Core Entities

- **Store**: Represents a retail business
- **User**: Internal operators who create invoices
- **Customer**: Can be registered or guest
- **Product**: Items sold with price and stock
- **Invoice**: Sales transaction (PAID, UNPAID, or CANCELLED)
- **InvoiceItem**: Line items in an invoice

### Key Design Decisions

1. **Invoice Immutability**: Invoices are append-only. Once created, they cannot be modified.
2. **Stock Deduction**: Stock is reduced automatically when an invoice is created (not when paid).
3. **Credit = Unpaid Invoices**: UNPAID invoices represent credit. No separate credit ledger.
4. **Total Calculation**: Invoice totals are calculated in backend logic, not stored manually.

## Why NOT an Accounting System?

IBEX deliberately avoids accounting complexity:

1. **No Double-Entry**: Single-entry is sufficient for sales tracking
2. **No Ledger**: We track invoices, not accounting entries
3. **No Chart of Accounts**: Not needed for sales-only operations
4. **No Tax Calculations**: Can be added later if needed, but not in MVP

This keeps the system simple and focused on its core purpose: managing sales.

## Security

- No secrets in code (use `.env` files)
- Environment variables for all sensitive data
- Database credentials in `.env` only
- Authentication will be added in future steps (not in STEP 1)

## Development Workflow

1. Local development with local PostgreSQL
2. Prisma migrations for schema changes
3. TypeScript for type safety
4. NestJS for structured backend code

## Deployment

- Cloud-first design (ready for cloud deployment)
- Local development environment
- Environment-based configuration
- No hardcoded values

## Future Considerations

- Authentication and authorization
- Frontend application
- API versioning
- Rate limiting
- Caching strategies
- Background jobs for async operations

