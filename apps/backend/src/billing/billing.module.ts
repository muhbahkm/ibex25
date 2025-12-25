import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { SubscriptionsService } from './subscriptions.service';
import { BillingController } from './billing.controller';
import { PrismaService } from '../prisma.service';

/**
 * Billing Module
 *
 * B1: Foundation for billing and plans.
 * This module provides plan definitions, store subscriptions, and soft enforcement.
 *
 * ⚠️ FOUNDATION ONLY: No payments, no billing cycles, no charging logic.
 */
@Module({
  providers: [PlansService, SubscriptionsService, PrismaService],
  controllers: [BillingController],
  exports: [PlansService, SubscriptionsService],
})
export class BillingModule {}

