import { Controller, Get, Query } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerQueryDto } from './dto/ledger-query.dto';

/**
 * Ledger Controller
 *
 * Provides read-only access to ledger entries.
 * Ledger entries are append-only financial events (SALE, RECEIPT).
 */
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  /**
   * Get Ledger Entries
   * GET /ledger
   *
   * Returns all ledger entries for the operator's store,
   * ordered by createdAt DESC (most recent first).
   *
   * Query Parameters:
   * - storeId: UUID of the store (required)
   * - operatorId: UUID of the operator (required)
   * - fromDate: ISO 8601 date string (optional)
   * - toDate: ISO 8601 date string (optional)
   *
   * Date Range Filtering:
   * - If fromDate provided: createdAt >= fromDate
   * - If toDate provided: createdAt <= toDate
   * - If both provided: fromDate <= createdAt <= toDate
   * - If neither provided: return all entries
   *
   * Security:
   * - Store ownership is enforced
   * - Only ledger entries belonging to the operator's store are returned
   *
   * Response:
   * {
   *   success: true,
   *   data: [
   *     {
   *       id: string,
   *       type: "SALE" | "RECEIPT",
   *       amount: number,
   *       createdAt: string
   *     }
   *   ]
   * }
   */
  @Get()
  async findAll(@Query() query: LedgerQueryDto) {
    return this.ledgerService.findAll(
      query.storeId,
      query.fromDate,
      query.toDate,
    );
  }
}

