import { Controller, Get, Query, Res, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { LedgerService } from './ledger.service';
import { LedgerQueryDto } from './dto/ledger-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { Permission } from '../auth/permissions.enum';
import { AuthContext } from '../auth/auth-context.interface';

/**
 * Ledger Controller
 *
 * Provides read-only access to ledger entries.
 * Ledger entries are append-only financial events (SALE, RECEIPT).
 */
@Controller('ledger')
@UseGuards(AuthGuard)
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
  /**
   * Security:
   * - Requires VIEW_LEDGER permission
   * - AuthContext extracted from headers (x-user-id, x-store-id, x-role)
   */
  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.VIEW_LEDGER)
  async findAll(
    @Query() query: LedgerQueryDto,
    @Res() res: Response,
    @Req() request: Request & { auth?: AuthContext },
  ) {
    // Bridge: Extract AuthContext from request (set by AuthGuard)
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

    // Bridge: Validate AuthContext matches query parameters (if provided)
    // Use AuthContext as source of truth, but validate consistency
    if (query.storeId && query.storeId !== authContext.storeId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'STORE_ID_MISMATCH',
          message: `Store ID mismatch. Header x-store-id (${authContext.storeId}) does not match query storeId (${query.storeId}).`,
        },
      });
    }

    if (query.operatorId && query.operatorId !== authContext.userId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'OPERATOR_ID_MISMATCH',
          message: `Operator ID mismatch. Header x-user-id (${authContext.userId}) does not match query operatorId (${query.operatorId}).`,
        },
      });
    }

    // Bridge: Use AuthContext as source of truth, override query values
    const validatedStoreId = authContext.storeId;

    const entries = await this.ledgerService.findAll(
      validatedStoreId,
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

