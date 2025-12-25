import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StoreOwnershipGuard } from '../invoices/utils/store-ownership.guard';

/**
 * Ledger Service
 *
 * Provides read-only access to ledger entries.
 * Ledger entries are append-only financial events (SALE, RECEIPT).
 */
@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all ledger entries for a store
   *
   * Returns all ledger entries for the operator's store,
   * ordered by createdAt DESC (most recent first).
   *
   * Optional date range filtering:
   * - If fromDate provided: createdAt >= fromDate
   * - If toDate provided: createdAt <= toDate
   * - If both provided: fromDate <= createdAt <= toDate
   *
   * Rules:
   * - Read-only (no mutations)
   * - Store ownership enforced
   * - No calculations, totals, or balances
   * - No pagination
   */
  async findAll(
    operatorStoreId: string,
    fromDate?: string,
    toDate?: string,
  ) {
    // Store ownership is enforced at the service level
    // All ledger entries must belong to the operator's store

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
      storeId: operatorStoreId,
    };

    if (fromDate || toDate) {
      whereClause.createdAt = dateFilter;
    }

    const ledgerEntries = await this.prisma.ledgerEntry.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        type: true,
        amount: true,
        createdAt: true,
      },
    });

    // Transform Prisma Decimal to number for JSON serialization
    return ledgerEntries.map((entry) => ({
      id: entry.id,
      type: entry.type,
      amount: Number(entry.amount),
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  /**
   * Generate CSV string from ledger entries
   *
   * CSV format (strict order):
   * - Date (ISO string)
   * - Type (SALE / RECEIPT)
   * - Amount
   *
   * Rules:
   * - No totals row
   * - No grouping
   * - No formatting beyond plain values
   */
  generateCSV(entries: Array<{ type: string; amount: number; createdAt: string }>): string {
    // CSV header
    const header = 'Date,Type,Amount\n';

    // CSV rows
    const rows = entries.map((entry) => {
      const date = entry.createdAt;
      const type = entry.type;
      const amount = entry.amount.toString();

      // Escape CSV values (handle commas, quotes, newlines)
      const escapeCSV = (value: string): string => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      return `${escapeCSV(date)},${escapeCSV(type)},${escapeCSV(amount)}`;
    });

    return header + rows.join('\n');
  }
}

