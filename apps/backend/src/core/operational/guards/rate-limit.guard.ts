import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { RateLimiter } from '../rate-limiter';
import { OperationalErrorCode } from '../error-codes';

/**
 * Rate Limit Guard
 *
 * C1: Tenant-aware rate limiting guard.
 * Enforces rate limits per storeId and endpoint category (read vs write).
 *
 * This guard is applied globally or to specific endpoints.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly rateLimiter: RateLimiter;

  constructor() {
    // Read limits from environment variables
    const readLimit = parseInt(process.env.RATE_LIMIT_READ || '100', 10);
    const writeLimit = parseInt(process.env.RATE_LIMIT_WRITE || '20', 10);
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);

    this.rateLimiter = new RateLimiter(readLimit, writeLimit, windowMs);

    // Cleanup old entries every 5 minutes
    setInterval(() => {
      this.rateLimiter.cleanup();
    }, 5 * 60 * 1000);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request['requestId'] as string) || 'unknown';
    const storeId = request['storeId'] as string;

    if (!storeId) {
      // If no storeId, allow (other guards will handle it)
      return true;
    }

    // Determine endpoint category
    const category = this.getEndpointCategory(request);

    // Check rate limit
    if (!this.rateLimiter.isAllowed(storeId, category)) {
      const remaining = this.rateLimiter.getRemaining(storeId, category);
      const resetTime = this.rateLimiter.getResetTime(storeId, category);

      this.logger.warn(
        `[${requestId}] RATE_LIMIT_EXCEEDED: storeId=${storeId}, category=${category}, ` +
          `path=${request.path}, method=${request.method}`,
      );

      throw new HttpException(
        {
          success: false,
          error: {
            code: OperationalErrorCode.RATE_LIMIT_EXCEEDED,
            message: `Rate limit exceeded. Please try again in ${Math.ceil(resetTime / 1000)} seconds.`,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Determine endpoint category based on request
   */
  private getEndpointCategory(request: Request): 'read' | 'write' {
    const method = request.method.toUpperCase();
    const path = request.path.toLowerCase();

    // Write operations
    if (
      method === 'POST' ||
      method === 'PUT' ||
      method === 'PATCH' ||
      method === 'DELETE'
    ) {
      // Ledger and reports are read-only even if POST
      if (path.includes('/ledger') || path.includes('/reports')) {
        return 'read';
      }
      return 'write';
    }

    // Read operations
    return 'read';
  }
}

