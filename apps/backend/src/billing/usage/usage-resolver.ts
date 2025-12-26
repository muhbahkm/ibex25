import { PrismaService } from '../../prisma.service';
import { PlanUsage } from '../dto/store-plan.dto';

/**
 * Usage Resolver
 *
 * B1: Computes usage dynamically from existing data.
 * This is READ-ONLY - no counters table, no writes.
 *
 * Usage is computed on-demand from:
 * - Invoices (for invoicesPerMonth)
 * - Users (for usersCount)
 * - etc.
 */
export class UsageResolver {
  /**
   * Resolve usage for a store
   *
   * @param prisma - Prisma service instance
   * @param storeId - Store ID to compute usage for
   * @returns Current usage metrics
   */
  static async resolve(
    prisma: PrismaService,
    storeId: string,
  ): Promise<PlanUsage> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Count invoices issued this month
    const invoicesThisMonth = await prisma.invoice.count({
      where: {
        storeId,
        status: {
          in: ['ISSUED', 'UNPAID', 'PAID'],
        },
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Count users in the store
    const usersCount = await prisma.user.count({
      where: {
        storeId,
      },
    });

    return {
      invoicesThisMonth,
      usersCount,
    };
  }
}
