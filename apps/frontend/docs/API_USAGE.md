# Frontend API Usage

**Version:** v0.2-contract-frozen  
**Last Updated:** 2024-12-25  
**Status:** FROZEN - Documents current frontend API usage

⚠️ **CONTRACT FROZEN**: This document describes which frontend screens use which endpoints and which permissions gate which UI elements.

---

## Table of Contents

1. [Dashboard Page (`/`)](#dashboard-page-)
2. [Ledger Page (`/ledger`)](#ledger-page-ledger)
3. [Permission Gating](#permission-gating)

---

## Dashboard Page (`/`)

**Route:** `/`  
**Component:** `apps/frontend/app/page.tsx`

### Endpoints Used

#### GET /customers

**Purpose:** Fetch list of all customers for dropdown selection

**Usage:**
```typescript
const customers = await fetchCustomers()
```

**Response:** `CustomerSummary[]`
```typescript
Array<{
  id: string
  name: string
  isGuest: boolean
  storeName: string
}>
```

**When:** On page load (initial mount)

**Error Handling:** Displays error message in UI

---

#### GET /customers/:customerId/statement

**Purpose:** Fetch customer statement (invoices and financial summary)

**Usage:**
```typescript
const statement = await fetchCustomerStatement(customerId)
```

**Response:** `CustomerStatement`
```typescript
{
  summary: {
    totalInvoices: number
    unpaidInvoices: number
    paidInvoices: number
    cancelledInvoices: number
    outstandingBalance: number
    totalSales: number
    totalAmount: number
  }
  invoices: Array<{
    id: string
    status: string
    totalAmount: number
    createdAt: string
  }>
}
```

**When:** 
- On page load (if customers exist, selects first customer)
- When user selects a different customer from dropdown

**Error Handling:** Displays error message in UI

---

#### POST /invoices/:invoiceId/settle

**Purpose:** Settle an UNPAID invoice

**Usage:**
```typescript
await settleInvoice(invoiceId)
```

**Request Body:**
```typescript
{
  operatorId: string,  // From auth context
  storeId: string      // From auth context
}
```

**Headers Required:**
- `x-user-id`: From auth context
- `x-store-id`: From auth context
- `x-role`: From auth context

**Response:** `200 OK`
```typescript
{
  success: true,
  data: {
    invoiceId: string
    previousStatus: "UNPAID"
    currentStatus: "PAID"
    settledAt: string
  }
}
```

**When:** User clicks "تسوية" (Settle) button on an UNPAID invoice

**Permission Gating:** 
- Button only visible if `hasPermission('SETTLE_INVOICE')`
- Wrapped in `<RequirePermission permission="SETTLE_INVOICE">`

**Error Handling:** Displays error message in UI

---

### UI Components

#### Stats Cards

**Visibility:** Gated by `VIEW_REPORTS` permission

**Component:** Wrapped in `<RequirePermission permission="VIEW_REPORTS">`

**Data Source:** Calculated from `CustomerStatement.summary`

**Cards:**
1. **إجمالي المبيعات** (Total Sales): `summary.totalSales`
2. **الرصيد غير المسدد** (Outstanding Balance): `summary.outstandingBalance`
3. **إجمالي الفواتير** (Total Invoices): `summary.totalInvoices`

---

#### Invoice Table

**Visibility:** Always visible (if statement exists)

**Data Source:** `CustomerStatement.invoices`

**Columns:**
- التاريخ (Date): `formatDate(invoice.createdAt)`
- الحالة (Status): `invoice.status`
- المبلغ الإجمالي (Total Amount): `formatCurrency(invoice.totalAmount)`
- الإجراء (Action): Settle button (if UNPAID and has permission)

**Permission Gating:**
- Settle button: `hasPermission('SETTLE_INVOICE')`

---

## Ledger Page (`/ledger`)

**Route:** `/ledger`  
**Component:** `apps/frontend/app/ledger/page.tsx`

### Endpoints Used

#### GET /ledger

**Purpose:** Fetch ledger entries (SALE and RECEIPT events)

**Usage:**
```typescript
const entries = await fetchLedgerEntries(
  user.storeId,
  user.id,
  fromDateISO,  // Optional
  toDateISO     // Optional
)
```

**Query Parameters:**
- `storeId`: From auth context
- `operatorId`: From auth context (user.id)
- `fromDate`: ISO 8601 string (optional, from date input)
- `toDate`: ISO 8601 string (optional, from date input)

**Headers Required:**
- `x-user-id`: From auth context
- `x-store-id`: From auth context
- `x-role`: From auth context

**Response:** `LedgerEntry[]`
```typescript
Array<{
  id: string
  type: "SALE" | "RECEIPT"
  amount: number
  createdAt: string
}>
```

**When:** 
- On page load
- When user clicks "تصفية" (Filter) button
- When user clicks "مسح" (Clear) button

**Permission Gating:** 
- Entire page wrapped in `<RequirePermission permission="VIEW_LEDGER">`
- If permission missing, page renders nothing (no redirect)

**Error Handling:** Displays error message in UI

---

#### GET /ledger?export=csv

**Purpose:** Export ledger entries as CSV

**Usage:**
```typescript
// Direct fetch (not via api.ts)
const url = `${baseUrl}/ledger?storeId=${storeId}&operatorId=${operatorId}&export=csv&fromDate=${fromDate}&toDate=${toDate}`
const csv = await fetch(url).then(res => res.text())
// Trigger download via blob
```

**Query Parameters:**
- `storeId`: From auth context
- `operatorId`: From auth context
- `fromDate`: ISO 8601 string (optional, from date input)
- `toDate`: ISO 8601 string (optional, from date input)
- `export`: `"csv"`

**Headers Required:**
- `x-user-id`: From auth context
- `x-store-id`: From auth context
- `x-role`: From auth context

**Response:** `200 OK`
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="ledger.csv"`
- CSV body: `Date,Type,Amount`

**When:** User clicks "تصدير CSV" (Export CSV) button

**Permission Gating:** 
- Button only visible if user has `VIEW_LEDGER` permission (page is permission-gated)

**Error Handling:** Displays error message in UI

---

### UI Components

#### Date Range Filter

**Component:** Form with two date inputs and buttons

**Fields:**
- **من تاريخ** (From Date): `fromDate` state
- **إلى تاريخ** (To Date): `toDate` state

**Buttons:**
- **تصفية** (Filter): Submits form, triggers `fetchLedgerEntries` with dates
- **مسح** (Clear): Clears dates, refetches all entries

**Behavior:**
- No auto-fetch on typing (explicit submit required)
- Empty dates → fetch all entries
- Dates converted to ISO format before API call

---

#### Ledger Table

**Visibility:** Always visible (if permission granted)

**Data Source:** `LedgerEntry[]` from API

**Columns:**
- التاريخ (Date): `formatDate(entry.createdAt)`
- النوع (Type): `"بيع"` (SALE) or `"تحصيل"` (RECEIPT)
- المبلغ (Amount): `formatCurrency(entry.amount) + " ر.س"`

**States:**
- Loading: "جاري تحميل البيانات..." (Loading data...)
- Empty: "لا توجد حركات مالية" (No financial movements)
- Error: Error message displayed above table

---

## Permission Gating

### Permission-Aware Components

All permission checks use the `<RequirePermission>` component, which:
- Wraps UI elements that require specific permissions
- Renders children if permission granted
- Renders `fallback` (or `null`) if permission denied
- Uses `useAuth().hasPermission()` internally

### Permission Mapping

Permissions are derived from role using `getPermissionsForRole()`:

- **OWNER**: All permissions
- **MANAGER**: `ISSUE_INVOICE`, `SETTLE_INVOICE`, `CANCEL_INVOICE`, `VIEW_LEDGER`, `VIEW_REPORTS`
- **CASHIER**: `ISSUE_INVOICE`, `VIEW_LEDGER`
- **AUDITOR**: `VIEW_LEDGER`, `VIEW_REPORTS`

### Gated UI Elements

#### Dashboard (`/`)

1. **Stats Cards**: `<RequirePermission permission="VIEW_REPORTS">`
   - If permission missing: Cards not rendered

2. **Settle Invoice Button**: `<RequirePermission permission="SETTLE_INVOICE">`
   - If permission missing: Button not rendered
   - Only visible for UNPAID invoices

#### Ledger (`/ledger`)

1. **Entire Page**: `<RequirePermission permission="VIEW_LEDGER">`
   - If permission missing: Page renders nothing (no redirect)

2. **Export CSV Button**: Always visible (page is permission-gated)
   - Requires `VIEW_LEDGER` permission (inherited from page)

---

## Auth Context

### Mock User (Current Implementation)

**Location:** `apps/frontend/auth/AuthProvider.tsx`

**Current Mock:**
```typescript
{
  id: 'mock-user-id',
  name: 'مدير النظام',
  role: Role.MANAGER,
  permissions: getPermissionsForRole(Role.MANAGER),
  storeId: 'mock-store-id'
}
```

**Note:** This is a scaffold. Real authentication will be implemented in future phases.

### Auth Headers

When making API calls, the frontend should send:
- `x-user-id`: `user.id`
- `x-store-id`: `user.storeId`
- `x-role`: `user.role`

**Current Status:** Headers are not yet sent from frontend (backend accepts them but frontend doesn't send them yet). This is a known gap that will be addressed in future phases.

---

## Error Handling

### Error Display

All API errors are caught and displayed in the UI:
- Dashboard: Error message displayed above invoice table
- Ledger: Error message displayed above ledger table

### Error Format

Frontend expects errors in this format:
```typescript
{
  success: false,
  error: {
    code: string
    message: string
  }
}
```

If error format differs, frontend shows generic error message.

---

## Contract Freeze Notes

⚠️ **FROZEN CONTRACTS**: The following frontend API usage patterns are frozen:

1. **Permission Gating**: All permission checks use `<RequirePermission>` component
2. **Error Handling**: Errors displayed in UI, no redirects on permission denial
3. **Date Formatting**: Uses `formatDate()` and `formatCurrency()` utilities
4. **API Functions**: All API calls go through `apps/frontend/lib/api.ts`
5. **Auth Context**: Uses `useAuth()` hook from `apps/frontend/auth/useAuth.ts`
6. **Role-Permission Mapping**: Must match backend mapping in `apps/backend/src/auth/role-permissions.ts`

---

**End of Frontend API Usage Documentation**

