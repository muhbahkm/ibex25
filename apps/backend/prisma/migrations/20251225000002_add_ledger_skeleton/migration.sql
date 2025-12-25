-- CreateEnum: Add LedgerEntryType enum
CREATE TYPE "LedgerEntryType" AS ENUM ('SALE', 'RECEIPT');

-- CreateTable: LedgerEntry model
-- This is an append-only financial chronicle
-- No uniqueness constraints, no balance fields, no derived fields
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: Link ledger entry to store
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Link ledger entry to invoice
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration Strategy:
-- Ledger entries will be created in future phases (F2)
-- This is a skeleton structure only
-- Append-only: no updates, no deletes
-- No calculations, no balances, no reports

