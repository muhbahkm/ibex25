import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma.service';
import { BillingProvider } from '@prisma/client';

/**
 * Stripe Customer Service
 *
 * B4: Manages Stripe customer creation and linking to internal billing accounts.
 *
 * Responsibilities:
 * - Create Stripe Customer per store
 * - Store stripeCustomerId in ExternalBillingRef
 * - Ensure 1:1 mapping between Store ↔ Stripe Customer
 *
 * ⚠️ NO side effects outside billing domain.
 */
@Injectable()
export class StripeCustomerService {
  private readonly logger = new Logger(StripeCustomerService.name);
  private readonly stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    stripeSecretKey?: string,
  ) {
    // Initialize Stripe client if key is provided
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
   * Create or get Stripe customer for a store
   *
   * Ensures 1:1 mapping between Store ↔ Stripe Customer.
   * If customer already exists, returns existing customer ID.
   *
   * @param storeId - Store ID
   * @param email - Store owner email (optional)
   * @param metadata - Additional metadata for Stripe customer
   * @returns Stripe customer ID
   */
  async createOrGetCustomer(
    storeId: string,
    email?: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    if (!this.stripe) {
      throw new Error(
        'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.',
      );
    }

    // Check if customer already exists in ExternalBillingRef
    const billingAccount = await this.prisma.billingAccount.findUnique({
      where: { storeId },
      include: { externalRef: true },
    });

    if (!billingAccount) {
      throw new Error(
        `Billing account not found for store ${storeId}. Create billing account first.`,
      );
    }

    // If customer already exists, return it
    if (billingAccount.externalRef?.externalCustomerId) {
      this.logger.log(
        `Stripe customer already exists for store ${storeId}: ${billingAccount.externalRef.externalCustomerId}`,
      );
      return billingAccount.externalRef.externalCustomerId;
    }

    // Create Stripe customer
    const stripeCustomer = await this.stripe.customers.create({
      email,
      metadata: {
        storeId,
        ...metadata,
      },
    });

    this.logger.log(
      `Created Stripe customer ${stripeCustomer.id} for store ${storeId}`,
    );

    // Create or update ExternalBillingRef
    if (billingAccount.externalRef) {
      await this.prisma.externalBillingRef.update({
        where: { billingAccountId: billingAccount.id },
        data: {
          provider: BillingProvider.STRIPE,
          externalCustomerId: stripeCustomer.id,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
        },
      });
    } else {
      await this.prisma.externalBillingRef.create({
        data: {
          billingAccountId: billingAccount.id,
          provider: BillingProvider.STRIPE,
          externalCustomerId: stripeCustomer.id,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
        },
      });
    }

    return stripeCustomer.id;
  }

  /**
   * Get Stripe customer ID for a store
   *
   * @param storeId - Store ID
   * @returns Stripe customer ID or null if not found
   */
  async getCustomerId(storeId: string): Promise<string | null> {
    const billingAccount = await this.prisma.billingAccount.findUnique({
      where: { storeId },
      include: { externalRef: true },
    });

    return billingAccount?.externalRef?.externalCustomerId || null;
  }
}

