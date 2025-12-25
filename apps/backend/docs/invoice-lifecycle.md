# Invoice Lifecycle - IBEX v1

## 📋 Overview

The Invoice Lifecycle is the **operational contract** that governs all invoice-related operations in IBEX. This is not a suggestion—it's the foundation that will control:

- Sales engine
- Accounts receivable
- Reports
- Accounting

**If set correctly now = the system thrives**  
**If broken now = the system distorts later**

---

## 🎯 What is an Invoice in IBEX?

An invoice is **NOT** a CRUD record.  
An invoice = **A binding business commitment (event)**

Therefore:
- ❌ Cannot be modified after being issued
- ❌ Cannot be deleted
- ❌ Cannot be "fixed" by updating
- ✅ Any change = new event

---

## 📊 Official Invoice States (v1)

### 1️⃣ DRAFT (مسودة)

**Meaning:**
- Invoice under creation
- No financial impact
- No accounts receivable
- Not included in any reports

**Properties:**
- ✅ Can be modified
- ✅ Can be cancelled without impact
- ❌ Not visible to customer

**Forbidden:**
- ❌ No settlement
- ❌ No payment
- ❌ No balance calculation

---

### 2️⃣ ISSUED (معتمدة)

**Meaning:**
- Invoice has been issued
- Became a business commitment
- This is where "reality" begins

**Important:**
- ISSUED ≠ paid
- ISSUED ≠ unpaid
- ISSUED = "completed/committed"

**Note:** In the current implementation, invoices transition from DRAFT → ISSUED → (UNPAID or PAID) immediately. The ISSUED state is a logical step in the transition.

---

### 3️⃣ UNPAID (غير مسددة)

**Meaning:**
- Issued invoice
- Linked to a customer
- Created financial liability

**Properties:**
- ✅ Included in customer statement
- ✅ Included in outstanding balance
- ✅ Can be settled later

---

### 4️⃣ PAID (مسددة)

**Meaning:**
- Invoice closed financially
- Liability cleared

**Properties:**
- ❌ No modification
- ❌ Cannot be reopened
- ✅ Included in sales

---

### 5️⃣ CANCELLED (ملغاة)

**Meaning:**
- Invoice cancelled officially
- No financial impact (or impact removed)

**Important:**
- ❌ No deletion
- ✅ Cancellation is a documented event

---

## 🔄 Allowed State Transitions

**❗ Any transition not listed here = FORBIDDEN**

| From | To | Condition |
|------|-----|-----------|
| DRAFT | ISSUED | Always allowed |
| ISSUED | UNPAID | If credit/deferred |
| ISSUED | PAID | If cash/immediate |
| UNPAID | PAID | Settlement |
| ISSUED | CANCELLED | Always allowed |
| DRAFT | CANCELLED | Always allowed |

---

## ❌ Forbidden Transitions

- ❌ PAID → UNPAID
- ❌ PAID → ISSUED
- ❌ CANCELLED → any state
- ❌ Modifying DRAFT after ISSUED
- ❌ Modifying any invoice that is not DRAFT

---

## 🏆 Golden Rule

**State is the single source of truth**

- ❌ No flags
- ❌ No booleans
- ❌ No helper fields

---

## 🔌 API Endpoints

### Create Invoice
```
POST /invoices
```
Creates a new invoice with status **DRAFT**

### Issue Invoice
```
POST /invoices/:invoiceId/issue
```
Transitions: **DRAFT → ISSUED → (UNPAID or PAID)**
- If customer exists: → UNPAID
- If no customer (guest): → PAID

### Settle Invoice
```
POST /invoices/:invoiceId/settle
```
Transitions: **UNPAID → PAID**

### Cancel Invoice
```
POST /invoices/:invoiceId/cancel
```
Transitions: **DRAFT → CANCELLED** or **ISSUED → CANCELLED**

---

## 📊 Financial Impact

Only invoices with these statuses have financial impact:
- **UNPAID**: Included in outstanding balance
- **PAID**: Included in total sales

**Excluded from financial calculations:**
- **DRAFT**: No impact
- **ISSUED**: No impact (transitions immediately)
- **CANCELLED**: No impact

---

## 🔒 Validation Rules

All state transitions are validated by `InvoiceStateTransitions` utility:
- `isTransitionAllowed(from, to)`: Checks if transition is valid
- `validateTransition(from, to)`: Throws if invalid
- `canModify(status)`: Only DRAFT can be modified
- `canSettle(status)`: Only UNPAID can be settled
- `canIssue(status)`: Only DRAFT can be issued
- `canCancel(status)`: DRAFT or ISSUED can be cancelled

---

## 🚫 What We're NOT Doing (v1)

- ❌ No Ledger
- ❌ No Accounting entries
- ❌ No VAT
- ❌ No Refunds
- ❌ No Partial payments

All of this comes later, calmly.

---

## 📝 Implementation Notes

### Migration Strategy
- Existing UNPAID invoices remain UNPAID
- Existing PAID invoices remain PAID
- Existing CANCELLED invoices remain CANCELLED
- New invoices default to DRAFT

### Backward Compatibility
- Old invoices (UNPAID/PAID/CANCELLED) continue to work
- New invoices follow the full lifecycle
- No breaking changes to existing functionality

---

**Last Updated:** 2025-12-24  
**Version:** 1.0

