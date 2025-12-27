import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PlansService } from './plans.service';

/**
 * Subscriptions Service
 *
 * B1: Manages store subscriptions to plans.
 * One subscription per store (1:1 relationship).
 *
 * ⚠️ FOUNDATION ONLY: No billing cycles, no expiration, no payment tracking.
 */
@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private plansService: PlansService,
  ) {}

  /**
   * Get subscription for a store
   */
  async getByStoreId(storeId: string) {
    const subscription = await this.prisma.storeSubscription.findUnique({
      where: { storeId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException(
        `No subscription found for store '${storeId}'`,
      );
    }

    return subscription;
  }

  /**
   * Assign a plan to a store (for admin use)
   */
  async assignPlan(storeId: string, planId: string) {
    // Verify plan exists
    await this.plansService.findById(planId);

    // Upsert subscription (create or update)
    return this.prisma.storeSubscription.upsert({
      where: { storeId },
      create: {
        storeId,
        planId,
        status: 'ACTIVE',
      },
      update: {
        planId,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });
  }

  /**
   * Suspend a store's subscription
   */
  async suspend(storeId: string) {
    return this.prisma.storeSubscription.update({
      where: { storeId },
      data: { status: 'SUSPENDED' },
      include: {
        plan: true,
      },
    });
  }

  /**
   * Activate a store's subscription
   */
  async activate(storeId: string) {
    return this.prisma.storeSubscription.update({
      where: { storeId },
      data: { status: 'ACTIVE' },
      include: {
        plan: true,
      },
    });
  }
}
