import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BillingCycle } from '@prisma/client';

/**
 * Pricing Service
 *
 * B2: Manages plan pricing definitions (read-only).
 * Provides pricing information for plans and billing cycles.
 *
 * ⚠️ READ-ONLY: No mutations, no charging, no enforcement.
 */
@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all pricing options for a plan
   */
  async getPricingByPlanId(planId: string) {
    const pricing = await this.prisma.planPricing.findMany({
      where: { planId },
      orderBy: { billingCycle: 'asc' },
    });

    return pricing;
  }

  /**
   * Get pricing for a specific plan and billing cycle
   */
  async getPricingByPlanAndCycle(
    planId: string,
    billingCycle: BillingCycle,
  ) {
    const pricing = await this.prisma.planPricing.findUnique({
      where: {
        planId_billingCycle: {
          planId,
          billingCycle,
        },
      },
    });

    if (!pricing) {
      throw new NotFoundException(
        `Pricing not found for plan '${planId}' with cycle '${billingCycle}'`,
      );
    }

    return pricing;
  }

  /**
   * Get pricing for a store's current subscription
   */
  async getPricingForStore(storeId: string) {
    // Get store's subscription
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

    // Get all pricing options for the plan
    const pricing = await this.getPricingByPlanId(subscription.planId);

    return {
      plan: {
        id: subscription.plan.id,
        code: subscription.plan.code,
        name: subscription.plan.name,
      },
      pricing: pricing.map((p) => ({
        cycle: p.billingCycle,
        priceCents: p.priceCents,
        currency: p.currency,
      })),
    };
  }
}

