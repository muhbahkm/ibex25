# Permissions & Ownership - IBEX v1

## 🎯 Objective

Prevent any unauthorized financial action even before implementing a full Auth system.
We need to know and restrict: **who does what, on which store, at what moment**.

---

## 🏛️ Governing Principle

**Every financially impactful operation must be linked to a clear owner (Operator) and a clear scope (Store).**

**No Exceptions.**

---

## 📊 Conceptual Model

### Entities

- **Store**: Business scope (the store)
- **User (Operator)**: Person performing the operation
- **Invoice**: Financial event

### Relationships

- Every Invoice is linked to **one Store**
- Every operation on Invoice is performed by **one User**
- The User operates only within a **specific Store**

---

## 🔐 Permissions in v1 (Minimal & Sufficient)

| Operation | Status | Who Has Permission |
|-----------|--------|-------------------|
| Create DRAFT | — | Any Operator within Store |
| Modify DRAFT | DRAFT only | Same Operator or Store Manager |
| Issue Invoice | DRAFT | Operator within Store |
| Cancel Invoice | DRAFT / ISSUED | Store Manager only |
| Settle Invoice | UNPAID | Store Manager only |

**Note:** "Store Manager" here is a logical concept, not a technical role yet.

---

## 🔧 Implementation Without Full Auth

### Principle

We pass `operatorContext` explicitly in every impactful request.

**Example:**
```json
{
  "operatorId": "uuid",
  "storeId": "uuid"
}
```

This is temporary but:
- ✅ Enforces discipline
- ✅ Prevents "anyone can do anything" logic
- ✅ Makes it easy to add Auth later without breaking contracts

---

## 🛡️ Business Guards

### 1) Store Ownership Guard

**No operation on Invoice unless:**
```
invoice.storeId === operator.storeId
```

**Otherwise → 403 Forbidden**

### 2) Operation Guard

- No Issue unless status = DRAFT
- No Settle unless status = UNPAID
- No Cancel unless status ∈ {DRAFT, ISSUED}

(These exist partially — we link them to ownership)

### 3) Responsibility Attribution

At every operation:
- Store `issuedByUserId`
- Store `settledByUserId`
- Store `cancelledByUserId`

This is not a full Audit Log, but it's the minimum necessary.

---

## 📝 API Usage

### Create Invoice
```json
POST /invoices
{
  "storeId": "uuid",
  "createdBy": "uuid",
  "customerId": "uuid" | null,
  "items": [...],
  "operatorContext": {
    "operatorId": "uuid",
    "storeId": "uuid"
  }
}
```

### Update Draft
```json
PUT /invoices/:id/draft
{
  "customerId": "uuid" | null,
  "items": [...],
  "operatorContext": {
    "operatorId": "uuid",
    "storeId": "uuid"
  }
}
```

### Issue Invoice
```json
POST /invoices/:id/issue
{
  "operatorContext": {
    "operatorId": "uuid",
    "storeId": "uuid"
  }
}
```

### Settle Invoice
```json
POST /invoices/:id/settle
{
  "operatorContext": {
    "operatorId": "uuid",
    "storeId": "uuid"
  }
}
```

### Cancel Invoice
```json
POST /invoices/:id/cancel
{
  "operatorContext": {
    "operatorId": "uuid",
    "storeId": "uuid"
  }
}
```

---

## 🚫 What We're NOT Doing (v1)

- ❌ No JWT
- ❌ No Roles system
- ❌ No RBAC
- ❌ No Complex Middleware

All of this comes later on top of this design.

---

## ✅ Why This Order is Correct

Because it:
- ✅ Protects money before the interface
- ✅ Makes every operation traceable
- ✅ Doesn't restrict future development
- ✅ Prevents "silent chaos"

---

## 📊 Attribution Fields

Every Invoice now tracks:
- `issuedByUserId` - Who issued the invoice
- `settledByUserId` - Who settled the invoice
- `cancelledByUserId` - Who cancelled the invoice

These are nullable and set only when the respective operation occurs.

---

**Last Updated:** 2025-12-24  
**Version:** 1.0

