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
 * 1. The request includes a storeId (from AuthContext, operatorContext, headers, or query)
 * 2. The storeId matches the expected tenant boundary
 * 3. Cross-store operations are prevented with explicit error code
 *
 * USAGE:
 * ```typescript
 * @UseGuards(StoreScopeGuard)
 * @Controller('ledger')
 * export class LedgerController {
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
 * S2: Enhanced with AuthContext support, error codes, and logging.
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
    const requestId = request['requestId'] || 'unknown';

    // Extract storeId from AuthContext (future) or current sources
    const authStoreId = this.extractStoreIdFromAuthContext(request);
    const requestStoreId = this.extractStoreId(request);

    // Use AuthContext.storeId if available, otherwise fall back to request sources
    const operatorStoreId = authStoreId || requestStoreId;

    if (!operatorStoreId) {
      throw new ForbiddenException({
        message:
          'Store ID is required. Please provide storeId in operatorContext, request headers, or query parameters.',
        code: 'STORE_ID_REQUIRED',
      });
    }

    // Validate storeId format (UUID)
    if (!this.isValidUUID(operatorStoreId)) {
      throw new ForbiddenException({
        message: `Invalid storeId format: ${operatorStoreId}. Store ID must be a valid UUID.`,
        code: 'INVALID_STORE_ID_FORMAT',
      });
    }

    // Check for cross-tenant access attempts
    // If request includes a target storeId (in query/params), validate it matches operator's store
    const targetStoreId = this.extractTargetStoreId(request);
    if (targetStoreId && targetStoreId !== operatorStoreId) {
      // Log the blocked attempt
      console.warn(
        `[${requestId}] CROSS_TENANT_ACCESS_DENIED: Operator storeId=${operatorStoreId}, Attempted storeId=${targetStoreId}, Path=${request.path}`,
      );

      throw new ForbiddenException({
        message: `Access denied. You do not have permission to access resources from store ${targetStoreId}.`,
        code: 'CROSS_TENANT_ACCESS_DENIED',
      });
    }

    // Attach validated storeId to request for use in controllers/services
    request['storeId'] = operatorStoreId;
    request['authStoreId'] = authStoreId; // Store AuthContext storeId separately if available

    return true;
  }

  /**
   * Extract storeId from AuthContext (future auth system)
   *
   * Priority: AuthContext.storeId (when auth system is implemented)
   * Currently returns null as AuthContext is not yet implemented.
   *
   * @param request - Express request object
   * @returns storeId from AuthContext, or null if not available
   */
  private extractStoreIdFromAuthContext(request: Request): string | null {
    // TODO: Extract from AuthContext when auth system is implemented
    // For now, AuthContext is not available, so return null
    // Future implementation:
    // const authContext = request['authContext'] as AuthContext | undefined;
    // return authContext?.storeId || null;
    return null;
  }

  /**
   * Extract storeId from request (fallback when AuthContext not available)
   *
   * Priority order:
   * 1. operatorContext.storeId (from request body)
   * 2. x-store-id header (for future auth system)
   * 3. storeId in query parameters
   * 4. storeId in request body (direct)
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

    // Try query parameters (for GET requests like /ledger?storeId=...)
    if (request.query?.storeId && typeof request.query.storeId === 'string') {
      return request.query.storeId;
    }

    // Try direct storeId in body (fallback)
    if (request.body?.storeId) {
      return request.body.storeId;
    }

    return null;
  }

  /**
   * Extract target storeId from request (for cross-tenant validation)
   *
   * This checks if the request is trying to access a specific store's resources.
   * Used to detect cross-tenant access attempts.
   *
   * @param request - Express request object
   * @returns target storeId if present in query/params, null otherwise
   */
  private extractTargetStoreId(request: Request): string | null {
    // Check query parameters (e.g., /ledger?storeId=...)
    if (request.query?.storeId && typeof request.query.storeId === 'string') {
      return request.query.storeId;
    }

    // Check route parameters (e.g., /stores/:storeId/...)
    if (request.params?.storeId) {
      return request.params.storeId;
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

