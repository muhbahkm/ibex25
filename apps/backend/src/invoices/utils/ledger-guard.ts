import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaClient, LedgerEntryType } from '@prisma/client';

/**
 * Ledger Guard Utility
 *
 * Enforces idempotency and safety for ledger entries.
 * This is a defensive layer that prevents duplicate financial events.
 *
 * Rules:
 * - A SALE ledger entry can exist only once per invoice
 * - A RECEIPT ledger entry can exist only once per invoice
 * - All checks must run inside the same transaction
 * - Failures throw domain errors (400 or 409)
 *
 * ⚠️ CONTRACT FROZEN: These invariants are non-negotiable.
 * - One SALE per invoice (created at ISSUE)
 * - One RECEIPT per invoice (created at SETTLE)
 * - Ledger is append-only (no updates, no deletes)
 * Do not change these rules without version bump.
 *
 * This is constitutional law, not application logic.
 * If Ledger lies, reports lie, audits fail, trust collapses.
 */
export class LedgerGuard {
  /**
   * Check if a SALE ledger entry already exists for an invoice
   * Throws if duplicate is found
   */
  static async ensureNoSaleEntry(
    tx: PrismaClient,
    invoiceId: string,
    invoiceStoreId: string,
  ): Promise<void> {
    const existingSale = await tx.ledgerEntry.findFirst({
      where: {
        invoiceId: invoiceId,
        type: LedgerEntryType.SALE,
        storeId: invoiceStoreId,
      },
      select: {
        id: true,
      },
    });

    if (existingSale) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'LEDGER_SALE_ALREADY_RECORDED',
          message: `A SALE ledger entry already exists for invoice ${invoiceId}. This invoice has already been recorded as a sale. Duplicate entries are not allowed.`,
        },
      });
    }
  }

  /**
   * Check if a RECEIPT ledger entry already exists for an invoice
   * Throws if duplicate is found
   */
  static async ensureNoReceiptEntry(
    tx: PrismaClient,
    invoiceId: string,
    invoiceStoreId: string,
  ): Promise<void> {
    const existingReceipt = await tx.ledgerEntry.findFirst({
      where: {
        invoiceId: invoiceId,
        type: LedgerEntryType.RECEIPT,
        storeId: invoiceStoreId,
      },
      select: {
        id: true,
      },
    });

    if (existingReceipt) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'LEDGER_RECEIPT_ALREADY_RECORDED',
          message: `A RECEIPT ledger entry already exists for invoice ${invoiceId}. This invoice payment has already been recorded. Duplicate entries are not allowed.`,
        },
      });
    }
  }

  /**
   * Validate that ledger entry creation is safe
   * This is a convenience method that checks both conditions
   */
  static async validateLedgerEntryCreation(
    tx: PrismaClient,
    invoiceId: string,
    invoiceStoreId: string,
    entryType: LedgerEntryType,
  ): Promise<void> {
    if (entryType === LedgerEntryType.SALE) {
      await this.ensureNoSaleEntry(tx, invoiceId, invoiceStoreId);
    } else if (entryType === LedgerEntryType.RECEIPT) {
      await this.ensureNoReceiptEntry(tx, invoiceId, invoiceStoreId);
    } else {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'LEDGER_INVALID_ENTRY_TYPE',
          message: `Invalid ledger entry type: ${entryType}. Only SALE and RECEIPT are allowed.`,
        },
      });
    }
  }
}

