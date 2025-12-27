import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma.service';
import { SubscriptionsService } from '../subscriptions.service';
import { UsageResolver } from '../usage/usage-resolver';
import { PlanLimits } from '../dto/store-plan.dto';

/**
 * Plan Limit Guard
 *
 * B1: Soft enforcement of plan limits.
 * Throws 403 Forbidden with PLAN_LIMIT_EXCEEDED error code when limit is exceeded.
 *
 * ⚠️ SOFT ENFORCEMENT ONLY: No billing, no automatic upgrades.
 *
 * Applied ONLY to:
 * - POST /invoices/:id/issue
 *
 * Do NOT apply globally.
 */
@Injectable()
export class PlanLimitGuard implements CanActivate {
  private readonly logger = new Logger(PlanLimitGuard.name);

  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request['requestId'] as string) || 'unknown';
    const storeId = request['storeId'] as string;

    if (!storeId) {
      // If no storeId, let other guards handle it
      return true;
    }

    try {
      // Get store's subscription
      const subscription =
        await this.subscriptionsService.getByStoreId(storeId);

      // Get plan limits
      const limits = subscription.plan.limits as PlanLimits;

      // Resolve current usage
      const usage = await UsageResolver.resolve(this.prisma, storeId);

      // Check invoicesPerMonth limit
      if (limits.invoicesPerMonth !== undefined) {
        if (usage.invoicesThisMonth >= limits.invoicesPerMonth) {
          this.logger.warn(
            `[${requestId}] PLAN_LIMIT_EXCEEDED: storeId=${storeId}, ` +
              `invoicesThisMonth=${usage.invoicesThisMonth}, limit=${limits.invoicesPerMonth}`,
          );

          throw new ForbiddenException({
            message: `Plan limit exceeded. You have issued ${usage.invoicesThisMonth} invoices this month, but your plan allows only ${limits.invoicesPerMonth}.`,
            code: 'PLAN_LIMIT_EXCEEDED',
            limit: 'invoicesPerMonth',
            current: usage.invoicesThisMonth,
            allowed: limits.invoicesPerMonth,
          });
        }
      }

      // Check users limit
      if (limits.users !== undefined) {
        if (usage.usersCount >= limits.users) {
          this.logger.warn(
            `[${requestId}] PLAN_LIMIT_EXCEEDED: storeId=${storeId}, ` +
              `usersCount=${usage.usersCount}, limit=${limits.users}`,
          );

          throw new ForbiddenException({
            message: `Plan limit exceeded. You have ${usage.usersCount} users, but your plan allows only ${limits.users}.`,
            code: 'PLAN_LIMIT_EXCEEDED',
            limit: 'users',
            current: usage.usersCount,
            allowed: limits.users,
          });
        }
      }

      return true;
    } catch (error) {
      // If it's already a ForbiddenException, re-throw it
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // For other errors (e.g., subscription not found), log and allow
      // This is soft enforcement - we don't want to break the system
      this.logger.warn(
        `[${requestId}] Plan limit check failed for storeId=${storeId}: ${error.message}`,
      );

      // Allow the request to proceed (soft enforcement)
      return true;
    }
  }
}
