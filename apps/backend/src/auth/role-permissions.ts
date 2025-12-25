import { Role } from './roles.enum';
import { Permission } from './permissions.enum';

/**
 * Role → Permission Mapping
 *
 * Centralized mapping of roles to their permissions.
 * This MUST match the frontend mapping in apps/frontend/auth/role-permissions.ts
 *
 * Rules:
 * - OWNER: All permissions (full system control)
 * - MANAGER: Invoice operations + view operations (store management)
 * - CASHIER: Issue invoices + view ledger (point-of-sale operations)
 * - AUDITOR: View operations only (read-only access)
 *
 * This mapping is the single source of truth for role-based permissions in the backend.
 * Permissions are ALWAYS derived from role - never hardcoded per user.
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.OWNER]: [
    Permission.ISSUE_INVOICE,
    Permission.SETTLE_INVOICE,
    Permission.CANCEL_INVOICE,
    Permission.VIEW_LEDGER,
    Permission.VIEW_REPORTS,
  ],
  [Role.MANAGER]: [
    Permission.ISSUE_INVOICE,
    Permission.SETTLE_INVOICE,
    Permission.CANCEL_INVOICE,
    Permission.VIEW_LEDGER,
    Permission.VIEW_REPORTS,
  ],
  [Role.CASHIER]: [
    Permission.ISSUE_INVOICE,
    Permission.VIEW_LEDGER,
  ],
  [Role.AUDITOR]: [
    Permission.VIEW_LEDGER,
    Permission.VIEW_REPORTS,
  ],
};

/**
 * Get permissions for a role
 *
 * Returns the list of permissions associated with a given role.
 * This is the single source of truth for role-based permissions.
 *
 * @param role - The role to get permissions for
 * @returns Array of permissions for the role
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

