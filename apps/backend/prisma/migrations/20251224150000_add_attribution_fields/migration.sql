-- Add attribution fields to invoices table
-- These fields track who performed critical financial operations

ALTER TABLE "invoices" 
ADD COLUMN IF NOT EXISTS "issuedByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "settledByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "cancelledByUserId" TEXT;

-- Add foreign key constraints
ALTER TABLE "invoices"
ADD CONSTRAINT "invoices_issuedByUserId_fkey" 
  FOREIGN KEY ("issuedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices"
ADD CONSTRAINT "invoices_settledByUserId_fkey" 
  FOREIGN KEY ("settledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices"
ADD CONSTRAINT "invoices_cancelledByUserId_fkey" 
  FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

