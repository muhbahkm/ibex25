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
   * Rules:
   * - Read-only (no mutations)
   * - Store ownership enforced
   * - No calculations, totals, or balances
   * - No filtering or pagination
   */
  async findAll(operatorStoreId: string) {
    // Store ownership is enforced at the service level
    // All ledger entries must belong to the operator's store

    const ledgerEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        storeId: operatorStoreId,
      },
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
}

