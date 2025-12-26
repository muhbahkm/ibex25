import { ForbiddenException } from '@nestjs/common';

/**
 * Tenant Boundary Definition
 *
 * This file documents the tenant isolation model for IBEX SaaS architecture.
 * It defines what constitutes a tenant, what must NEVER cross tenant boundaries,
 * and which services are tenant-scoped.
 *
 * ⚠️ CRITICAL: This is constitutional law for multi-tenant safety.
 * Violations of tenant boundaries are security vulnerabilities.
 */

/**
 * TENANT DEFINITION
 *
 * In IBEX, a Tenant = a Store (storeId)
 *
 * Every tenant is identified by a unique storeId (UUID).
 * All data, operations, and resources are scoped to a storeId.
 *
 * Tenant Isolation Rule:
 * - Data belonging to Store A must NEVER be accessible to Store B
 * - Operations on Store A data must ONLY be performed by Store A operators
 * - Cross-store operations are FORBIDDEN
 */

/**
 * WHAT MUST NEVER CROSS TENANT BOUNDARIES
 *
 * 1. DATA ACCESS
 *    - Invoice queries must filter by storeId
 *    - Customer queries must filter by storeId
 *    - Product queries must filter by storeId
 *    - User queries must filter by storeId
 *    - Audit log queries must filter by storeId
 *    - Ledger entry queries must filter by storeId
 *    - Payment queries must filter by storeId
 *
 * 2. OPERATIONS
 *    - Creating invoices for a different store
 *    - Settling invoices from a different store
 *    - Cancelling invoices from a different store
 *    - Viewing customer statements from a different store
 *    - Accessing ledger entries from a different store
 *
 * 3. AUTHENTICATION & AUTHORIZATION
 *    - Users belong to exactly one store
 *    - Operators can only perform operations within their store
 *    - Store ownership must be validated on every operation
 *
 * 4. RESOURCE IDENTIFIERS
 *    - All entity IDs (invoiceId, customerId, etc.) are tenant-scoped
 *    - An invoiceId from Store A is meaningless to Store B
 *    - Entity lookups must ALWAYS include storeId
 */

/**
 * TENANT-SCOPED SERVICES
 *
 * The following services are tenant-scoped and MUST enforce store boundaries:
 *
 * 1. InvoicesService
 *    - All invoice operations require storeId validation
 *    - Uses StoreOwnershipGuard for validation
 *
 * 2. CustomersService
 *    - All customer operations are scoped to storeId
 *    - Customer statements are store-specific
 *
 * 3. LedgerService
 *    - All ledger entries are scoped to storeId
 *    - Financial reports are store-specific
 *
 * 4. AuditService
 *    - All audit log entries include storeId
 *    - Audit queries are store-scoped
 *
 * 5. PrismaService
 *    - Database queries must ALWAYS include storeId filters
 *    - No global queries without storeId
 */

/**
 * TENANT BOUNDARY ENFORCEMENT
 *
 * Enforcement mechanisms:
 *
 * 1. StoreOwnershipGuard
 *    - Validates operator.storeId === target.storeId
 *    - Throws 403 Forbidden on violation
 *    - Applied at service layer
 *
 * 2. StoreScopeGuard (S1)
 *    - Reusable guard for controller-level enforcement
 *    - Can be applied to routes/controllers
 *    - Validates storeId from request context
 *
 * 3. Database Schema
 *    - All tables include storeId column
 *    - Foreign keys enforce store relationships
 *    - Indexes support store-scoped queries
 *
 * 4. Service Layer Validation
 *    - Every service method validates store ownership
 *    - Explicit storeId checks before operations
 *    - No implicit store assumptions
 */

/**
 * TENANT BOUNDARY HELPERS
 */

/**
 * Validate that an operation is within tenant boundaries
 *
 * @param operatorStoreId - The store ID of the operator performing the operation
 * @param targetStoreId - The store ID of the target resource
 * @param operation - Description of the operation (for error messages)
 * @param resourceId - Optional resource ID (for error messages)
 * @throws ForbiddenException if store IDs don't match
 */
export function validateTenantBoundary(
  operatorStoreId: string,
  targetStoreId: string,
  operation: string,
  resourceId?: string,
): void {
  if (operatorStoreId !== targetStoreId) {
    const resourceRef = resourceId ? `Resource ${resourceId}` : 'Resource';
    throw new ForbiddenException(
      `${resourceRef}: Operation '${operation}' violates tenant boundary. ` +
        `Operator belongs to store ${operatorStoreId}, but target belongs to store ${targetStoreId}. ` +
        `Cross-tenant operations are forbidden.`,
    );
  }
}

/**
 * Check if two store IDs belong to the same tenant
 *
 * @param storeId1 - First store ID
 * @param storeId2 - Second store ID
 * @returns true if both belong to the same tenant (same storeId)
 */
export function isSameTenant(storeId1: string, storeId2: string): boolean {
  return storeId1 === storeId2;
}

/**
 * Extract storeId from request context
 *
 * This is a placeholder for future implementation.
 * Currently, storeId comes from OperatorContextDto in request body.
 *
 * In future auth system, this will extract from:
 * - JWT token claims
 * - Request headers
 * - Session data
 *
 * @param request - Express request object (placeholder)
 * @returns storeId from request context
 */
export function getStoreIdFromRequest(request: any): string | null {
  // TODO: Implement when auth system is ready
  // For now, storeId comes from request body (OperatorContextDto)
  return (
    request.body?.operatorContext?.storeId || request.body?.storeId || null
  );
}
