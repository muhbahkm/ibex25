-- CreateEnum
CREATE TYPE "SubscriptionState" AS ENUM ('ACTIVE', 'PAST_DUE', 'GRACE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('STRIPE', 'MANUAL', 'NONE');

-- CreateTable
CREATE TABLE "billing_accounts" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "currentPlanId" TEXT NOT NULL,
    "status" "SubscriptionState" NOT NULL DEFAULT 'ACTIVE',
    "billingState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_billing_refs" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL DEFAULT 'NONE',
    "externalCustomerId" TEXT,
    "externalSubscriptionId" TEXT,
    "syncStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_billing_refs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_accounts_storeId_key" ON "billing_accounts"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "external_billing_refs_billingAccountId_key" ON "external_billing_refs"("billingAccountId");

-- AddForeignKey
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_currentPlanId_fkey" FOREIGN KEY ("currentPlanId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_billing_refs" ADD CONSTRAINT "external_billing_refs_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

