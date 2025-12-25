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
 * ⚠️ CONTRACT FROZEN: Role enum values are frozen.
 * Do not add, remove, or rename roles without version bump.
 * Must match frontend role enum in apps/frontend/auth/roles.ts
 */
export enum Role {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  AUDITOR = 'AUDITOR',
}

