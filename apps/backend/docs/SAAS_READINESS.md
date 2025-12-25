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

## Enforcement Rollout Strategy

### Staged Enforcement Approach

Tenant isolation enforcement is being rolled out in a controlled, staged manner to minimize risk and allow for gradual validation.

**Phase S1 (Foundations):**
- Tenant boundaries defined and documented
- Store isolation enforced at service layer
- Request correlation implemented
- Environment validation hardened
- Guards prepared (not yet applied)

**Phase S2 (Controlled Enforcement):**
- `StoreScopeGuard` applied to `LedgerController` only
- Enhanced guard with AuthContext support (prepared, not yet active)
- Cross-tenant access detection with explicit error codes
- Logging of blocked access attempts
- **InvoicesController intentionally NOT protected yet** (to avoid disruption)

**Why Partial Enforcement?**
1. **Risk Mitigation**: Ledger is read-only, making it safer for initial enforcement
2. **Validation**: Allows testing enforcement logic before broader rollout
3. **Gradual Migration**: Gives time to validate behavior and fix edge cases
4. **Business Continuity**: Critical operations (invoices) remain unchanged during validation

**Phase S3 (Invoice Domain Hardening):**
- `StoreScopeGuard` applied to `InvoicesController`
- Service-layer enforcement added to `InvoicesService` (defense in depth)
- Cross-tenant access logging with request correlation
- **Dual validation strategy**: Guard + Service layer (security feature, not redundancy)

**Why Dual Validation?**
The dual validation (guard + service) is a security feature, not redundancy:
- **Guard**: Prevents unauthorized requests from reaching the service layer
- **Service**: Validates ownership even if guard is bypassed or service is called directly
- **Defense in Depth**: Multiple layers of protection ensure tenant isolation

**Future Phases:**
- **S4:** Apply `StoreScopeGuard` to remaining controllers (Customers, etc.)
- **S5:** Implement authentication system with JWT
- **S6:** Remove `operatorContext` from request bodies
- **S7:** Add tenant-level configuration

---

## Invoice Domain Hardening (S3)

### Overview

Phase S3 hardens the Invoice domain with explicit tenant isolation enforcement at both the controller and service layers. This provides defense-in-depth security for the most critical financial operations.

### Dual Validation Strategy

**Controller Level (`StoreScopeGuard`):**
- Applied to `InvoicesController` at the class level
- Validates `storeId` from request context before request reaches service
- Prevents unauthorized requests from entering the service layer
- Returns `403 Forbidden` with `CROSS_TENANT_ACCESS_DENIED` error code

**Service Level (`InvoicesService.enforceStoreOwnership`):**
- Validates `invoice.storeId === operatorStoreId` in all critical methods:
  - `issue()` - Invoice issuance
  - `settle()` - Invoice settlement
  - `cancel()` - Invoice cancellation
  - `updateDraft()` - Draft invoice updates
- Validates ownership even if guard is bypassed
- Logs blocked attempts with request correlation ID
- Returns `403 Forbidden` with `INVOICE_CROSS_TENANT_ACCESS` error code

### Why Dual Validation is Not Redundancy

The dual validation (guard + service) is a **security feature**, not redundancy:

1. **Guard Protection**: Prevents unauthorized requests from reaching the service layer, reducing load and providing early rejection
2. **Service Protection**: Validates ownership even if:
   - Guard is bypassed (e.g., direct service calls)
   - Guard logic has bugs
   - Service is called from background jobs or internal processes
3. **Defense in Depth**: Multiple layers of protection ensure tenant isolation even if one layer fails
4. **Audit Trail**: Service-layer validation provides detailed logging with request correlation IDs

### Logging

When a cross-tenant access attempt is blocked at the service layer:

```
[requestId] INVOICE_CROSS_TENANT_ACCESS: invoiceId=<id>, operatorStoreId=<id>, invoiceStoreId=<id>, operation=<operation>
```

This logging includes:
- `requestId`: Request correlation ID for tracing
- `invoiceId`: The invoice being accessed
- `operatorStoreId`: The store ID of the operator
- `invoiceStoreId`: The store ID of the invoice
- `operation`: The operation being attempted (issue, settle, cancel, updateDraft)

### Implementation Details

**Service Layer Enforcement:**
- `InvoicesService` uses `REQUEST` scope to access request context
- `enforceStoreOwnership()` method validates store ownership
- Request correlation ID extracted from request context for logging
- Error code: `INVOICE_CROSS_TENANT_ACCESS`

**No Behavioral Changes:**
- Invoice lifecycle remains identical
- State transitions unchanged
- Ledger, Payment, Audit behavior untouched
- All existing invariants preserved

---

## Migration Path

### Current State (S2)

- Tenant boundaries defined and documented
- Store isolation enforced at service layer
- Request correlation implemented
- Environment validation hardened
- `StoreScopeGuard` applied to `LedgerController` (S2)
- Enhanced guard with AuthContext support (prepared)
- Cross-tenant access detection with error codes
- Logging of blocked requests

### Future Phases

- **S3:** Apply `StoreScopeGuard` to all remaining controllers
- **S4:** Implement authentication system with JWT
- **S5:** Remove `operatorContext` from request bodies
- **S6:** Add tenant-level configuration

---

## Related Documentation

- [Tenant Boundary Definition](../src/core/tenant-boundary.ts)
- [Store Scope Guard](../src/core/store-scope.guard.ts)
- [Environment Configuration](../src/core/environment.config.ts)
- [Architecture Documentation](../ARCHITECTURE.md)

---

**Last Updated:** 2025-12-25  
**Phase:** B2 - Pricing & Billing Cycles (Read-Only)

---

## Billing & Plans (Foundation Only) - B1

### Overview

Phase B1 introduces the foundation for billing and plans in IBEX. **This is NOT billing yet** - it's infrastructure preparation for future monetization.

### What B1 Provides

- **Plan Definitions**: Subscription plans with limits and features
- **Store Subscriptions**: Link stores (tenants) to plans (1:1 relationship)
- **Usage Resolution**: Compute usage dynamically from existing data (read-only)
- **Soft Enforcement**: Warn/error when limits are exceeded (no billing)

### What B1 Does NOT Provide

- ❌ Payments
- ❌ Stripe / PayPal / gateways
- ❌ Invoices for subscriptions
- ❌ Auto-upgrades / downgrades
- ❌ Background jobs
- ❌ Emails / notifications

### Architecture

**Database Models:**
- `Plan`: Plan definitions with limits (JSON) and features (JSON)
- `StoreSubscription`: Links store to plan (1:1 relationship)
- `SubscriptionStatus`: ACTIVE | SUSPENDED

**Backend Services:**
- `PlansService`: Plan CRUD operations
- `SubscriptionsService`: Subscription management
- `UsageResolver`: Read-only usage computation from existing data
- `PlanLimitGuard`: Soft enforcement guard (applied to POST /invoices/:id/issue)

**API Endpoints:**
- `GET /billing/plan`: Returns current plan, limits, features, and usage

**Frontend:**
- `useBilling` hook: Fetches and exposes plan information
- Plan name displayed in dashboard header

### Why This is Not Billing Yet

B1 is **infrastructure only**:
- No pricing fields in schema
- No billing cycles
- No expiration dates
- No payment tracking
- No charging logic

This phase prepares the system for monetization without touching accounting logic or breaking existing contracts.

### Soft Enforcement

Plan limits are enforced **softly**:
- If limit exceeded → `403 Forbidden` with `PLAN_LIMIT_EXCEEDED` error code
- No automatic upgrades
- No billing
- No blocking of existing operations (graceful degradation)

**Applied Only To:**
- `POST /invoices/:id/issue` (invoice issuance)

**Not Applied To:**
- Other invoice operations
- Other endpoints
- Background jobs

### Usage Resolution

Usage is computed **dynamically** from existing data:
- `invoicesThisMonth`: Count of issued invoices this month
- `usersCount`: Count of users in the store
- No counters table
- No writes
- Read-only computation

### Future Phases

- **B3**: Billing cycles and invoicing
- **B4**: Payment integration (Stripe)
- **B5**: Auto-upgrades / downgrades
- **B6**: Usage-based billing

### Contract Safety

B1 respects all frozen contracts:
- ✅ No invoice lifecycle changes
- ✅ No ledger invariant changes
- ✅ No API contract changes
- ✅ No multi-tenant isolation breaks
- ✅ No accounting logic modifications

---

## Pricing & Billing Cycles (B2)

### Overview

Phase B2 extends the billing domain with pricing definitions and billing cycles. **This is still descriptive only** - no charging, no billing enforcement, no expiration logic.

### What B2 Provides

- **BillingCycle Enum**: MONTHLY, YEARLY
- **PlanPricing Model**: Links plans to pricing with billing cycles
- **PricingService**: Read-only service for fetching pricing information
- **GET /billing/pricing**: Read-only endpoint to fetch store's plan pricing
- **Frontend Pricing Display**: Minimal UI to show available pricing options

### What B2 Does NOT Provide

- ❌ Charging customers
- ❌ Creating invoices for subscriptions
- ❌ Enforcing expirations
- ❌ Billing cycle enforcement
- ❌ Time-based logic
- ❌ Stripe or any payment gateway

### Architecture

**Database Models:**
- `BillingCycle`: Enum (MONTHLY, YEARLY)
- `PlanPricing`: Pricing definitions with planId, billingCycle, priceCents, currency

**Backend Services:**
- `PricingService`: Read-only pricing operations
  - `getPricingByPlanId()`: Get all pricing options for a plan
  - `getPricingByPlanAndCycle()`: Get specific pricing
  - `getPricingForStore()`: Get pricing for store's current subscription

**API Endpoints:**
- `GET /billing/pricing`: Returns available pricing for store's current plan

**Frontend:**
- Extended `useBilling` hook with pricing data
- Minimal pricing display in dashboard (read-only)

### Why This is Not Billing Yet

B2 is **descriptive only**:
- Pricing definitions exist but are not enforced
- No billing cycles are tracked or enforced
- No expiration dates
- No charging logic
- No payment processing

This phase adds pricing information to the system without implementing any billing or charging logic.

### Pricing vs Billing vs Charging

**Pricing (B2)**: Definition of prices for plans and billing cycles. Read-only, descriptive.

**Billing (Future)**: The process of creating invoices for subscriptions, tracking billing cycles, managing renewals.

**Charging (Future)**: The actual payment processing (Stripe, PayPal, etc.) that charges customers.

**Current State**: We have pricing definitions only. Billing and charging are not implemented.

### Contract Safety

B2 respects all frozen contracts:
- ✅ No invoice lifecycle changes
- ✅ No ledger invariant changes
- ✅ No existing API contract changes (only new read-only endpoint)
- ✅ No multi-tenant isolation breaks
- ✅ No accounting logic modifications
- ✅ No writes to accounting tables

