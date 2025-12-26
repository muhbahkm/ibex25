/**
 * Permissions Enum
 *
 * Defines granular permissions for operations in IBEX.
 * Permissions are semantic and enforced via PermissionsGuard.
 *
 * Permission Categories:
 * - Invoice Operations: ISSUE_INVOICE, SETTLE_INVOICE, CANCEL_INVOICE
 * - View Operations: VIEW_LEDGER, VIEW_REPORTS
 *
 * ⚠️ CONTRACT FROZEN: Permission enum values are frozen.
 * Do not add, remove, or rename permissions without version bump.
 * Must match frontend permission type in apps/frontend/auth/roles.ts
 * Role → Permission mapping is in apps/backend/src/auth/role-permissions.ts
 */
export enum Permission {
  // Invoice Operations
  ISSUE_INVOICE = 'ISSUE_INVOICE',
  SETTLE_INVOICE = 'SETTLE_INVOICE',
  CANCEL_INVOICE = 'CANCEL_INVOICE',

  // View Operations
  VIEW_LEDGER = 'VIEW_LEDGER',
  VIEW_REPORTS = 'VIEW_REPORTS',
}
