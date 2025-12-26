import { Controller, Get, Query, Res, Header, UseGuards, Req } from '@nestjs/common';
import { Request, Response } from 'express';
import { LedgerService } from './ledger.service';
import { LedgerQueryDto } from './dto/ledger-query.dto';
import { StoreScopeGuard } from '../core/store-scope.guard';
import { RateLimitGuard } from '../core/operational/guards/rate-limit.guard';

/**
 * Ledger Controller
 *
 * Provides read-only access to ledger entries.
 * Ledger entries are append-only financial events (SALE, RECEIPT).
 *
 * S2: Protected with StoreScopeGuard to enforce tenant isolation.
 * C1: Protected with RateLimitGuard for operational safety.
 */
@UseGuards(StoreScopeGuard, RateLimitGuard)
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
   * - export: 'csv' (optional) - if provided, returns CSV instead of JSON
   *
   * Date Range Filtering:
   * - If fromDate provided: createdAt >= fromDate
   * - If toDate provided: createdAt <= toDate
   * - If both provided: fromDate <= createdAt <= toDate
   * - If neither provided: return all entries
   *
   * Export Mode:
   * - If export=csv: Returns CSV text with proper headers
   * - If export not provided: Returns JSON (default behavior)
   *
   * Security:
   * - Store ownership is enforced
   * - Only ledger entries belonging to the operator's store are returned
   *
   * Response (JSON mode):
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
   *
   * Response (CSV mode):
   * - Content-Type: text/csv
   * - Content-Disposition: attachment; filename="ledger.csv"
   * - CSV format: Date,Type,Amount
   */
  @Get()
  async findAll(
    @Query() query: LedgerQueryDto,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    // S2: Use storeId from request (set by StoreScopeGuard) instead of query
    // This ensures the storeId has been validated by the guard
    const storeId = request['storeId'] || query.storeId;

    const entries = await this.ledgerService.findAll(
      storeId,
      query.fromDate,
      query.toDate,
    );

    // If export=csv, return CSV format with proper headers
    if (query.export === 'csv') {
      const csv = this.ledgerService.generateCSV(entries);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="ledger.csv"',
      );
      // Using @Res() without passthrough bypasses the interceptor
      return res.send(csv);
    }

    // Default: return JSON (manually wrapped to match SuccessResponseInterceptor format)
    // Using @Res() means we must manually format the response
    return res.json({ success: true, data: entries });
  }
}

