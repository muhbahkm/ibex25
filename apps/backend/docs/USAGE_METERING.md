# Usage Metering (C2)

## Overview

The Usage Metering layer provides accurate, read-only usage metrics for SaaS plans and reporting. This is the **SINGLE SOURCE OF TRUTH** for usage data in IBEX.

## What Usage Is

Usage metrics are **computed on demand** from existing data. They represent:

- **invoicesIssued**: Number of invoices issued within a time window
- **ledgerEntries**: Number of ledger entries created within a time window
- **activeInvoices**: Current count of active invoices (ISSUED, UNPAID, PAID)
- **activeCustomers**: Current count of active customers (non-guest customers with invoices)

## What Usage Is NOT

- ❌ **NOT stored**: Usage is computed, not persisted
- ❌ **NOT cached**: Every request computes fresh metrics
- ❌ **NOT billable**: Usage metrics are observational, not billing triggers
- ❌ **NOT enforced**: Usage does not block operations
- ❌ **NOT aggregated**: No pre-computed aggregates in database
- ❌ **NOT time-series**: No historical usage tracking

## Metric Definitions

### invoicesIssued

**Definition**: Count of invoices with status `ISSUED`, `UNPAID`, or `PAID` created within the time window.

**Source**: `invoices` table
**Filter**: `status IN ('ISSUED', 'UNPAID', 'PAID') AND createdAt BETWEEN window.start AND window.end`

### ledgerEntries

**Definition**: Count of ledger entries created within the time window.

**Source**: `ledger_entries` table
**Filter**: `createdAt BETWEEN window.start AND window.end`

### activeInvoices

**Definition**: Current count of invoices with status `ISSUED`, `UNPAID`, or `PAID` (not time-windowed).

**Source**: `invoices` table
**Filter**: `status IN ('ISSUED', 'UNPAID', 'PAID')`

### activeCustomers

**Definition**: Current count of non-guest customers who have at least one invoice.

**Source**: `customers` table joined with `invoices`
**Filter**: `isGuest = false AND has invoices`

## Time Windows

### DAILY

Window boundaries: Start of current day (00:00:00) to end of current day (23:59:59.999).

### MONTHLY

Window boundaries: Start of current month (day 1, 00:00:00) to end of current month (last day, 23:59:59.999).

## Why Usage is Computed, Not Stored

1. **Accuracy**: Always reflects current state of data
2. **Simplicity**: No synchronization, no cache invalidation
3. **Consistency**: Single source of truth (the data itself)
4. **Flexibility**: Can compute for any time window on demand
5. **No Maintenance**: No background jobs, no aggregation pipelines

## Relationship to Billing

Usage metrics are **observational** and will be used by future billing phases:

- **B1/B2**: Plans define limits, usage shows current consumption
- **B3**: Billing accounts track state, usage shows activity
- **Future**: Usage-based billing will use these metrics

**Important**: Usage metering does NOT trigger billing. Billing logic is separate.

## API Endpoint

### GET /usage

**Query Parameters:**
- `window` (optional): `"daily"` | `"monthly"` (default: `"monthly"`)

**Response:**
```json
{
  "success": true,
  "data": {
    "window": "MONTHLY",
    "metrics": {
      "invoicesIssued": 45,
      "ledgerEntries": 90,
      "activeInvoices": 12,
      "activeCustomers": 8
    },
    "computedAt": "2025-01-27T10:00:00.000Z"
  }
}
```

**Security:**
- Requires `StoreScopeGuard` (tenant isolation)
- Store-scoped (only returns metrics for authenticated store)

## Implementation Details

### Computation Strategy

All metrics are computed in parallel using `Promise.all()` for efficiency:

```typescript
const [invoicesIssued, ledgerEntries, activeInvoices, activeCustomers] = 
  await Promise.all([
    computeInvoicesIssued(storeId, boundaries),
    computeLedgerEntries(storeId, boundaries),
    computeActiveInvoices(storeId),
    computeActiveCustomers(storeId),
  ]);
```

### Deterministic Behavior

- Same input (storeId, window, referenceDate) = same output
- No random factors
- No external dependencies
- Pure functions

### Performance Considerations

- Metrics are computed on every request (no caching)
- For high-traffic scenarios, consider caching at API gateway level
- Database queries are optimized with indexes on `storeId` and `createdAt`
- Parallel computation reduces latency

## Future Enhancements

- Additional metrics (e.g., total revenue, average invoice value)
- Custom time windows (e.g., weekly, quarterly)
- Historical usage snapshots (if needed for reporting)
- Usage trends and analytics

## Contract Safety

C2 respects all frozen contracts:
- ✅ No schema changes
- ✅ No migrations
- ✅ No invoice lifecycle changes
- ✅ No ledger invariant changes
- ✅ No billing logic
- ✅ Read-only only
- ✅ Store-scoped (tenant-safe)

