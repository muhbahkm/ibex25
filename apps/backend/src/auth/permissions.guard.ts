import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthContext } from './auth-context.interface';
import { Permission } from './permissions.enum';

/**
 * Permissions Metadata Key
 * Used to store required permissions in route metadata
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * RequirePermissions Decorator
 *
 * Decorator to specify which permissions are required for a route.
 * Must be used in conjunction with PermissionsGuard.
 *
 * Usage:
 * @RequirePermissions(Permission.ISSUE_INVOICE)
 * @Post(':id/issue')
 * async issue(...) { ... }
 *
 * @RequirePermissions(Permission.SETTLE_INVOICE, Permission.CANCEL_INVOICE)
 * @Post(':id/settle')
 * async settle(...) { ... }
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Permissions Guard
 *
 * Enforces permission-based access control.
 * Must be used after AuthGuard (which provides request.auth).
 *
 * Behavior:
 * - Reads required permissions from route metadata
 * - Checks if user's permissions include all required permissions
 * - Throws 403 Forbidden if permission is missing
 * - Allows access if all permissions are present
 *
 * Error Codes:
 * - AUTH_CONTEXT_MISSING: AuthGuard was not applied or failed
 * - PERMISSION_DENIED: User lacks required permission(s)
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required permissions from route metadata
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Get AuthContext from request (set by AuthGuard)
    const request = context.switchToHttp().getRequest<Request & { auth?: AuthContext }>();
    const authContext = request.auth;

    // Validate AuthContext exists
    if (!authContext) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'AUTH_CONTEXT_MISSING',
          message: 'Authentication context is missing. AuthGuard must be applied before PermissionsGuard.',
        },
      });
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      authContext.permissions.includes(permission),
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !authContext.permissions.includes(permission),
      );

      throw new ForbiddenException({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Access denied. Required permissions: ${requiredPermissions.join(', ')}. Missing: ${missingPermissions.join(', ')}.`,
        },
      });
    }

    return true;
  }
}

