import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ReportsService } from './reports.service';
import { StoreScopeGuard } from '../core/store-scope.guard';
import { RateLimitGuard } from '../core/operational/guards/rate-limit.guard';

/**
 * Reports Controller
 *
 * Provides read-only access to financial reports.
 * Reports are computed from ledger entries (append-only financial events).
 *
 * S2: Protected with StoreScopeGuard to enforce tenant isolation.
 * C1: Protected with RateLimitGuard for operational safety.
 */
@UseGuards(StoreScopeGuard, RateLimitGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Get Profit & Loss Report
   * GET /reports/profit-loss
   *
   * Returns profit & loss report computed from ledger entries.
   *
   * Query Parameters:
   * - storeId: UUID of the store (required, validated by StoreScopeGuard)
   * - operatorId: UUID of the operator (required, validated)
   * - fromDate: ISO 8601 date string (optional)
   * - toDate: ISO 8601 date string (optional)
   *
   * Date Range Filtering:
   * - If fromDate provided: createdAt >= fromDate
   * - If toDate provided: createdAt <= toDate
   * - If both provided: fromDate <= createdAt <= toDate
   * - If neither provided: return all entries
   *
   * Report Calculation:
   * - totalSales: Sum of SALE entries
   * - totalReceipts: Sum of RECEIPT entries
   * - netRevenue: totalSales - totalReceipts (conceptual, not stored)
   *
   * Security:
   * - Store ownership is enforced
   * - Only ledger entries belonging to the operator's store are included
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     totalSales: number,
   *     totalReceipts: number,
   *     netRevenue: number
   *   }
   * }
   */
  @Get('profit-loss')
  async getProfitLoss(
    @Req() request: Request,
    @Query('storeId') storeId?: string,
    @Query('operatorId') operatorId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    // S2: Use storeId from request (set by StoreScopeGuard) instead of query
    // This ensures the storeId has been validated by the guard
    const validatedStoreId = (request['storeId'] as string) || storeId;

    const report = await this.reportsService.getProfitLoss(
      validatedStoreId,
      fromDate,
      toDate,
    );

    return {
      success: true,
      data: report,
    };
  }
}

