import { IsOptional, IsDateString } from 'class-validator';

/**
 * Profit & Loss Query DTO
 *
 * Used for GET /reports/profit-loss endpoint query parameters.
 * Date range filtering is optional (same semantics as ledger filtering).
 *
 * ⚠️ CONTRACT: Do not change without version bump
 * - fromDate: ISO 8601 date string (optional) - inclusive start date
 * - toDate: ISO 8601 date string (optional) - inclusive end date
 * - Store ownership enforced via AuthContext (not in DTO)
 */
export class ProfitLossQueryDto {
  /**
   * Optional start date (inclusive)
   * ISO 8601 date string
   * If provided, only entries with createdAt >= fromDate are included
   */
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  /**
   * Optional end date (inclusive)
   * ISO 8601 date string
   * If provided, only entries with createdAt <= toDate are included
   */
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

