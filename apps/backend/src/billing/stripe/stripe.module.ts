import { Module } from '@nestjs/common';
import { StripeCustomerService } from './stripe-customer.service';
import { StripeSubscriptionService } from './stripe-subscription.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { BillingAccountService } from '../billing-account.service';
import { PrismaService } from '../../prisma.service';

/**
 * Stripe Module
 *
 * B4: Provides Stripe integration services and webhook handling.
 *
 * This module is configured based on environment variables.
 * If Stripe keys are not provided, services will log warnings but not fail.
 */
@Module({
  controllers: [StripeWebhookController],
  providers: [
    {
      provide: StripeCustomerService,
      useFactory: (prisma: PrismaService) => {
        return new StripeCustomerService(
          prisma,
          process.env.STRIPE_SECRET_KEY,
        );
      },
      inject: [PrismaService],
    },
    {
      provide: StripeSubscriptionService,
      useFactory: (
        prisma: PrismaService,
        customerService: StripeCustomerService,
      ) => {
        return new StripeSubscriptionService(
          prisma,
          customerService,
          process.env.STRIPE_SECRET_KEY,
        );
      },
      inject: [PrismaService, StripeCustomerService],
    },
    {
      provide: 'STRIPE_WEBHOOK_SECRET',
      useValue: process.env.STRIPE_WEBHOOK_SECRET,
    },
    BillingAccountService,
    PrismaService,
  ],
  exports: [StripeCustomerService, StripeSubscriptionService],
})
export class StripeModule {}

