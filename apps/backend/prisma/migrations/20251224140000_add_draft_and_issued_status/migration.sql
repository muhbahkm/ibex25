-- AlterEnum: Add DRAFT and ISSUED to InvoiceStatus enum
-- Note: PostgreSQL requires separate ALTER TYPE commands for each value
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'ISSUED';

-- Migration Strategy:
-- Existing UNPAID invoices remain UNPAID (they were already issued and have financial impact)
-- Existing PAID invoices remain PAID
-- Existing CANCELLED invoices remain CANCELLED
-- New invoices will default to DRAFT (handled by Prisma schema @default(DRAFT))
--
-- No data migration needed - existing invoices maintain their current state
-- The new DRAFT and ISSUED states are for new invoices going forward

