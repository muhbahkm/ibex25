import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LedgerEntryType } from '@prisma/client';

/**
 * Profit & Loss Service
 *
 * Provides read-only profit & loss calculations derived from ledger entries.
 * All calculations are computed on-the-fly from LedgerEntry (no cached totals).
 *
 * ⚠️ CONTRACT: Read-only reporting
 * - All data derived from LedgerEntry (single source of truth)
 * - No balances stored
 * - No cached totals
 * - No mutations allowed
 * - Calculations: totalSales, totalReceipts, netRevenue
 */
@Injectable()
export class ProfitLossService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate Profit & Loss for a store
   *
   * Calculations:
   * - totalSales = SUM(ledger.amount WHERE type=SALE)
   * - totalReceipts = SUM(ledger.amount WHERE type=RECEIPT)
   * - netRevenue = totalSales - totalReceipts
   *
   * Date Range Filtering:
   * - If fromDate provided: createdAt >= fromDate
   * - If toDate provided: createdAt <= toDate
   * - If both provided: fromDate <= createdAt <= toDate
   * - If neither provided: include all entries
   *
   * Rules:
   * - Read-only (no mutations)
   * - Store ownership enforced (only entries for operator's store)
   * - All calculations derived from LedgerEntry
   * - No cached values, no stored balances
   */
  async calculateProfitLoss(
    operatorStoreId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<{
    totalSales: number;
    totalReceipts: number;
    netRevenue: number;
  }> {
    // Build date filter if dates are provided (same logic as ledger service)
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
      type: LedgerEntryType;
      createdAt?: { gte?: Date; lte?: Date };
    } = {
      storeId: operatorStoreId,
    };

    if (fromDate || toDate) {
      whereClause.createdAt = dateFilter;
    }

    // Calculate totalSales: SUM of SALE entries
    const saleEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        ...whereClause,
        type: LedgerEntryType.SALE,
      },
      select: {
        amount: true,
      },
    });

    const totalSales = saleEntries.reduce(
      (sum, entry) => sum + Number(entry.amount),
      0,
    );

    // Calculate totalReceipts: SUM of RECEIPT entries
    const receiptEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        ...whereClause,
        type: LedgerEntryType.RECEIPT,
      },
      select: {
        amount: true,
      },
    });

    const totalReceipts = receiptEntries.reduce(
      (sum, entry) => sum + Number(entry.amount),
      0,
    );

    // Calculate netRevenue: totalSales - totalReceipts
    const netRevenue = totalSales - totalReceipts;

    return {
      totalSales,
      totalReceipts,
      netRevenue,
    };
  }
}

