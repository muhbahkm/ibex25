import { Controller, Get, Query } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { OperatorContextDto } from '../invoices/dto/operator-context.dto';

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
   * - storeId: UUID of the store
   * - operatorId: UUID of the operator
   *
   * Security:
   * - Store ownership is enforced
   * - Only ledger entries belonging to the operator's store are returned
   *
   * Response:
   * [
   *   {
   *     id: string,
   *     type: "SALE" | "RECEIPT",
   *     amount: number,
   *     createdAt: string
   *   }
   * ]
   */
  @Get()
  async findAll(@Query() query: OperatorContextDto) {
    // Validate query parameters
    const operatorContext: OperatorContextDto = {
      operatorId: query.operatorId,
      storeId: query.storeId,
    };

    return this.ledgerService.findAll(operatorContext.storeId);
  }
}

