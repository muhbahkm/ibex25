import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthContext } from './auth-context.interface';
import { Role } from './roles.enum';
import { getPermissionsForRole } from './role-permissions';

/**
 * Auth Guard (Real Implementation)
 *
 * Enforces authentication by reading auth headers and building AuthContext.
 * This is a temporary header-based implementation before JWT is introduced.
 *
 * Required Headers:
 * - x-user-id: UUID of the authenticated user
 * - x-store-id: UUID of the store the user belongs to
 * - x-role: User's role (OWNER | MANAGER | CASHIER | AUDITOR)
 *
 * Behavior:
 * - Extracts headers from request
 * - Validates headers are present and valid
 * - Builds AuthContext with role-derived permissions
 * - Attaches AuthContext to request.auth
 * - Throws 401 Unauthorized if headers are missing or invalid
 *
 * Migration Path:
 * - Phase 1 (Current): Header-based auth (temporary, explicit)
 * - Phase 2 (Future): JWT-based auth (replaces headers)
 * - Phase 3 (Future): Session-based auth (optional)
 */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { auth?: AuthContext }>();
    
    // Extract headers
    const userId = request.headers['x-user-id'] as string;
    const storeId = request.headers['x-store-id'] as string;
    const role = request.headers['x-role'] as string;

    // Validate headers are present
    if (!userId || !storeId || !role) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'AUTH_HEADERS_MISSING',
          message: 'Authentication headers are required. Please provide x-user-id, x-store-id, and x-role headers.',
        },
      });
    }

    // Validate userId and storeId are valid UUIDs (basic format check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'AUTH_INVALID_USER_ID',
          message: 'Invalid user ID format. User ID must be a valid UUID.',
        },
      });
    }

    if (!uuidRegex.test(storeId)) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'AUTH_INVALID_STORE_ID',
          message: 'Invalid store ID format. Store ID must be a valid UUID.',
        },
      });
    }

    // Validate role is a valid Role enum value
    const validRoles = Object.values(Role);
    if (!validRoles.includes(role as Role)) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'AUTH_INVALID_ROLE',
          message: `Invalid role. Role must be one of: ${validRoles.join(', ')}`,
        },
      });
    }

    // Build AuthContext
    const authContext: AuthContext = {
      userId,
      storeId,
      role: role as Role,
      permissions: getPermissionsForRole(role as Role),
    };

    // Attach AuthContext to request
    request.auth = authContext;

    return true;
  }
}

