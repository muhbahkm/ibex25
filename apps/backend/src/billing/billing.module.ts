import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { SubscriptionsService } from './subscriptions.service';
import { PricingService } from './pricing.service';
import { BillingAccountService } from './billing-account.service';
import { BillingStatusGuard } from './guards/billing-status.guard';
import { BillingController } from './billing.controller';
import { PrismaService } from '../prisma.service';

/**
 * Billing Module
 *
 * B1: Foundation for billing and plans.
 * B2: Extended with pricing and billing cycles (read-only).
 * B3: Extended with internal billing control layer (provider-agnostic).
 * This module provides plan definitions, store subscriptions, pricing, billing accounts, and enforcement.
 *
 * ⚠️ FOUNDATION ONLY: No payments, no charging logic, no enforcement of expirations.
 * ⚠️ B3: Provider-agnostic - no Stripe SDK, no webhooks, no external API calls.
 */
@Module({
  providers: [
    PlansService,
    SubscriptionsService,
    PricingService,
    BillingAccountService,
    BillingStatusGuard,
    PrismaService,
  ],
  controllers: [BillingController],
  exports: [
    PlansService,
    SubscriptionsService,
    PricingService,
    BillingAccountService,
    BillingStatusGuard,
  ],
})
export class BillingModule {}
