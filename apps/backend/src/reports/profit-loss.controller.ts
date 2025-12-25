import { Controller, Get, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { ProfitLossService } from './profit-loss.service';
import { ProfitLossQueryDto } from './dto/profit-loss-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { Permission } from '../auth/permissions.enum';
import { AuthContext } from '../auth/auth-context.interface';

/**
 * Profit & Loss Controller
 *
 * Provides read-only profit & loss reporting.
 * All calculations are derived from LedgerEntry (no cached totals).
 */
@Controller('reports')
@UseGuards(AuthGuard)
export class ProfitLossController {
  constructor(private readonly profitLossService: ProfitLossService) {}

  /**
   * Get Profit & Loss Report
   * GET /reports/profit-loss
   *
   * Returns profit & loss calculations for the operator's store.
   * All calculations are derived from LedgerEntry (SALE and RECEIPT).
   *
   * Query Parameters:
   * - fromDate: ISO 8601 date string (optional) - inclusive start date
   * - toDate: ISO 8601 date string (optional) - inclusive end date
   *
   * Date Range Filtering:
   * - If fromDate provided: createdAt >= fromDate
   * - If toDate provided: createdAt <= toDate
   * - If both provided: fromDate <= createdAt <= toDate
   * - If neither provided: include all entries
   *
   * Security:
   * - Requires VIEW_REPORTS permission
   * - AuthContext extracted from headers (x-user-id, x-store-id, x-role)
   * - Store ownership enforced (only entries for operator's store)
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
   *
   * Calculations:
   * - totalSales = SUM(ledger.amount WHERE type=SALE)
   * - totalReceipts = SUM(ledger.amount WHERE type=RECEIPT)
   * - netRevenue = totalSales - totalReceipts
   */
  @Get('profit-loss')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.VIEW_REPORTS)
  async getProfitLoss(
    @Query() query: ProfitLossQueryDto,
    @Req() request: Request & { auth?: AuthContext },
  ) {
    // Extract AuthContext from request (set by AuthGuard)
    const authContext = request.auth;
    if (!authContext) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'AUTH_CONTEXT_MISSING',
          message: 'Authentication context is missing. AuthGuard must be applied.',
        },
      });
    }

    // Use AuthContext.storeId as source of truth
    const storeId = authContext.storeId;

    const result = await this.profitLossService.calculateProfitLoss(
      storeId,
      query.fromDate,
      query.toDate,
    );

    return {
      success: true,
      data: result,
    };
  }
}

