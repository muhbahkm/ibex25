# Billing Domain - Foundation Only (B1 + B2 + B3)

## Overview

This module provides the foundation for billing and plans in IBEX. **This is NOT billing yet** - it's infrastructure preparation.

## What This Module Does

- **Plan Definitions**: Define subscription plans with limits and features
- **Store Subscriptions**: Link stores (tenants) to plans
- **Usage Resolution**: Compute usage dynamically from existing data (read-only)
- **Soft Enforcement**: Warn/error when limits are exceeded (no billing)
- **B2: Pricing Definitions**: Define pricing for plans with billing cycles (MONTHLY, YEARLY)
- **B2: Pricing API**: Read-only endpoint to fetch pricing information
- **B3: Internal Billing Control**: Provider-agnostic billing account management and state machine
- **B3: Billing Status Enforcement**: Guards to prevent operations based on billing account status

## What This Module Does NOT Do

- ❌ Payments
- ❌ Stripe / PayPal / gateways
- ❌ Invoices for subscriptions
- ❌ Auto-upgrades / downgrades
- ❌ Background jobs
- ❌ Emails / notifications
- ❌ Charging customers
- ❌ Enforcing expirations
- ❌ Billing cycle enforcement

## Architecture

```
billing/
├── billing.module.ts              # Module definition
├── billing.controller.ts          # API endpoints
├── plans.service.ts                  # Plan CRUD operations
├── subscriptions.service.ts       # Subscription management
├── pricing.service.ts             # B2: Pricing read-only operations
├── billing-account.service.ts     # B3: Internal billing control (provider-agnostic)
├── domain/
│   └── billing-state-machine.ts   # B3: Pure domain logic for state transitions
├── dto/
│   └── store-plan.dto.ts          # DTOs for API responses
├── usage/
│   └── usage-resolver.ts          # Read-only usage computation
├── guards/
│   ├── plan-limit.guard.ts        # Soft enforcement guard
│   └── billing-status.guard.ts    # B3: Billing status enforcement
└── README.md                       # This file
```

## Key Principles

1. **Read-Only Where Possible**: Usage is computed, not stored
2. **Non-Invasive**: Does not modify accounting logic
3. **Declarative**: Plans define limits, enforcement is soft
4. **SaaS-Safe**: All operations are store-scoped

## B2: Pricing & Billing Cycles

**Status**: Implemented (read-only)

B2 extends the billing domain with pricing definitions and billing cycles:

- **BillingCycle Enum**: MONTHLY, YEARLY
- **PlanPricing Model**: Links plans to pricing with billing cycles
- **PricingService**: Read-only service for fetching pricing information
- **GET /billing/pricing**: Read-only endpoint to fetch store's plan pricing

**Key Points**:
- Pricing is **descriptive only** - no charging logic
- No expiration enforcement
- No billing cycle enforcement
- No time-based logic
- All operations are read-only

## Pricing vs Billing vs Charging

**Pricing (B2)**: Definition of prices for plans and billing cycles. Read-only, descriptive.

**Billing (Future)**: The process of creating invoices for subscriptions, tracking billing cycles, managing renewals.

**Charging (Future)**: The actual payment processing (Stripe, PayPal, etc.) that charges customers.

**Current State**: We have pricing definitions only. Billing and charging are not implemented.

## B3: Internal Billing Control Layer (Provider-Agnostic)

**Status**: Implemented

B3 introduces an internal billing control layer that represents the absolute truth of subscription and billing state. External providers (Stripe, etc.) are just executors.

### Core Components

**Database Models:**
- `BillingAccount`: Internal billing account (source of truth)
  - `storeId`: Links to store (tenant)
  - `currentPlanId`: Current subscription plan
  - `status`: SubscriptionState (ACTIVE, PAST_DUE, GRACE, SUSPENDED, CANCELLED)
  - `billingState`: JSON metadata (provider-agnostic)
- `ExternalBillingRef`: Links to external provider (Stripe, etc.)
  - `provider`: BillingProvider (STRIPE, MANUAL, NONE)
  - `externalCustomerId`: External customer ID
  - `externalSubscriptionId`: External subscription ID
  - `syncStatus`: Sync status with external provider

**State Machine:**
- `BillingStateMachine`: Pure domain logic for state transitions
  - No side effects
  - No API calls
  - No dates calculated
  - Only transition rules

**Services:**
- `BillingAccountService`: Internal billing control (read/write)
  - `activateSubscription()`
  - `suspendSubscription()`
  - `cancelSubscription()`
  - `changePlan()`
  - No Stripe knowledge

**Guards:**
- `BillingStatusGuard`: Enforces billing account status
  - Prevents invoice issuance when status is not ACTIVE
  - Blocks access to premium features based on status

### Why This Layer Exists

1. **Source of Truth**: Internal billing state is the absolute truth, not external providers
2. **Provider Independence**: Can switch providers (Stripe → PayPal) without changing business logic
3. **Control**: We control billing state, external providers just execute
4. **Resilience**: If external provider is down, we still know our billing state

### What B3 Does NOT Do

- ❌ No Stripe SDK
- ❌ No Webhooks
- ❌ No Invoices
- ❌ No Charging
- ❌ No Time-based jobs
- ❌ No Complex UI

This is intentional - B3 is the control layer, not the execution layer.

### Where Our Role Ends and Provider Role Begins

**Our Role (B3):**
- Define billing state
- Enforce state transitions
- Control access based on state
- Store billing account information

**Provider Role (Future):**
- Execute payments
- Handle webhooks
- Manage customer payment methods
- Process refunds

**Synchronization (Future):**
- External providers will sync with our internal state
- We are the source of truth
- Providers are executors

## Future Phases

- **B4**: Payment integration (Stripe) - External provider execution layer
- **B5**: Billing cycles and invoicing
- **B6**: Auto-upgrades / downgrades
- **B7**: Usage-based billing

