# Operational Hardening & Safety Controls (C1)

## Overview

This module provides operational hardening and safety controls for the IBEX system. It focuses on preventing abuse, enforcing safe limits, and protecting the system under load.

**This is NOT business logic** - it's operational safety only.

## Components

### 1. Rate Limiting

**RateLimitGuard**: Tenant-aware rate limiting per storeId and endpoint category.

- **Read endpoints**: Higher limits (default: 100 requests/minute)
- **Write endpoints**: Stricter limits (default: 20 requests/minute)
- **In-memory implementation**: No Redis required
- **Configurable**: Via environment variables

**Environment Variables:**
- `RATE_LIMIT_READ`: Read endpoint limit (default: 100)
- `RATE_LIMIT_WRITE`: Write endpoint limit (default: 20)
- `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds (default: 60000)

**Error Code**: `RATE_LIMIT_EXCEEDED`

### 2. Write Operation Throttling

**WriteThrottleGuard**: Explicit throttling for write operations (issue, settle, cancel).

- **Max write ops per minute**: Configurable (default: 10)
- **Per-store throttling**: Each store has its own limit
- **Applied to**: Invoice issue, settle, cancel endpoints

**Environment Variables:**
- `MAX_WRITE_OPS_PER_MINUTE`: Maximum write operations per store per minute (default: 10)

**Error Code**: `WRITE_THROTTLED`

### 3. Usage Snapshot Service

**UsageSnapshotService**: Read-only service that computes current usage metrics per store.

- **Derived from existing data**: No persistence
- **Metrics**:
  - `invoicesIssuedToday`
  - `ledgerEntriesToday`
  - `invoicesIssuedThisMonth`
  - `ledgerEntriesThisMonth`

This service will be reused by billing and plans in future phases.

### 4. Error Codes

Centralized error codes for operational safety:

- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `WRITE_THROTTLED`: Write operation throttled
- `OPERATION_TEMPORARILY_BLOCKED`: Operation temporarily blocked

All errors follow the standard response format:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "..."
  }
}
```

### 5. Observability & Logging

Every blocked request is logged with:
- `requestId`: Request correlation ID
- `storeId`: Tenant identifier
- `operation`: Operation name (path + method)
- `reason`: Reason for block

**Logging**: Console logs only (no external services)

## Architecture

```
operational/
├── operational.module.ts          # Module definition
├── error-codes.ts                  # Centralized error codes
├── rate-limiter.ts                 # In-memory rate limiter
├── usage-snapshot.service.ts       # Usage metrics (read-only)
├── guards/
│   ├── rate-limit.guard.ts         # Rate limiting guard
│   └── write-throttle.guard.ts    # Write throttling guard
└── README.md                       # This file
```

## Key Principles

1. **Additive Only**: No business logic changes
2. **Tenant-Aware**: All limits are per storeId
3. **Configurable**: Via environment variables
4. **Production-Safe**: Graceful degradation
5. **Observable**: All blocks are logged

## What This Module Does NOT Do

- ❌ No business logic changes
- ❌ No billing logic
- ❌ No accounting changes
- ❌ No schema changes
- ❌ No migrations
- ❌ No external dependencies (Redis, etc.)

## Future Enhancements

- Redis-based rate limiting for multi-instance deployments
- More granular rate limits per endpoint
- Usage-based throttling
- Circuit breakers

