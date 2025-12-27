import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Reports Service
 *
 * Provides read-only financial reports computed from ledger entries.
 * Reports are computed on-demand from append-only ledger events.
 *
 * ⚠️ CONTRACT FROZEN: Report calculation rules
 * - Reports are computed from ledger entries (SALE, RECEIPT)
 * - No stored balances or pre-computed values
 * - Calculations are done on-demand
 * - Date range filtering is supported
 * Do not change calculation logic without version bump.
 */
@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get Profit & Loss Report
   *
   * Computes profit & loss from ledger entries:
   * - totalSales: Sum of all SALE entries
   * - totalReceipts: Sum of all RECEIPT entries
   * - netRevenue: totalSales - totalReceipts (conceptual calculation)
   *
   * Optional date range filtering:
   * - If fromDate provided: createdAt >= fromDate
   * - If toDate provided: createdAt <= toDate
   * - If both provided: fromDate <= createdAt <= toDate
   *
   * Rules:
   * - Read-only (no mutations)
   * - Store ownership enforced
   * - Calculations done on-demand
   * - No stored balances
   */
  async getProfitLoss(
    storeId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<{
    totalSales: number;
    totalReceipts: number;
    netRevenue: number;
  }> {
    // Build date filter if dates are provided
    const dateFilter: {
      gte?: Date;
      lte?: Date;
    } = {};

    if (fromDate) {
      dateFilter.gte = new Date(fromDate);
    }

    if (toDate) {
      // Include the entire day by setting to end of day
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.lte = endDate;
    }

    const whereClause: {
      storeId: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {
      storeId,
    };

    if (fromDate || toDate) {
      whereClause.createdAt = dateFilter;
    }

    // Get all ledger entries for the store (within date range if specified)
    const ledgerEntries = await this.prisma.ledgerEntry.findMany({
      where: whereClause,
      select: {
        type: true,
        amount: true,
      },
    });

    // Calculate totals from ledger entries
    let totalSales = 0;
    let totalReceipts = 0;

    for (const entry of ledgerEntries) {
      const amount = Number(entry.amount);
      if (entry.type === 'SALE') {
        totalSales += amount;
      } else if (entry.type === 'RECEIPT') {
        totalReceipts += amount;
      }
    }

    // Net revenue is conceptual: sales minus receipts
    // This represents revenue that hasn't been collected yet
    const netRevenue = totalSales - totalReceipts;

    return {
      totalSales,
      totalReceipts,
      netRevenue,
    };
  }
}

