import {
  Controller,
  Post,
  Headers,
  Body,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import Stripe from 'stripe';
import { BillingAccountService } from '../billing-account.service';

/**
 * Stripe Webhook Controller
 *
 * B4: Handles Stripe webhook events and synchronizes them to internal billing state.
 *
 * ⚠️ CRITICAL: This is the ONLY place where Stripe events mutate internal state.
 * All state transitions MUST go through BillingAccountService and billing-state-machine.
 *
 * Handled Events:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 *
 * Rules:
 * - Verify webhook signature (STRIPE_WEBHOOK_SECRET)
 * - Idempotency key required
 * - Parse event → domain intent
 * - Call BillingAccountService with validated transitions ONLY
 * - NEVER mutate BillingAccount directly
 * - ALWAYS go through billing-state-machine.ts
 */
@Controller('billing/stripe/webhook')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    private billingAccountService: BillingAccountService,
    @Inject('STRIPE_WEBHOOK_SECRET') webhookSecret?: string,
  ) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-12-15.clover',
      });
    }

    if (!webhookSecret) {
      this.logger.warn(
        'STRIPE_WEBHOOK_SECRET not provided. Webhook signature verification will be disabled.',
      );
    }
    this.webhookSecret = webhookSecret || '';
  }

  /**
   * Handle Stripe webhook events
   *
   * Verifies webhook signature, parses event, and synchronizes to internal billing state.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const requestId = (req['requestId'] as string) || 'unknown';

    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.',
      );
    }

    if (!this.webhookSecret) {
      throw new BadRequestException(
        'Webhook secret is not configured. Please set STRIPE_WEBHOOK_SECRET environment variable.',
      );
    }

    if (!signature) {
      throw new UnauthorizedException('Missing Stripe signature header');
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      this.logger.error(
        `[${requestId}] Webhook signature verification failed: ${err.message}`,
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Log webhook event
    this.logger.log(
      `[${requestId}] Received Stripe webhook: ${event.type} (id: ${event.id})`,
    );

    // Handle event based on type
    try {
      await this.handleEvent(event, requestId);
    } catch (error) {
      this.logger.error(
        `[${requestId}] Error handling webhook event ${event.type} (id: ${event.id}): ${error.message}`,
        error.stack,
      );
      throw error;
    }

    return { received: true };
  }

  /**
   * Handle Stripe event and synchronize to internal billing state
   *
   * Maps Stripe events to domain intents and calls BillingAccountService.
   * All state transitions are validated via billing-state-machine.
   */
  private async handleEvent(
    event: Stripe.Event,
    requestId: string,
  ): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event, requestId);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event, requestId);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event, requestId);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event, requestId);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event, requestId);
        break;

      default:
        this.logger.warn(
          `[${requestId}] Unhandled Stripe event type: ${event.type} (id: ${event.id})`,
        );
        // Do not throw - unknown events are logged but not errors
        break;
    }
  }

  /**
   * Handle subscription.created event
   *
   * When Stripe subscription is created, we activate the internal billing account.
   */
  private async handleSubscriptionCreated(
    event: Stripe.Event,
    requestId: string,
  ): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const storeId = subscription.metadata?.storeId;

    if (!storeId) {
      this.logger.warn(
        `[${requestId}] Subscription created event missing storeId metadata (subscription: ${subscription.id})`,
      );
      return;
    }

    this.logger.log(
      `[${requestId}] Processing subscription.created for store ${storeId} (subscription: ${subscription.id})`,
    );

    // Activate subscription via BillingAccountService (validates transition)
    try {
      await this.billingAccountService.activateSubscription(storeId);
      this.logger.log(
        `[${requestId}] Activated billing account for store ${storeId} (subscription: ${subscription.id})`,
      );
    } catch (error) {
      this.logger.error(
        `[${requestId}] Failed to activate subscription for store ${storeId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Handle subscription.updated event
   *
   * When Stripe subscription status changes, we sync to internal state.
   */
  private async handleSubscriptionUpdated(
    event: Stripe.Event,
    requestId: string,
  ): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const storeId = subscription.metadata?.storeId;

    if (!storeId) {
      this.logger.warn(
        `[${requestId}] Subscription updated event missing storeId metadata (subscription: ${subscription.id})`,
      );
      return;
    }

    this.logger.log(
      `[${requestId}] Processing subscription.updated for store ${storeId} (subscription: ${subscription.id}, status: ${subscription.status})`,
    );

    // Map Stripe status to internal state
    // Stripe statuses: active, past_due, unpaid, canceled, incomplete, incomplete_expired, trialing, paused
    switch (subscription.status) {
      case 'active':
        await this.billingAccountService.activateSubscription(storeId);
        break;
      case 'past_due':
        await this.billingAccountService.markPastDue(storeId);
        break;
      case 'canceled':
        await this.billingAccountService.cancelSubscription(storeId);
        break;
      case 'unpaid':
        await this.billingAccountService.markGrace(storeId);
        break;
      default:
        this.logger.warn(
          `[${requestId}] Unmapped Stripe subscription status: ${subscription.status} (subscription: ${subscription.id})`,
        );
    }
  }

  /**
   * Handle subscription.deleted event
   *
   * When Stripe subscription is deleted, we cancel the internal billing account.
   */
  private async handleSubscriptionDeleted(
    event: Stripe.Event,
    requestId: string,
  ): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const storeId = subscription.metadata?.storeId;

    if (!storeId) {
      this.logger.warn(
        `[${requestId}] Subscription deleted event missing storeId metadata (subscription: ${subscription.id})`,
      );
      return;
    }

    this.logger.log(
      `[${requestId}] Processing subscription.deleted for store ${storeId} (subscription: ${subscription.id})`,
    );

    // Cancel subscription via BillingAccountService (validates transition)
    try {
      await this.billingAccountService.cancelSubscription(storeId);
      this.logger.log(
        `[${requestId}] Cancelled billing account for store ${storeId} (subscription: ${subscription.id})`,
      );
    } catch (error) {
      this.logger.error(
        `[${requestId}] Failed to cancel subscription for store ${storeId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Handle invoice.payment_succeeded event
   *
   * When payment succeeds, we activate the subscription.
   */
  private async handlePaymentSucceeded(
    event: Stripe.Event,
    requestId: string,
  ): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    // Invoice.subscription can be a string ID or a Subscription object
    const subscriptionId =
      typeof (invoice as any).subscription === 'string'
        ? (invoice as any).subscription
        : (invoice as any).subscription?.id;

    if (!subscriptionId) {
      this.logger.warn(
        `[${requestId}] Payment succeeded event missing subscription ID (invoice: ${invoice.id})`,
      );
      return;
    }

    // Get storeId from subscription metadata
    const subscription = await this.stripe.subscriptions.retrieve(
      subscriptionId,
    );
    const storeId = subscription.metadata?.storeId;

    if (!storeId) {
      this.logger.warn(
        `[${requestId}] Payment succeeded event missing storeId metadata (invoice: ${invoice.id}, subscription: ${subscriptionId})`,
      );
      return;
    }

    this.logger.log(
      `[${requestId}] Processing payment_succeeded for store ${storeId} (invoice: ${invoice.id}, subscription: ${subscriptionId})`,
    );

    // Activate subscription via BillingAccountService
    try {
      await this.billingAccountService.activateSubscription(storeId);
      this.logger.log(
        `[${requestId}] Activated billing account for store ${storeId} after successful payment (invoice: ${invoice.id})`,
      );
    } catch (error) {
      this.logger.error(
        `[${requestId}] Failed to activate subscription for store ${storeId} after payment: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Handle invoice.payment_failed event
   *
   * When payment fails, we mark the subscription as past due.
   */
  private async handlePaymentFailed(
    event: Stripe.Event,
    requestId: string,
  ): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    // Invoice.subscription can be a string ID or a Subscription object
    const subscriptionId =
      typeof (invoice as any).subscription === 'string'
        ? (invoice as any).subscription
        : (invoice as any).subscription?.id;

    if (!subscriptionId) {
      this.logger.warn(
        `[${requestId}] Payment failed event missing subscription ID (invoice: ${invoice.id})`,
      );
      return;
    }

    // Get storeId from subscription metadata
    const subscription = await this.stripe.subscriptions.retrieve(
      subscriptionId,
    );
    const storeId = subscription.metadata?.storeId;

    if (!storeId) {
      this.logger.warn(
        `[${requestId}] Payment failed event missing storeId metadata (invoice: ${invoice.id}, subscription: ${subscriptionId})`,
      );
      return;
    }

    this.logger.log(
      `[${requestId}] Processing payment_failed for store ${storeId} (invoice: ${invoice.id}, subscription: ${subscriptionId})`,
    );

    // Mark as past due via BillingAccountService
    try {
      await this.billingAccountService.markPastDue(storeId);
      this.logger.log(
        `[${requestId}] Marked billing account as past due for store ${storeId} after failed payment (invoice: ${invoice.id})`,
      );
    } catch (error) {
      this.logger.error(
        `[${requestId}] Failed to mark subscription as past due for store ${storeId}: ${error.message}`,
      );
      throw error;
    }
  }
}

