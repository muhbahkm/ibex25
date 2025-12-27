import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { OperationalErrorCode } from '../error-codes';

/**
 * Write Throttle Guard
 *
 * C1: Explicit throttling for write operations (issue, settle, cancel).
 * Enforces max write operations per store per minute.
 *
 * This guard is applied to specific write endpoints.
 */
@Injectable()
export class WriteThrottleGuard implements CanActivate {
  private readonly logger = new Logger(WriteThrottleGuard.name);
  private readonly writeOps: Map<string, number[]> = new Map();
  private readonly maxWriteOpsPerMinute: number;
  private readonly windowMs: number = 60000; // 1 minute

  constructor() {
    // Max write operations per store per minute (configurable)
    this.maxWriteOpsPerMinute = parseInt(
      process.env.MAX_WRITE_OPS_PER_MINUTE || '10',
      10,
    );

    // Cleanup old entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request['requestId'] as string) || 'unknown';
    const storeId = request['storeId'] as string;

    if (!storeId) {
      // If no storeId, allow (other guards will handle it)
      return true;
    }

    // Check if this is a write operation we need to throttle
    if (!this.isThrottledOperation(request)) {
      return true;
    }

    const now = Date.now();
    const storeOps = this.getOrCreateStoreOps(storeId);

    // Remove operations outside the window
    const recentOps = storeOps.filter(
      (timestamp) => now - timestamp < this.windowMs,
    );

    if (recentOps.length >= this.maxWriteOpsPerMinute) {
      const oldestOp = Math.min(...recentOps);
      const waitTime = Math.ceil((this.windowMs - (now - oldestOp)) / 1000);

      this.logger.warn(
        `[${requestId}] WRITE_THROTTLED: storeId=${storeId}, ` +
          `opsInWindow=${recentOps.length}, max=${this.maxWriteOpsPerMinute}, ` +
          `path=${request.path}, method=${request.method}`,
      );

      throw new HttpException(
        {
          success: false,
          error: {
            code: OperationalErrorCode.WRITE_THROTTLED,
            message: `Too many write operations. Maximum ${this.maxWriteOpsPerMinute} write operations per minute allowed. Please try again in ${waitTime} seconds.`,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Record this operation
    recentOps.push(now);
    this.writeOps.set(storeId, recentOps);

    return true;
  }

  /**
   * Check if this operation should be throttled
   */
  private isThrottledOperation(request: Request): boolean {
    const path = request.path.toLowerCase();
    const method = request.method.toUpperCase();

    // Throttle invoice write operations
    if (method === 'POST' && path.includes('/invoices/')) {
      return (
        path.includes('/issue') ||
        path.includes('/settle') ||
        path.includes('/cancel')
      );
    }

    return false;
  }

  /**
   * Get or create operations list for store
   */
  private getOrCreateStoreOps(storeId: string): number[] {
    if (!this.writeOps.has(storeId)) {
      this.writeOps.set(storeId, []);
    }
    return this.writeOps.get(storeId)!;
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [storeId, ops] of this.writeOps.entries()) {
      const recentOps = ops.filter(
        (timestamp) => now - timestamp < this.windowMs,
      );
      if (recentOps.length === 0) {
        this.writeOps.delete(storeId);
      } else {
        this.writeOps.set(storeId, recentOps);
      }
    }
  }
}
