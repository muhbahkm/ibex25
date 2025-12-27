import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma.service';
import { SubscriptionState } from '@prisma/client';
import { BillingStateMachine } from '../domain/billing-state-machine';

/**
 * Billing Status Guard
 *
 * B3: Enforces billing account status restrictions.
 * Prevents operations (like invoice issuance) when billing account is not in ACTIVE state.
 *
 * This guard is the enforcement layer for the internal billing control.
 * It checks the BillingAccount status, not external provider status.
 */
@Injectable()
export class BillingStatusGuard implements CanActivate {
  private readonly logger = new Logger(BillingStatusGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request['requestId'] as string) || 'unknown';
    const storeId = request['storeId'] as string;

    if (!storeId) {
      // If no storeId, let other guards handle it
      return true;
    }

    try {
      // Get billing account for store
      const billingAccount = await this.prisma.billingAccount.findUnique({
        where: { storeId },
      });

      // If no billing account exists, allow (for backward compatibility during migration)
      if (!billingAccount) {
        this.logger.warn(
          `[${requestId}] No billing account found for storeId=${storeId}. Allowing request (backward compatibility).`,
        );
        return true;
      }

      // Check if state allows invoice issuance
      if (!BillingStateMachine.canIssueInvoices(billingAccount.status)) {
        this.logger.warn(
          `[${requestId}] BILLING_STATUS_BLOCKED: storeId=${storeId}, status=${billingAccount.status}`,
        );

        const statusMessage = this.getStatusMessage(billingAccount.status);
        throw new ForbiddenException({
          message: `Operation blocked due to billing status: ${statusMessage}`,
          code: 'BILLING_STATUS_BLOCKED',
          status: billingAccount.status,
        });
      }

      return true;
    } catch (error) {
      // If it's already a ForbiddenException, re-throw it
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // For other errors, log and allow (graceful degradation)
      this.logger.warn(
        `[${requestId}] Billing status check failed for storeId=${storeId}: ${error.message}`,
      );

      // Allow the request to proceed (graceful degradation)
      return true;
    }
  }

  /**
   * Get user-friendly message for billing status
   */
  private getStatusMessage(status: SubscriptionState): string {
    const messages: Record<SubscriptionState, string> = {
      ACTIVE: 'الاشتراك نشط',
      PAST_DUE: 'الاشتراك متأخر في الدفع',
      GRACE: 'الاشتراك في فترة السماح',
      SUSPENDED: 'الاشتراك معلق',
      CANCELLED: 'الاشتراك ملغي',
    };

    return messages[status] || status;
  }
}
