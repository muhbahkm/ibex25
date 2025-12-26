import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TimeWindow, UsageMetrics, UsageSnapshot } from './usage-metrics.types';
import { getWindowBoundaries } from './usage-window.util';

/**
 * Usage Meter Service
 *
 * C2: Read-only service that computes accurate usage metrics on demand.
 *
 * Rules:
 * - Read-only (no writes)
 * - No caching (computed fresh every time)
 * - No persistence (no storage)
 * - No side effects
 * - Derived from existing data ONLY
 * - Deterministic (same input = same output)
 * - Store-scoped (tenant-safe)
 *
 * This is the SINGLE SOURCE OF TRUTH for usage metrics.
 */
@Injectable()
export class UsageMeterService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get usage snapshot for a store
   *
   * @param storeId - Store ID (tenant identifier)
   * @param window - Time window (DAILY or MONTHLY)
   * @param referenceDate - Reference date for window calculation (defaults to now)
   * @returns Usage snapshot with computed metrics
   */
  async getUsageSnapshot(
    storeId: string,
    window: TimeWindow = TimeWindow.MONTHLY,
    referenceDate: Date = new Date(),
  ): Promise<UsageSnapshot> {
    const boundaries = getWindowBoundaries(window, referenceDate);
    const metrics = await this.computeMetrics(storeId, boundaries);

    return {
      window,
      metrics,
      computedAt: referenceDate,
    };
  }

  /**
   * Get daily usage for a store
   */
  async getDailyUsage(storeId: string): Promise<UsageMetrics> {
    const boundaries = getWindowBoundaries(TimeWindow.DAILY);
    return this.computeMetrics(storeId, boundaries);
  }

  /**
   * Get monthly usage for a store
   */
  async getMonthlyUsage(storeId: string): Promise<UsageMetrics> {
    const boundaries = getWindowBoundaries(TimeWindow.MONTHLY);
    return this.computeMetrics(storeId, boundaries);
  }

  /**
   * Compute all metrics for a store within a time window
   *
   * This is the core computation logic - pure, deterministic, read-only.
   */
  private async computeMetrics(
    storeId: string,
    boundaries: { start: Date; end: Date },
  ): Promise<UsageMetrics> {
    // Compute all metrics in parallel for efficiency
    const [invoicesIssued, ledgerEntries, activeInvoices, activeCustomers] =
      await Promise.all([
        this.computeInvoicesIssued(storeId, boundaries),
        this.computeLedgerEntries(storeId, boundaries),
        this.computeActiveInvoices(storeId),
        this.computeActiveCustomers(storeId),
      ]);

    return {
      invoicesIssued,
      ledgerEntries,
      activeInvoices,
      activeCustomers,
    };
  }

  /**
   * Compute invoices issued within time window
   * Counts invoices with status: ISSUED, UNPAID, PAID
   */
  private async computeInvoicesIssued(
    storeId: string,
    boundaries: { start: Date; end: Date },
  ): Promise<number> {
    return this.prisma.invoice.count({
      where: {
        storeId,
        status: {
          in: ['ISSUED', 'UNPAID', 'PAID'],
        },
        createdAt: {
          gte: boundaries.start,
          lte: boundaries.end,
        },
      },
    });
  }

  /**
   * Compute ledger entries within time window
   */
  private async computeLedgerEntries(
    storeId: string,
    boundaries: { start: Date; end: Date },
  ): Promise<number> {
    return this.prisma.ledgerEntry.count({
      where: {
        storeId,
        createdAt: {
          gte: boundaries.start,
          lte: boundaries.end,
        },
      },
    });
  }

  /**
   * Compute active invoices (current state, not time-windowed)
   * Counts invoices with status: ISSUED, UNPAID, PAID
   */
  private async computeActiveInvoices(storeId: string): Promise<number> {
    return this.prisma.invoice.count({
      where: {
        storeId,
        status: {
          in: ['ISSUED', 'UNPAID', 'PAID'],
        },
      },
    });
  }

  /**
   * Compute active customers
   * Counts non-guest customers who have at least one invoice
   */
  private async computeActiveCustomers(storeId: string): Promise<number> {
    // Get all customers with invoices
    const customersWithInvoices = await this.prisma.customer.findMany({
      where: {
        storeId,
        isGuest: false,
        invoices: {
          some: {},
        },
      },
      select: {
        id: true,
      },
    });

    return customersWithInvoices.length;
  }
}
