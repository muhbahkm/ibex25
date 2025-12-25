# Accounting Invariants

**Version:** v0.2-contract-frozen  
**Last Updated:** 2024-12-25  
**Status:** FROZEN - Core accounting rules that must never be violated

⚠️ **CONSTITUTIONAL LAW**: These invariants are non-negotiable. Violating them breaks financial integrity.

---

## Table of Contents

1. [Invoice Lifecycle](#invoice-lifecycle)
2. [Payment Model](#payment-model)
3. [Ledger Model](#ledger-model)
4. [Store Ownership](#store-ownership)

---

## Invoice Lifecycle

### State Machine

**FROZEN STATE TRANSITIONS:**
```
DRAFT → ISSUED → UNPAID/PAID → CANCELLED
  ↓         ↓
CANCELLED  CANCELLED
```

**Allowed Transitions:**
- `DRAFT → ISSUED` (via `POST /invoices/:id/issue`)
- `ISSUED → UNPAID` (automatic, if `paymentType = CREDIT`)
- `ISSUED → PAID` (automatic, if `paymentType = CASH`)
- `UNPAID → PAID` (via `POST /invoices/:id/settle`)
- `DRAFT → CANCELLED` (via `POST /invoices/:id/cancel`)
- `ISSUED → CANCELLED` (via `POST /invoices/:id/cancel`)

**Forbidden Transitions:**
- `PAID → UNPAID` (irreversible)
- `PAID → ISSUED` (irreversible)
- `CANCELLED → any state` (irreversible)
- Any modification after `ISSUED` (except state transitions)

### Financial Impact

**States with Financial Impact:**
- `UNPAID`: Has financial impact (outstanding balance)
- `PAID`: Has financial impact (completed sale)

**States without Financial Impact:**
- `DRAFT`: No financial impact (malleable)
- `ISSUED`: No financial impact (intermediate state)
- `CANCELLED`: No financial impact (voided)

**Rule:** Only `UNPAID` and `PAID` invoices appear in customer statements and financial calculations.

---

## Payment Model

### Payment Types

**FROZEN ENUM:** `PaymentType = CASH | CREDIT`

**Rules:**
- `CASH`: Payment at issue time → Invoice ends as `PAID`
- `CREDIT`: Deferred payment → Invoice ends as `UNPAID`

**Contract:** `paymentType` must be provided at `issue()` time. Cannot be changed after issue.

### Payment Records

**FROZEN INVARIANTS:**
1. **One Payment Per Invoice**: `invoiceId` is unique in `payments` table
2. **Payment is Immutable**: No updates, no deletes
3. **Payment Timing**:
   - `CASH` payments: Created at `issue()` time
   - `CREDIT` payments: Created at `settle()` time
4. **Payment Amount**: Always equals `invoice.totalAmount` (derived, not input)

**Contract:** Payment records are append-only financial events. They record what happened, not what should happen.

---

## Ledger Model

### Ledger Entry Types

**FROZEN ENUM:** `LedgerEntryType = SALE | RECEIPT`

**Rules:**
- `SALE`: Created when invoice is issued (financially effective)
- `RECEIPT`: Created when invoice is settled (UNPAID → PAID)

### Ledger Invariants

**FROZEN CONSTITUTIONAL LAW:**

1. **Ledger is Append-Only**
   - No updates allowed
   - No deletes allowed
   - Ledger entries are immutable historical records

2. **No Balances Stored**
   - Ledger is an event log, not a balance sheet
   - No running totals
   - No aggregated balances
   - Balances must be calculated from events (if needed)

3. **No Recalculation Allowed**
   - Ledger entries are facts, not computations
   - Amount always equals `invoice.totalAmount` at time of entry
   - Cannot recalculate or adjust ledger entries

4. **One SALE Per Invoice**
   - Created exactly once at `issue()` time
   - Guarded by `LedgerGuard.ensureNoSaleEntry()`
   - Duplicate SALE entries are impossible (409 Conflict)

5. **One RECEIPT Per Invoice**
   - Created exactly once at `settle()` time (for CREDIT invoices)
   - Guarded by `LedgerGuard.ensureNoReceiptEntry()`
   - Duplicate RECEIPT entries are impossible (409 Conflict)

6. **SALE Timing**
   - SALE is created when invoice transitions to financially effective state
   - For CASH: Created at `issue()` (invoice becomes PAID)
   - For CREDIT: Created at `issue()` (invoice becomes UNPAID)
   - Never created for DRAFT, ISSUED, or CANCELLED invoices

7. **RECEIPT Timing**
   - RECEIPT is created when invoice transitions UNPAID → PAID
   - Only created for CREDIT invoices (CASH invoices are already PAID)
   - Never created for CASH invoices at issue time
   - Never created for DRAFT, ISSUED, or CANCELLED invoices

### Ledger Guard

**FROZEN IDEMPOTENCY RULES:**
- `LedgerGuard.ensureNoSaleEntry()`: Prevents duplicate SALE entries
- `LedgerGuard.ensureNoReceiptEntry()`: Prevents duplicate RECEIPT entries
- All checks run inside the same transaction as ledger entry creation
- Failures throw `409 Conflict` with error codes:
  - `LEDGER_SALE_ALREADY_RECORDED`
  - `LEDGER_RECEIPT_ALREADY_RECORDED`

**Contract:** Ledger guards are constitutional law. They prevent financial double-counting and ensure audit integrity.

---

## Store Ownership

### Store Ownership Guard

**FROZEN RULE:** All financial operations must be performed within the same store.

**Enforcement:**
- `StoreOwnershipGuard.validateStoreOwnership()`: Validates `invoice.storeId === operator.storeId`
- `StoreOwnershipGuard.validateOperatorStore()`: Validates `operator.storeId === target.storeId`
- Violations throw `403 Forbidden`

**Contract:** Store boundaries are non-negotiable. Cross-store operations are forbidden.

---

## Contract Freeze Summary

⚠️ **FROZEN INVARIANTS** (Do not change without version bump):

1. **Invoice Lifecycle**: DRAFT → ISSUED → UNPAID/PAID → CANCELLED (state transitions frozen)
2. **Payment Types**: CASH | CREDIT (enum values frozen)
3. **Payment Model**: One payment per invoice, immutable, timing rules frozen
4. **Ledger Entry Types**: SALE | RECEIPT (enum values frozen)
5. **Ledger Model**: Append-only, no balances, no recalculation, one SALE per invoice, one RECEIPT per invoice
6. **Ledger Timing**: SALE at ISSUE, RECEIPT at SETTLE (rules frozen)
7. **Store Ownership**: Cross-store operations forbidden (rule frozen)

---

**End of Accounting Invariants**

