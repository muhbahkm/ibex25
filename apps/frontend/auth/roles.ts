/**
 * Frontend Roles and Permissions
 *
 * Mirrors backend roles and permissions for UI permission checks.
 * This is a frontend-only scaffold - no real authentication yet.
 */

export enum Role {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  AUDITOR = 'AUDITOR',
}

export type Permission =
  | 'ISSUE_INVOICE'
  | 'SETTLE_INVOICE'
  | 'CANCEL_INVOICE'
  | 'VIEW_LEDGER'
  | 'VIEW_REPORTS';

