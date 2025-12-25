# Billing Domain - Foundation Only (B1)

## Overview

This module provides the foundation for billing and plans in IBEX. **This is NOT billing yet** - it's infrastructure preparation.

## What This Module Does

- **Plan Definitions**: Define subscription plans with limits and features
- **Store Subscriptions**: Link stores (tenants) to plans
- **Usage Resolution**: Compute usage dynamically from existing data (read-only)
- **Soft Enforcement**: Warn/error when limits are exceeded (no billing)

## What This Module Does NOT Do

- ❌ Payments
- ❌ Stripe / PayPal / gateways
- ❌ Invoices for subscriptions
- ❌ Auto-upgrades / downgrades
- ❌ Background jobs
- ❌ Emails / notifications

## Architecture

```
billing/
├── billing.module.ts          # Module definition
├── plans.service.ts            # Plan CRUD operations
├── subscriptions.service.ts    # Subscription management
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

## Future Phases

- **B2**: Payment integration (Stripe)
- **B3**: Billing cycles and invoicing
- **B4**: Auto-upgrades / downgrades
- **B5**: Usage-based billing

