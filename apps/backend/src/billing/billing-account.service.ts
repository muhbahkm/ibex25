import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SubscriptionState, Prisma } from '@prisma/client';
import { BillingStateMachine } from './domain/billing-state-machine';

/**
 * Billing Account Service
 *
 * B3: Internal billing control layer (read/write).
 * This service manages billing accounts and state transitions.
 *
 * ⚠️ PROVIDER-AGNOSTIC: This service does NOT know about Stripe or any external provider.
 * External providers are just executors - this service is the source of truth.
 *
 * Responsibilities:
 * - Manage billing account state
 * - Enforce state machine transitions
 * - Change plans
 * - No external API calls
 * - No charging logic
 */
@Injectable()
export class BillingAccountService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get billing account for a store
   */
  async getByStoreId(storeId: string) {
    const account = await this.prisma.billingAccount.findUnique({
      where: { storeId },
      include: {
        plan: true,
        externalRef: true,
      },
    });

    if (!account) {
      throw new NotFoundException(
        `Billing account not found for store '${storeId}'`,
      );
    }

    return account;
  }

  /**
   * Create a billing account for a store
   */
  async create(storeId: string, planId: string, billingState?: Prisma.InputJsonValue) {
    // Check if account already exists
    const existing = await this.prisma.billingAccount.findUnique({
      where: { storeId },
    });

    if (existing) {
      throw new BadRequestException(
        `Billing account already exists for store '${storeId}'`,
      );
    }

    return this.prisma.billingAccount.create({
      data: {
        storeId,
        currentPlanId: planId,
        status: SubscriptionState.ACTIVE,
        billingState,
      },
      include: {
        plan: true,
        externalRef: true,
      },
    });
  }

  /**
   * Activate subscription
   * Transitions: SUSPENDED → ACTIVE, PAST_DUE → ACTIVE, GRACE → ACTIVE
   */
  async activateSubscription(storeId: string) {
    const account = await this.getByStoreId(storeId);

    // Validate transition
    BillingStateMachine.validateTransition(
      account.status,
      SubscriptionState.ACTIVE,
      `activate subscription for store ${storeId}`,
    );

    return this.prisma.billingAccount.update({
      where: { storeId },
      data: {
        status: SubscriptionState.ACTIVE,
      },
      include: {
        plan: true,
        externalRef: true,
      },
    });
  }

  /**
   * Suspend subscription
   * Transitions: ACTIVE → SUSPENDED, PAST_DUE → SUSPENDED, GRACE → SUSPENDED
   */
  async suspendSubscription(storeId: string) {
    const account = await this.getByStoreId(storeId);

    // Validate transition
    BillingStateMachine.validateTransition(
      account.status,
      SubscriptionState.SUSPENDED,
      `suspend subscription for store ${storeId}`,
    );

    return this.prisma.billingAccount.update({
      where: { storeId },
      data: {
        status: SubscriptionState.SUSPENDED,
      },
      include: {
        plan: true,
        externalRef: true,
      },
    });
  }

  /**
   * Cancel subscription
   * Transitions: Any state → CANCELLED (except CANCELLED itself)
   */
  async cancelSubscription(storeId: string) {
    const account = await this.getByStoreId(storeId);

    // Validate transition
    BillingStateMachine.validateTransition(
      account.status,
      SubscriptionState.CANCELLED,
      `cancel subscription for store ${storeId}`,
    );

    return this.prisma.billingAccount.update({
      where: { storeId },
      data: {
        status: SubscriptionState.CANCELLED,
      },
      include: {
        plan: true,
        externalRef: true,
      },
    });
  }

  /**
   * Change plan
   * Updates the current plan without changing state
   */
  async changePlan(storeId: string, newPlanId: string) {
    const account = await this.getByStoreId(storeId);

    // Cannot change plan if cancelled
    if (account.status === SubscriptionState.CANCELLED) {
      throw new BadRequestException(
        `Cannot change plan for cancelled subscription (store: ${storeId})`,
      );
    }

    return this.prisma.billingAccount.update({
      where: { storeId },
      data: {
        currentPlanId: newPlanId,
      },
      include: {
        plan: true,
        externalRef: true,
      },
    });
  }

  /**
   * Transition to PAST_DUE
   * Transitions: ACTIVE → PAST_DUE
   */
  async markPastDue(storeId: string) {
    const account = await this.getByStoreId(storeId);

    BillingStateMachine.validateTransition(
      account.status,
      SubscriptionState.PAST_DUE,
      `mark past due for store ${storeId}`,
    );

    return this.prisma.billingAccount.update({
      where: { storeId },
      data: {
        status: SubscriptionState.PAST_DUE,
      },
      include: {
        plan: true,
        externalRef: true,
      },
    });
  }

  /**
   * Transition to GRACE
   * Transitions: PAST_DUE → GRACE
   */
  async markGrace(storeId: string) {
    const account = await this.getByStoreId(storeId);

    BillingStateMachine.validateTransition(
      account.status,
      SubscriptionState.GRACE,
      `mark grace period for store ${storeId}`,
    );

    return this.prisma.billingAccount.update({
      where: { storeId },
      data: {
        status: SubscriptionState.GRACE,
      },
      include: {
        plan: true,
        externalRef: true,
      },
    });
  }

  /**
   * Update billing state metadata
   */
  async updateBillingState(
    storeId: string,
    billingState: Prisma.InputJsonValue,
  ) {
    return this.prisma.billingAccount.update({
      where: { storeId },
      data: {
        billingState,
      },
      include: {
        plan: true,
        externalRef: true,
      },
    });
  }
}

