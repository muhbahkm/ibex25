import { IsOptional, IsDateString } from 'class-validator';
import { OperatorContextDto } from '../../invoices/dto/operator-context.dto';

/**
 * Ledger Query DTO
 *
 * Extends OperatorContextDto with optional date range filtering.
 * Used for GET /ledger endpoint query parameters.
 */
export class LedgerQueryDto extends OperatorContextDto {
  /**
   * Optional start date (inclusive)
   * ISO 8601 date string
   * If provided, only entries with createdAt >= fromDate are returned
   */
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  /**
   * Optional end date (inclusive)
   * ISO 8601 date string
   * If provided, only entries with createdAt <= toDate are returned
   */
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

