# IBEX Backend API Documentation

## System Overview

### What IBEX Backend Does

IBEX backend is a sales management system for retail businesses. It provides:

- **Invoice Management**: Create sales invoices with product items
- **Customer Management**: Track customer transactions and credit
- **Product Catalog**: Manage products with pricing and stock
- **Stock Management**: Automatic stock deduction on invoice creation
- **Credit Tracking**: Track customer outstanding balances through unpaid invoices
- **Invoice Settlement**: Record payment for unpaid invoices

### What IBEX Backend Does NOT Do

- Double-entry accounting
- Ledger or chart of accounts
- Tax and VAT calculations
- Complex inventory management (no reorder points, suppliers, etc.)
- Payment gateway integrations
- Offline mode
- Partial payments
- Payment history or payment methods

## Core Modules

### Invoices

Handles sales invoice creation and settlement. Each invoice contains:
- Products with quantities and prices
- Customer association (optional for guest sales)
- Status: PAID, UNPAID, or CANCELLED
- Automatic stock deduction on creation
- Total amount calculation

**Key Rules:**
- Invoices without a customer are automatically marked as PAID
- Invoices with a customer are automatically marked as UNPAID
- Stock is validated and decremented atomically during invoice creation
- Invoice amounts are calculated from current product prices

### Customers

Manages customer information and provides statement generation. Customers can be:
- Registered customers (linked to invoices)
- Guest customers (one-time sales)

**Key Rules:**
- Customers belong to a store
- Customer statements aggregate all invoices
- Outstanding balance is calculated from UNPAID invoices only

### Products

Product catalog with pricing and stock management. Products:
- Belong to a store
- Have a price and stock quantity
- Stock is automatically decremented when included in invoices
- Prices are stored at invoice creation time (in invoice items)

**Key Rules:**
- Stock validation occurs before invoice creation
- Product prices are captured in invoice items (price at time of sale)
- Stock cannot go negative

## Sales & Credit Flow

### Invoice Creation

1. **Request**: Client sends invoice creation request with products and quantities
2. **Validation**: System validates:
   - Products exist and belong to the store
   - Stock is available for all requested quantities
3. **Calculation**: System calculates total amount from current product prices
4. **Status Assignment**:
   - If `customerId` is null → Status = PAID (guest sale)
   - If `customerId` is provided → Status = UNPAID (credit sale)
5. **Creation**: Invoice is created with items, and stock is decremented atomically
6. **Response**: Created invoice is returned with all details

### UNPAID vs PAID

- **UNPAID**: Invoice is created with a customer, representing credit extended
- **PAID**: Invoice is either:
  - Created without a customer (guest sale, immediate payment)
  - Settled later (UNPAID → PAID transition)

### Customer Statement

The statement aggregates all customer invoices and provides:
- Customer information
- Summary statistics (total invoices, unpaid count, paid count, outstanding balance)
- Complete invoice list with items and details

**Outstanding Balance**: Sum of all UNPAID invoice amounts for the customer.

### Settlement

Settlement records that an UNPAID invoice has been paid:

1. **Validation**: System checks invoice exists and is UNPAID
2. **Status Change**: Invoice status changes from UNPAID → PAID
3. **Response**: Returns settlement confirmation with timestamps

**Rules:**
- Only UNPAID invoices can be settled
- PAID invoices cannot be settled again
- CANCELLED invoices cannot be settled
- Invoice amount is never modified

## API Endpoints

### POST /invoices

Creates a new sales invoice.

**Purpose**: Record a sale transaction with products, optionally linked to a customer.

**Important Rules:**
- All products must exist and belong to the specified store
- Stock must be available for all requested quantities
- If `customerId` is null, invoice is marked PAID (guest sale)
- If `customerId` is provided, invoice is marked UNPAID (credit sale)
- Stock is decremented atomically during invoice creation
- Invoice total is calculated from current product prices
- Product prices are stored in invoice items (snapshot at creation time)

**Notes:**
- Transaction ensures all-or-nothing: if stock update fails, invoice creation fails
- Returns created invoice with items, customer, and product details

### POST /invoices/:invoiceId/settle

Settles an unpaid invoice, marking it as paid.

**Purpose**: Record that a customer has paid their outstanding invoice.

**Important Rules:**
- Only invoices with status UNPAID can be settled
- PAID invoices cannot be settled again (returns 400)
- CANCELLED invoices cannot be settled (returns 400)
- Invoice amount is never modified
- Status changes from UNPAID → PAID

**Notes:**
- Returns settlement confirmation with previous status, current status, and timestamp
- Does not modify invoice amount or items
- Does not create payment records

### GET /customers/:customerId/statement

Retrieves a customer's account statement.

**Purpose**: Get complete view of customer's transaction history and credit status.

**Important Rules:**
- Customer must exist (returns 404 if not found)
- Returns all invoices for the customer, ordered by creation date (newest first)
- Outstanding balance is sum of UNPAID invoice amounts
- Total sales is sum of PAID invoice amounts

**Notes:**
- Includes complete invoice details with items and products
- Summary provides counts and totals for quick overview
- Statement is calculated in real-time from invoice status

## Design Principles

### Backend-First Architecture

All business logic lives in the backend. Frontend is a presentation layer only.

### Monolithic Structure

Single backend API containing all business logic. No microservices.

### Database Access Through Prisma

All database operations use Prisma ORM. No raw SQL queries in application code.

### Transaction Safety

Critical operations (invoice creation) use database transactions to ensure atomicity.

### Status-Based State Management

Invoice status (PAID, UNPAID, CANCELLED) drives business logic and calculations.

### Unified API Responses

All responses follow consistent structure:
- Success: `{ success: true, data: ... }`
- Error: `{ success: false, error: { code: "...", message: "..." } }`

### No Data Modification on Settlement

Settlement only changes status. Invoice amounts, items, and timestamps remain unchanged.

