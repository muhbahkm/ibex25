# IBEX (آيبكس)

A cloud-first Sales Engine for retail businesses.

## What is IBEX?

IBEX is a focused sales management system designed for supermarkets and small retail stores. It provides:

- **Sales Invoice Management**: Create and track sales invoices
- **Customer Management**: Support for registered and guest customers
- **Product Catalog**: Manage products with pricing and stock
- **Basic Inventory**: Automatic stock deduction on invoice creation
- **Credit Tracking**: Simple credit management through unpaid invoices

## What IBEX Is NOT

IBEX is **NOT** a full accounting system. It does not include:

- ❌ Double-entry accounting
- ❌ Ledger / chart of accounts
- ❌ Tax and VAT calculations
- ❌ Complex inventory management
- ❌ Offline mode
- ❌ Payment gateway integrations (in MVP)

## Current Status: STEP 1 - Foundation

This repository contains the initial foundation of IBEX:

- ✅ NestJS backend API structure
- ✅ Prisma ORM setup with PostgreSQL
- ✅ Core domain models (Store, User, Customer, Product, Invoice, InvoiceItem)
- ✅ Basic project structure

**Next steps will be added incrementally.**

## Architecture

- **Backend-First**: All business logic lives in the backend
- **Monolithic API**: Single NestJS backend
- **Database**: PostgreSQL with Prisma ORM
- **Language**: TypeScript only
- **Cloud-First**: Designed for cloud deployment

See [docs/architecture.md](./docs/architecture.md) for detailed architecture documentation.

## Project Structure

```
ibex25/
├── apps/
│   └── backend/          # NestJS backend API
│       ├── prisma/       # Prisma schema
│       └── src/          # Application code
├── docs/                 # Documentation
│   ├── vision.md         # Project vision
│   └── architecture.md   # Architecture details
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (local instance)
- npm or yarn

### Setup

1. **Install dependencies**:
   ```bash
   cd apps/backend
   npm install
   ```

2. **Configure database**:
   - Create a `.env` file in `apps/backend/`
   - Set `DATABASE_URL` to your PostgreSQL connection string:
     ```
     DATABASE_URL="postgresql://user:password@localhost:5432/ibex?schema=public"
     ```

3. **Run Prisma migrations**:
   ```bash
   cd apps/backend
   npm run prisma:migrate
   ```

4. **Generate Prisma Client**:
   ```bash
   npm run prisma:generate
   ```

5. **Start the development server**:
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:3000`

## Development

- **Start dev server**: `npm run start:dev`
- **Build**: `npm run build`
- **Run tests**: `npm run test`
- **Prisma Studio**: `npm run prisma:studio`

## Documentation

- [Vision](./docs/vision.md) - Project vision and goals
- [Architecture](./docs/architecture.md) - Technical architecture details

## License

UNLICENSED - Private project

