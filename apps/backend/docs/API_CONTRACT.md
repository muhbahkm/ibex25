# IBEX API Contract

**Version:** v0.2-contract-frozen  
**Last Updated:** 2024-12-25  
**Status:** FROZEN - Breaking changes require version bump

⚠️ **CONTRACT FROZEN**: This document describes the current API surface. Any changes to endpoints, request/response shapes, or error codes require explicit versioning.

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Error Model](#error-model)
3. [Invoices API](#invoices-api)
4. [Ledger API](#ledger-api)
5. [Customers API](#customers-api)
6. [Health Check](#health-check)

---

## Authentication & Authorization

### Required Headers

All protected endpoints require the following headers:

- `x-user-id`: UUID of the authenticated user (required)
- `x-store-id`: UUID of the store the user belongs to (required)
- `x-role`: User's role - one of: `OWNER`, `MANAGER`, `CASHIER`, `AUDITOR` (required)

### Header Validation

- All headers are validated strictly
- Missing headers → `401 Unauthorized` with error code `AUTH_HEADERS_MISSING`
- Invalid UUID format → `401 Unauthorized` with error codes:
  - `AUTH_INVALID_USER_ID`
  - `AUTH_INVALID_STORE_ID`
- Invalid role → `401 Unauthorized` with error code `AUTH_INVALID_ROLE`

### Permission Enforcement

Permissions are derived from role using a deterministic mapping:

- **OWNER**: All permissions
- **MANAGER**: `ISSUE_INVOICE`, `SETTLE_INVOICE`, `CANCEL_INVOICE`, `VIEW_LEDGER`, `VIEW_REPORTS`
- **CASHIER**: `ISSUE_INVOICE`, `VIEW_LEDGER`
- **AUDITOR**: `VIEW_LEDGER`, `VIEW_REPORTS`

Missing permission → `403 Forbidden` with error code `PERMISSION_DENIED`

### OperatorContext Bridge

For backward compatibility, `OperatorContextDto` is still accepted in request bodies. However:

- `AuthContext` (from headers) is the source of truth
- If `OperatorContextDto` is provided, it must match `AuthContext`
- Mismatches → `400 Bad Request` with error codes:
  - `OPERATOR_ID_MISMATCH`
  - `STORE_ID_MISMATCH`

---

## Error Model

All error responses follow this structure:

```typescript
{
  success: false,
  error: {
    code: string,      // Machine-readable error code
    message: string    // Human-readable error message
  }
}
```

### HTTP Status Codes

- `200 OK`: Successful operation
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request (validation errors, business rule violations)
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Conflict (e.g., duplicate ledger entry)

### Error Codes

**Authentication Errors:**
- `AUTH_HEADERS_MISSING`: Required auth headers are missing
- `AUTH_INVALID_USER_ID`: User ID is not a valid UUID
- `AUTH_INVALID_STORE_ID`: Store ID is not a valid UUID
- `AUTH_INVALID_ROLE`: Role is not a valid enum value
- `AUTH_CONTEXT_MISSING`: AuthContext is missing (internal error)

**Authorization Errors:**
- `PERMISSION_DENIED`: User lacks required permission(s)

**Validation Errors:**
- `OPERATOR_ID_MISMATCH`: Header `x-user-id` does not match body/query `operatorId`
- `STORE_ID_MISMATCH`: Header `x-store-id` does not match body/query `storeId`

**Business Logic Errors:**
- `LEDGER_SALE_ALREADY_RECORDED`: SALE ledger entry already exists for invoice
- `LEDGER_RECEIPT_ALREADY_RECORDED`: RECEIPT ledger entry already exists for invoice

---

## Invoices API

### POST /invoices

**Purpose:** Create a new DRAFT invoice

**Authentication:** Required (`AuthGuard`)

**Permissions:** None (DRAFT invoices have no financial impact)

**Request Headers:**
- `x-user-id`: UUID
- `x-store-id`: UUID
- `x-role`: OWNER | MANAGER | CASHIER | AUDITOR

**Request Body:**
```typescript
{
  storeId: string,           // UUID - must match x-store-id
  createdBy: string,         // UUID - must match x-user-id
  customerId: string | null, // UUID or null (for guest)
  items: Array<{
    productId: string,       // UUID
    quantity: number         // Positive integer
  }>,
  operatorContext: {
    operatorId: string,      // UUID - must match x-user-id
    storeId: string         // UUID - must match x-store-id
  }
}
```

**Response:** `201 Created`
```typescript
{
  success: true,
  data: {
    id: string,
    status: "DRAFT",
    storeId: string,
    customerId: string | null,
    createdBy: string,
    totalAmount: string,     // Decimal as string
    createdAt: string,       // ISO 8601
    items: Array<{
      id: string,
      productId: string,
      quantity: number,
      unitPrice: string,     // Decimal as string
      subtotal: string       // Decimal as string
    }>
  }
}
```

**Error Codes:**
- `400`: Validation errors, insufficient stock, products not found
- `401`: Missing or invalid auth headers
- `403`: Store ownership violation

---

### PUT /invoices/:invoiceId/draft

**Purpose:** Update a DRAFT invoice (only DRAFT invoices can be modified)

**Authentication:** Required (`AuthGuard`)

**Permissions:** None (DRAFT invoices have no financial impact)

**Request Headers:**
- `x-user-id`: UUID
- `x-store-id`: UUID
- `x-role`: OWNER | MANAGER | CASHIER | AUDITOR

**Request Body:**
```typescript
{
  customerId?: string | null,
  items?: Array<{
    productId: string,
    quantity: number
  }>,
  operatorContext: {
    operatorId: string,
    storeId: string
  }
}
```

**Response:** `200 OK`
```typescript
{
  success: true,
  data: {
    id: string,
    status: "DRAFT",
    // ... updated invoice fields
  }
}
```

**Error Codes:**
- `400`: Invoice is not DRAFT, validation errors
- `401`: Missing or invalid auth headers
- `403`: Store ownership violation, not the creator
- `404`: Invoice not found

---

### POST /invoices/:invoiceId/issue

**Purpose:** Issue an invoice (DRAFT → ISSUED → UNPAID/PAID)

⚠️ **CRITICAL ENDPOINT**: This is the most dangerous endpoint. It transitions an invoice from "malleable data" to a binding business and legal commitment.

**Authentication:** Required (`AuthGuard`)

**Permissions:** `ISSUE_INVOICE`

**Request Headers:**
- `x-user-id`: UUID
- `x-store-id`: UUID
- `x-role`: OWNER | MANAGER | CASHIER (must have ISSUE_INVOICE permission)

**Request Body:**
```typescript
{
  paymentType: "CASH" | "CREDIT",
  operatorId: string,        // UUID - must match x-user-id (optional, validated)
  storeId: string            // UUID - must match x-store-id (optional, validated)
}
```

**Response:** `200 OK`
```typescript
{
  success: true,
  data: {
    id: string,
    status: "PAID" | "UNPAID",  // CASH → PAID, CREDIT → UNPAID
    previousStatus: "DRAFT",
    issuedAt: string,            // ISO 8601
    paymentType: "CASH" | "CREDIT",
    // ... invoice fields
  }
}
```

**Business Rules:**
- Invoice must have at least one item
- Invoice totalAmount must be > 0
- Invoice must be in DRAFT status
- Issue is atomic (transaction)
- Creates SALE ledger entry
- Creates Payment record if paymentType is CASH
- Deducts stock for all items

**Error Codes:**
- `400`: No items, zero amount, not DRAFT, validation errors
- `401`: Missing or invalid auth headers
- `403`: Missing ISSUE_INVOICE permission, store ownership violation
- `404`: Invoice not found
- `409`: SALE ledger entry already exists (idempotency guard)

---

### POST /invoices/:invoiceId/settle

**Purpose:** Settle an UNPAID invoice (UNPAID → PAID)

**Authentication:** Required (`AuthGuard`)

**Permissions:** `SETTLE_INVOICE`

**Request Headers:**
- `x-user-id`: UUID
- `x-store-id`: UUID
- `x-role`: OWNER | MANAGER (must have SETTLE_INVOICE permission)

**Request Body:**
```typescript
{
  operatorId: string,        // UUID - must match x-user-id (optional, validated)
  storeId: string            // UUID - must match x-store-id (optional, validated)
}
```

**Response:** `200 OK`
```typescript
{
  success: true,
  data: {
    id: string,
    status: "PAID",
    previousStatus: "UNPAID",
    settledAt: string,       // ISO 8601
    settledByUserId: string,  // UUID from x-user-id
    // ... invoice fields
  }
}
```

**Business Rules:**
- Invoice must be in UNPAID status
- Creates RECEIPT ledger entry
- Creates Payment record (CREDIT payment)
- Settle is atomic (transaction)

**Error Codes:**
- `400`: Invoice is not UNPAID, validation errors
- `401`: Missing or invalid auth headers
- `403`: Missing SETTLE_INVOICE permission, store ownership violation
- `404`: Invoice not found
- `409`: RECEIPT ledger entry already exists (idempotency guard)

---

### POST /invoices/:invoiceId/cancel

**Purpose:** Cancel an invoice (any status → CANCELLED)

**Authentication:** Required (`AuthGuard`)

**Permissions:** `CANCEL_INVOICE`

**Request Headers:**
- `x-user-id`: UUID
- `x-store-id`: UUID
- `x-role`: OWNER | MANAGER (must have CANCEL_INVOICE permission)

**Request Body:**
```typescript
{
  operatorId: string,        // UUID - must match x-user-id (optional, validated)
  storeId: string            // UUID - must match x-store-id (optional, validated)
}
```

**Response:** `200 OK`
```typescript
{
  success: true,
  data: {
    id: string,
    status: "CANCELLED",
    previousStatus: string,   // Previous status
    cancelledAt: string,       // ISO 8601
    cancelledByUserId: string, // UUID from x-user-id
    // ... invoice fields
  }
}
```

**Business Rules:**
- Invoice can be cancelled from any status
- Cancellation is atomic (transaction)
- No ledger entries created for cancellation
- No payment records created for cancellation

**Error Codes:**
- `400`: Validation errors
- `401`: Missing or invalid auth headers
- `403`: Missing CANCEL_INVOICE permission, store ownership violation
- `404`: Invoice not found

---

## Ledger API

### GET /ledger

**Purpose:** Get ledger entries (read-only, append-only financial events)

**Authentication:** Required (`AuthGuard`)

**Permissions:** `VIEW_LEDGER`

**Request Headers:**
- `x-user-id`: UUID
- `x-store-id`: UUID
- `x-role`: OWNER | MANAGER | CASHIER | AUDITOR (must have VIEW_LEDGER permission)

**Query Parameters:**
- `storeId`: UUID (optional, validated against x-store-id)
- `operatorId`: UUID (optional, validated against x-user-id)
- `fromDate`: ISO 8601 date string (optional) - inclusive start date
- `toDate`: ISO 8601 date string (optional) - inclusive end date
- `export`: `"csv"` (optional) - if provided, returns CSV instead of JSON

**Date Range Filtering:**
- If `fromDate` provided: `createdAt >= fromDate`
- If `toDate` provided: `createdAt <= toDate` (end of day: 23:59:59.999)
- If both provided: `fromDate <= createdAt <= toDate`
- If neither provided: return all entries

**Response (JSON mode):** `200 OK`
```typescript
{
  success: true,
  data: Array<{
    id: string,
    type: "SALE" | "RECEIPT",
    amount: number,           // Decimal as number
    createdAt: string         // ISO 8601
  }>
}
```

**Response (CSV mode):** `200 OK`
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="ledger.csv"`
- CSV format: `Date,Type,Amount`
- No totals, no grouping, plain values only

**Business Rules:**
- Ledger is append-only (no updates, no deletes)
- Only entries for the authenticated user's store are returned
- Ordered by `createdAt DESC` (most recent first)
- No calculations, no totals, no balances

**Error Codes:**
- `400`: Validation errors, store/operator ID mismatch
- `401`: Missing or invalid auth headers
- `403`: Missing VIEW_LEDGER permission

---

## Customers API

### GET /customers

**Purpose:** Get list of all customers

**Authentication:** Not required

**Permissions:** None

**Request Headers:** None

**Response:** `200 OK`
```typescript
{
  success: true,
  data: Array<{
    id: string,
    name: string,
    isGuest: boolean,
    storeName: string
  }>
}
```

---

### GET /customers/:customerId/statement

**Purpose:** Get customer statement (invoices and financial summary)

**Authentication:** Not required

**Permissions:** None

**Request Headers:** None

**Path Parameters:**
- `customerId`: UUID

**Response:** `200 OK`
```typescript
{
  success: true,
  data: {
    customer: {
      id: string,
      name: string,
      isGuest: boolean,
      createdAt: string,
      store: {
        id: string,
        name: string
      }
    },
    summary: {
      totalInvoices: number,
      draftInvoices: number,
      issuedInvoices: number,
      unpaidInvoices: number,
      paidInvoices: number,
      cancelledInvoices: number,
      outstandingBalance: number,  // Sum of UNPAID invoices
      totalSales: number,           // Sum of PAID invoices
      totalAmount: number           // Sum of UNPAID + PAID invoices
    },
    invoices: Array<{
      id: string,
      status: string,
      totalAmount: number,
      createdAt: string,
      createdBy: {
        id: string,
        email: string
      },
      items: Array<{
        id: string,
        product: {
          id: string,
          name: string,
          price: number
        },
        quantity: number,
        unitPrice: number,
        subtotal: number
      }>
    }>
  }
}
```

**Error Codes:**
- `404`: Customer not found

---

## Health Check

### GET /

**Purpose:** Health check endpoint

**Authentication:** Not required

**Permissions:** None

**Request Headers:** None

**Response:** `200 OK`
```
"Hello World!"
```

---

## Contract Freeze Notes

⚠️ **FROZEN CONTRACTS**: The following are explicitly frozen and must not change without version bump:

1. **Invoice Lifecycle**: DRAFT → ISSUED → UNPAID/PAID → CANCELLED
2. **Payment Types**: CASH | CREDIT (enum values)
3. **Ledger Entry Types**: SALE | RECEIPT (enum values)
4. **Payment Model**: One payment per invoice (immutable)
5. **Ledger Model**: Append-only, one SALE per invoice, one RECEIPT per invoice
6. **Error Response Format**: `{ success: false, error: { code, message } }`
7. **Success Response Format**: `{ success: true, data: ... }`
8. **Auth Headers**: `x-user-id`, `x-store-id`, `x-role`
9. **Role Enum**: OWNER | MANAGER | CASHIER | AUDITOR
10. **Permission Enum**: ISSUE_INVOICE | SETTLE_INVOICE | CANCEL_INVOICE | VIEW_LEDGER | VIEW_REPORTS

---

**End of API Contract**

