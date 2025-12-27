import {
  Controller,
  Get,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { PricingService } from './pricing.service';
import { UsageResolver } from './usage/usage-resolver';
import { StorePlanDto } from './dto/store-plan.dto';
import { StoreScopeGuard } from '../core/store-scope.guard';
import { PrismaService } from '../prisma.service';

/**
 * Billing Controller
 *
 * B1: Read-only API for billing and plans.
 * B2: Extended with pricing endpoint.
 * Returns plan information, limits, features, usage, and pricing.
 *
 * ⚠️ FOUNDATION ONLY: No payments, no charging, no enforcement of expirations.
 */
@UseGuards(StoreScopeGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private pricingService: PricingService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get Store Plan
   * GET /billing/plan
   *
   * Returns the current plan, limits, features, and usage for the authenticated store.
   *
   * Response:
   * {
   *   "plan": { "code": "basic", "name": "Basic" },
   *   "limits": { "invoicesPerMonth": 500, "users": 3 },
   *   "features": { "ledger": true, "reports": true },
   *   "usage": { "invoicesThisMonth": 45, "usersCount": 2 }
   * }
   */
  @Get('plan')
  async getPlan(
    @Req() req: Request,
  ): Promise<{ success: true; data: StorePlanDto }> {
    const storeId = req['storeId'] as string;

    if (!storeId) {
      throw new ForbiddenException('Store ID is required');
    }

    // Get store's subscription
    const subscription = await this.subscriptionsService.getByStoreId(storeId);

    // Resolve current usage
    const usage = await UsageResolver.resolve(this.prisma, storeId);

    // Build response
    const response: StorePlanDto = {
      plan: {
        code: subscription.plan.code,
        name: subscription.plan.name,
        description: subscription.plan.description || undefined,
      },
      limits: subscription.plan.limits as any,
      features: subscription.plan.features as any,
      usage,
    };

    return {
      success: true,
      data: response,
    };
  }

  /**
   * Get Store Pricing
   * GET /billing/pricing
   *
   * B2: Returns available pricing options for the store's current plan.
   * This is read-only - no mutations, no charging, no side effects.
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "plan": "PRO",
   *     "pricing": [
   *       { "cycle": "MONTHLY", "priceCents": 2900, "currency": "USD" },
   *       { "cycle": "YEARLY", "priceCents": 29900, "currency": "USD" }
   *     ]
   *   }
   * }
   */
  @Get('pricing')
  async getPricing(@Req() req: Request): Promise<{
    success: true;
    data: {
      plan: string;
      pricing: Array<{
        cycle: string;
        priceCents: number;
        currency: string;
      }>;
    };
  }> {
    const storeId = req['storeId'] as string;

    if (!storeId) {
      throw new ForbiddenException('Store ID is required');
    }

    // Get pricing for store's current subscription
    const pricingData = await this.pricingService.getPricingForStore(storeId);

    return {
      success: true,
      data: {
        plan: pricingData.plan.code,
        pricing: pricingData.pricing,
      },
    };
  }
}
