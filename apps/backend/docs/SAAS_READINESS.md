# SaaS Readiness - IBEX Backend

## Overview

This document explains IBEX's SaaS readiness foundations and tenant isolation model. Phase S1 establishes the architectural foundations for multi-tenant SaaS operation without changing existing business logic or API contracts.

---

## Tenant Isolation Model

### Store as Tenant

In IBEX, **a Tenant = a Store (storeId)**.

Every tenant is identified by a unique `storeId` (UUID). All data, operations, and resources are scoped to a `storeId`.

**Key Principle:**
- Data belonging to Store A must NEVER be accessible to Store B
- Operations on Store A data must ONLY be performed by Store A operators
- Cross-store operations are FORBIDDEN

### Tenant Boundary Enforcement

IBEX enforces tenant boundaries at multiple layers:

1. **Database Schema**
   - All tables include `storeId` column
   - Foreign keys enforce store relationships
   - Indexes support store-scoped queries

2. **Service Layer**
   - Every service method validates store ownership
   - `StoreOwnershipGuard` validates `operator.storeId === target.storeId`
   - Explicit `storeId` checks before operations

3. **Controller Layer** (Prepared in S1)
   - `StoreScopeGuard` can be applied to routes/controllers
   - Validates `storeId` from request context
   - Prevents cross-tenant access at the API boundary

4. **Request Context**
   - `storeId` extracted from `operatorContext` in request body
   - Future: Will extract from JWT token claims or headers

---

## Why Current Architecture is SaaS-Safe

### 1. Store-Scoped Data Model

All entities include `storeId`:
- `Invoice.storeId`
- `Customer.storeId`
- `Product.storeId`
- `User.storeId`
- `Payment.storeId`
- `LedgerEntry.storeId`
- `AuditLog.storeId`

This ensures data isolation at the database level.

### 2. Explicit Store Validation

Every financial operation validates store ownership:
- `StoreOwnershipGuard.validateStoreOwnership()` checks store boundaries
- Services explicitly validate `storeId` before operations
- No implicit store assumptions

### 3. Transaction Safety

All critical operations use database transactions:
- Invoice issue, settle, cancel
- Payment creation
- Ledger entry creation
- Audit log creation

Transactions ensure atomicity and prevent partial cross-tenant operations.

### 4. Append-Only Audit Trail

Audit logs are immutable and include `storeId`:
- Every audit entry records the `storeId`
- Audit queries are store-scoped
- Provides accountability and compliance

---

## What is Intentionally Deferred

### Authentication System (Phase G)

Currently, `storeId` comes from `operatorContext` in request body. This is a temporary solution before full authentication is implemented.

**Future:**
- JWT tokens with `storeId` in claims
- Request headers (`x-store-id`)
- Session-based authentication

### Global Store Scope Guard Application

`StoreScopeGuard` is prepared but NOT yet applied to existing controllers. This is intentional to avoid refactoring in S1.

**Future:**
- Apply `StoreScopeGuard` to all controllers
- Remove `operatorContext` from request bodies
- Extract `storeId` from authentication context

### Multi-Region Deployment

Current architecture assumes single-region deployment. Multi-region considerations are deferred.

**Future:**
- Database replication strategies
- Regional data residency
- Cross-region latency optimization

### Tenant-Level Configuration

Each tenant (store) uses the same configuration. Tenant-specific settings are deferred.

**Future:**
- Per-tenant feature flags
- Tenant-specific rate limits
- Custom business rules per tenant

---

## Request Correlation

### Request ID Middleware

Every incoming request receives a unique `requestId`:
- Generated using `crypto.randomUUID()`
- Attached to request object
- Included in response headers (`X-Request-ID`)
- Logged in console output

**Purpose:**
- Request tracing across the system
- Debugging distributed operations
- Log correlation in production

**Note:** Request IDs are NOT persisted to the database (per S1 requirements). They're only used for request context and logging.

---

## Environment Configuration

### Required Environment Variables

The application validates required environment variables at startup:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string (must start with `postgresql://` or `postgres://`)

**Optional (with defaults):**
- `PORT` - Server port (default: `3000`)
- `NODE_ENV` - Environment mode (default: `development`)

### Validation

Environment validation happens in `main.ts` before the application starts:
- Fails fast if required variables are missing
- Validates `DATABASE_URL` format
- Provides clear error messages

---

## Tenant Boundary Helpers

### `validateTenantBoundary()`

Validates that an operation is within tenant boundaries:

```typescript
validateTenantBoundary(
  operatorStoreId: string,
  targetStoreId: string,
  operation: string,
  resourceId?: string,
): void
```

Throws `ForbiddenException` if store IDs don't match.

### `isSameTenant()`

Checks if two store IDs belong to the same tenant:

```typescript
isSameTenant(storeId1: string, storeId2: string): boolean
```

### `getStoreIdFromRequest()`

Extracts `storeId` from request context (placeholder for future auth system):

```typescript
getStoreIdFromRequest(request: any): string | null
```

---

## Store Scope Guard

### `StoreScopeGuard`

A reusable guard for controller-level tenant enforcement:

```typescript
@UseGuards(StoreScopeGuard)
@Controller('invoices')
export class InvoicesController {
  // All routes protected
}
```

**Features:**
- Validates `storeId` from request
- Validates UUID format
- Attaches `storeId` to request object
- Throws `ForbiddenException` on violation

**Status:** Prepared in S1, not yet applied to existing controllers.

---

## Security Considerations

### Tenant Isolation is Critical

Violations of tenant boundaries are **security vulnerabilities**. The system is designed to fail-safe:

- **403 Forbidden** on cross-tenant operations
- **Explicit validation** at every boundary
- **No implicit assumptions** about store context

### Defense in Depth

Multiple layers of protection:
1. Database schema (foreign keys, indexes)
2. Service layer validation
3. Controller guards (prepared)
4. Request context validation

---

## Migration Path

### Current State (S1)

- Tenant boundaries defined and documented
- Store isolation enforced at service layer
- Request correlation implemented
- Environment validation hardened
- Guards prepared (not yet applied)

### Future Phases

- **S2:** Apply `StoreScopeGuard` to all controllers
- **S3:** Implement authentication system with JWT
- **S4:** Remove `operatorContext` from request bodies
- **S5:** Add tenant-level configuration

---

## Related Documentation

- [Tenant Boundary Definition](../src/core/tenant-boundary.ts)
- [Store Scope Guard](../src/core/store-scope.guard.ts)
- [Environment Configuration](../src/core/environment.config.ts)
- [Architecture Documentation](../ARCHITECTURE.md)

---

**Last Updated:** 2025-12-25  
**Phase:** S1 - SaaS Readiness Foundations

