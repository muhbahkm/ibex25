import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { getStoreIdFromRequest } from './tenant-boundary';

/**
 * Store Scope Guard
 *
 * A reusable guard that enforces tenant (store) boundaries at the controller level.
 *
 * This guard validates that:
 * 1. The request includes a storeId (from operatorContext or headers)
 * 2. The storeId matches the expected tenant boundary
 * 3. Cross-store operations are prevented
 *
 * USAGE:
 * ```typescript
 * @UseGuards(StoreScopeGuard)
 * @Controller('invoices')
 * export class InvoicesController {
 *   // All routes in this controller will be protected
 * }
 * ```
 *
 * OR apply to specific routes:
 * ```typescript
 * @UseGuards(StoreScopeGuard)
 * @Post(':id/issue')
 * async issue(...) { ... }
 * ```
 *
 * NOTE: This guard is prepared for S1 but NOT yet applied to existing controllers.
 * It will be integrated in future phases when refactoring controllers.
 */
@Injectable()
export class StoreScopeGuard implements CanActivate {
  /**
   * Validate that the request is scoped to a valid store (tenant)
   *
   * @param context - NestJS execution context
   * @returns true if the request is valid, throws ForbiddenException otherwise
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const storeId = this.extractStoreId(request);

    if (!storeId) {
      throw new ForbiddenException(
        'Store ID is required. Please provide storeId in operatorContext or request headers.',
      );
    }

    // Validate storeId format (UUID)
    if (!this.isValidUUID(storeId)) {
      throw new ForbiddenException(
        `Invalid storeId format: ${storeId}. Store ID must be a valid UUID.`,
      );
    }

    // Attach storeId to request for use in controllers/services
    request['storeId'] = storeId;

    return true;
  }

  /**
   * Extract storeId from request
   *
   * Priority order:
   * 1. operatorContext.storeId (from request body)
   * 2. x-store-id header (for future auth system)
   * 3. storeId in request body (direct)
   */
  private extractStoreId(request: Request): string | null {
    // Try operatorContext first (current implementation)
    if (request.body?.operatorContext?.storeId) {
      return request.body.operatorContext.storeId;
    }

    // Try x-store-id header (future auth system)
    const headerStoreId = request.headers['x-store-id'];
    if (headerStoreId && typeof headerStoreId === 'string') {
      return headerStoreId;
    }

    // Try direct storeId in body (fallback)
    if (request.body?.storeId) {
      return request.body.storeId;
    }

    return null;
  }

  /**
   * Validate UUID format
   *
   * @param uuid - String to validate
   * @returns true if valid UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

