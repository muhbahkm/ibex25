import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { SubscriptionsService } from './subscriptions.service';
import { PricingService } from './pricing.service';
import { BillingController } from './billing.controller';
import { PrismaService } from '../prisma.service';

/**
 * Billing Module
 *
 * B1: Foundation for billing and plans.
 * B2: Extended with pricing and billing cycles (read-only).
 * This module provides plan definitions, store subscriptions, pricing, and soft enforcement.
 *
 * ⚠️ FOUNDATION ONLY: No payments, no charging logic, no enforcement of expirations.
 */
@Module({
  providers: [PlansService, SubscriptionsService, PricingService, PrismaService],
  controllers: [BillingController],
  exports: [PlansService, SubscriptionsService, PricingService],
})
export class BillingModule {}

