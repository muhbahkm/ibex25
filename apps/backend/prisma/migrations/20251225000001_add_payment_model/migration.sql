-- Ensure PaymentType enum exists (should already exist from E1 migration, but safe check)
-- This is a defensive check in case E1 migration wasn't applied
DO $$ BEGIN
    CREATE TYPE "PaymentType" AS ENUM ('CASH', 'CREDIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: Payment model
-- This is an append-only financial log
-- One payment per invoice (enforced by unique constraint on invoiceId)
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Ensure one payment per invoice
CREATE UNIQUE INDEX "payments_invoiceId_key" ON "payments"("invoiceId");

-- AddForeignKey: Link payment to store
ALTER TABLE "payments" ADD CONSTRAINT "payments_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Link payment to invoice
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration Strategy:
-- Payment records will be created:
-- 1. At issue() time for CASH payments (immediate payment)
-- 2. At settle() time for CREDIT payments (deferred payment)
-- Payment is immutable - no updates or deletes allowed
-- All payment amounts are derived from invoice.totalAmount

