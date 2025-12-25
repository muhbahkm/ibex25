# Billing Domain - Foundation Only (B1 + B2)

## Overview

This module provides the foundation for billing and plans in IBEX. **This is NOT billing yet** - it's infrastructure preparation.

## What This Module Does

- **Plan Definitions**: Define subscription plans with limits and features
- **Store Subscriptions**: Link stores (tenants) to plans
- **Usage Resolution**: Compute usage dynamically from existing data (read-only)
- **Soft Enforcement**: Warn/error when limits are exceeded (no billing)
- **B2: Pricing Definitions**: Define pricing for plans with billing cycles (MONTHLY, YEARLY)
- **B2: Pricing API**: Read-only endpoint to fetch pricing information

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
├── billing.module.ts          # Module definition
├── billing.controller.ts      # API endpoints
├── plans.service.ts            # Plan CRUD operations
├── subscriptions.service.ts    # Subscription management
├── pricing.service.ts          # B2: Pricing read-only operations
├── dto/
│   └── store-plan.dto.ts      # DTOs for API responses
├── usage/
│   └── usage-resolver.ts      # Read-only usage computation
├── guards/
│   └── plan-limit.guard.ts    # Soft enforcement guard
└── README.md                   # This file
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

## Future Phases

- **B3**: Billing cycles and invoicing
- **B4**: Payment integration (Stripe)
- **B5**: Auto-upgrades / downgrades
- **B6**: Usage-based billing

