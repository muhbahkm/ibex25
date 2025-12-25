import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request Correlation ID Middleware
 *
 * Generates a unique requestId for each incoming request and attaches it to:
 * - Request object (for use in controllers/services)
 * - Response headers (for client correlation)
 * - Console logs (for debugging and tracing)
 *
 * This enables:
 * - Request tracing across the system
 * - Debugging distributed operations
 * - Log correlation in production
 *
 * The requestId is NOT persisted to the database (per S1 requirements).
 * It's only used for request context and logging.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generate unique request ID
    const requestId = randomUUID();

    // Attach to request object
    req['requestId'] = requestId;

    // Add to response headers for client correlation
    res.setHeader('X-Request-ID', requestId);

    // Log request with correlation ID
    console.log(`[${requestId}] ${req.method} ${req.path}`);

    // Override console methods to include requestId in logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    // Store original methods for restoration
    req['_originalConsole'] = {
      log: originalLog,
      error: originalError,
      warn: originalWarn,
    };

    // Enhanced console methods with requestId
    console.log = (...args: any[]) => {
      originalLog(`[${requestId}]`, ...args);
    };

    console.error = (...args: any[]) => {
      originalError(`[${requestId}]`, ...args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(`[${requestId}]`, ...args);
    };

    // Restore original console methods after response
    res.on('finish', () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    });

    next();
  }
}

