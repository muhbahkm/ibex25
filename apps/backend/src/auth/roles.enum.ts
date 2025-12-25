/**
 * User Roles Enum
 *
 * Defines the role hierarchy in IBEX.
 * Roles represent organizational positions, not technical permissions.
 *
 * Role Hierarchy (conceptual):
 * - OWNER: Full system control, can do everything
 * - MANAGER: Store operations, can manage invoices and settlements
 * - CASHIER: Point-of-sale operations, can issue invoices
 * - AUDITOR: Read-only access, can view reports and ledger
 *
 * Note: This is a skeleton. Role enforcement will be added in future phases.
 */
export enum Role {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  AUDITOR = 'AUDITOR',
}

