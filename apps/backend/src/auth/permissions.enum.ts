/**
 * Permissions Enum
 *
 * Defines granular permissions for operations in IBEX.
 * Permissions are semantic and will be enforced in future phases.
 *
 * Permission Categories:
 * - Invoice Operations: ISSUE_INVOICE, SETTLE_INVOICE, CANCEL_INVOICE
 * - View Operations: VIEW_LEDGER, VIEW_REPORTS
 *
 * Note: This is a skeleton. Permission enforcement will be added in future phases.
 * Currently, all operations use OperatorContext which is passed explicitly.
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

