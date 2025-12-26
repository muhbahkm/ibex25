import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma.service';
import { BillingProvider, BillingCycle } from '@prisma/client';
import { StripeCustomerService } from './stripe-customer.service';

/**
 * Stripe Subscription Service
 *
 * B4: Manages Stripe subscription creation and linking to internal billing accounts.
 *
 * Responsibilities:
 * - Create Stripe subscription for selected plan + billing cycle
 * - Map Plan → Stripe Price ID
 * - Store stripeSubscriptionId and current price ID
 * - DO NOT activate BillingAccount here (Stripe success ≠ active system access)
 *
 * ⚠️ Stripe subscription creation does NOT automatically activate billing account.
 * Webhooks will handle state synchronization.
 */
@Injectable()
export class StripeSubscriptionService {
  private readonly logger = new Logger(StripeSubscriptionService.name);
  private readonly stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private stripeCustomerService: StripeCustomerService,
    stripeSecretKey?: string,
  ) {
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-12-15.clover',
      });
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY not provided. Stripe operations will be disabled.',
      );
    }
  }

  /**
   * Create Stripe subscription for a store
   *
   * Creates a Stripe subscription and links it to the internal billing account.
   * Does NOT activate the billing account - webhooks will handle that.
   *
   * @param storeId - Store ID
   * @param planId - Plan ID
   * @param billingCycle - Billing cycle (MONTHLY or YEARLY)
   * @param stripePriceId - Stripe Price ID (must be configured per plan)
   * @returns Stripe subscription ID
   */
  async createSubscription(
    storeId: string,
    planId: string,
    billingCycle: BillingCycle,
    stripePriceId: string,
  ): Promise<string> {
    if (!this.stripe) {
      throw new Error(
        'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.',
      );
    }

    // Get or create Stripe customer
    const stripeCustomerId = await this.stripeCustomerService.createOrGetCustomer(
      storeId,
    );

    // Get billing account
    const billingAccount = await this.prisma.billingAccount.findUnique({
      where: { storeId },
      include: { externalRef: true, plan: true },
    });

    if (!billingAccount) {
      throw new BadRequestException(
        `Billing account not found for store ${storeId}`,
      );
    }

    // Verify plan matches
    if (billingAccount.currentPlanId !== planId) {
      throw new BadRequestException(
        `Plan mismatch: billing account has plan ${billingAccount.currentPlanId}, but ${planId} was requested`,
      );
    }

    // Check if subscription already exists
    if (billingAccount.externalRef?.externalSubscriptionId) {
      this.logger.warn(
        `Stripe subscription already exists for store ${storeId}: ${billingAccount.externalRef.externalSubscriptionId}`,
      );
      return billingAccount.externalRef.externalSubscriptionId;
    }

    // Create Stripe subscription
    const subscription = await this.stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price: stripePriceId,
        },
      ],
      metadata: {
        storeId,
        planId,
        billingCycle,
      },
      expand: ['latest_invoice.payment_intent'],
    });

    this.logger.log(
      `Created Stripe subscription ${subscription.id} for store ${storeId} (plan: ${planId}, cycle: ${billingCycle})`,
    );

    // Update ExternalBillingRef with subscription ID
    if (billingAccount.externalRef) {
      await this.prisma.externalBillingRef.update({
        where: { billingAccountId: billingAccount.id },
        data: {
          provider: BillingProvider.STRIPE,
          externalSubscriptionId: subscription.id,
          syncStatus: 'PENDING', // Will be synced via webhook
          lastSyncedAt: new Date(),
        },
      });
    } else {
      await this.prisma.externalBillingRef.create({
        data: {
          billingAccountId: billingAccount.id,
          provider: BillingProvider.STRIPE,
          externalCustomerId: stripeCustomerId,
          externalSubscriptionId: subscription.id,
          syncStatus: 'PENDING',
          lastSyncedAt: new Date(),
        },
      });
    }

    return subscription.id;
  }

  /**
   * Cancel Stripe subscription
   *
   * Cancels the Stripe subscription immediately.
   * Does NOT cancel the internal billing account - webhooks will handle that.
   *
   * @param storeId - Store ID
   * @returns Stripe subscription ID
   */
  async cancelSubscription(storeId: string): Promise<string> {
    if (!this.stripe) {
      throw new Error(
        'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.',
      );
    }

    const billingAccount = await this.prisma.billingAccount.findUnique({
      where: { storeId },
      include: { externalRef: true },
    });

    if (!billingAccount?.externalRef?.externalSubscriptionId) {
      throw new BadRequestException(
        `No Stripe subscription found for store ${storeId}`,
      );
    }

    // Cancel subscription at period end (immediate cancellation)
    const subscription = await this.stripe.subscriptions.cancel(
      billingAccount.externalRef.externalSubscriptionId,
    );

    this.logger.log(
      `Cancelled Stripe subscription ${subscription.id} for store ${storeId}`,
    );

    // Update sync status
    await this.prisma.externalBillingRef.update({
      where: { billingAccountId: billingAccount.id },
      data: {
        syncStatus: 'PENDING',
        lastSyncedAt: new Date(),
      },
    });

    return subscription.id;
  }

  /**
   * Get Stripe subscription ID for a store
   *
   * @param storeId - Store ID
   * @returns Stripe subscription ID or null if not found
   */
  async getSubscriptionId(storeId: string): Promise<string | null> {
    const billingAccount = await this.prisma.billingAccount.findUnique({
      where: { storeId },
      include: { externalRef: true },
    });

    return billingAccount?.externalRef?.externalSubscriptionId || null;
  }
}

