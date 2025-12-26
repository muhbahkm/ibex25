import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

/**
 * Usage Snapshot Service
 *
 * C1: Read-only service that computes current usage metrics per store.
 * This is derived from existing data - NO persistence.
 *
 * This layer will be reused later by billing and plans.
 */
@Injectable()
export class UsageSnapshotService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get usage snapshot for a store
   * Computes metrics from existing data (read-only)
   */
  async getSnapshot(storeId: string): Promise<{
    invoicesIssuedToday: number;
    ledgerEntriesToday: number;
    invoicesIssuedThisMonth: number;
    ledgerEntriesThisMonth: number;
  }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Count invoices issued today
    const invoicesIssuedToday = await this.prisma.invoice.count({
      where: {
        storeId,
        status: {
          in: ['ISSUED', 'UNPAID', 'PAID'],
        },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Count invoices issued this month
    const invoicesIssuedThisMonth = await this.prisma.invoice.count({
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

    // Count ledger entries today
    const ledgerEntriesToday = await this.prisma.ledgerEntry.count({
      where: {
        storeId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Count ledger entries this month
    const ledgerEntriesThisMonth = await this.prisma.ledgerEntry.count({
      where: {
        storeId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    return {
      invoicesIssuedToday,
      ledgerEntriesToday,
      invoicesIssuedThisMonth,
      ledgerEntriesThisMonth,
    };
  }
}

