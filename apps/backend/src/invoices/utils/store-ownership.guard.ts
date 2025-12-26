import { ForbiddenException } from '@nestjs/common';

/**
 * Store Ownership Guard
 *
 * Ensures that every financial operation on an Invoice is performed
 * by an operator within the same store.
 *
 * Rule: invoice.storeId === operator.storeId
 * Violation → 403 Forbidden
 */
export class StoreOwnershipGuard {
  /**
   * Validate that the operator belongs to the same store as the invoice
   */
  static validateStoreOwnership(
    invoiceStoreId: string,
    operatorStoreId: string,
    operation: string,
    invoiceId?: string,
  ): void {
    if (invoiceStoreId !== operatorStoreId) {
      const invoiceRef = invoiceId ? `Invoice ${invoiceId}` : 'Invoice';
      throw new ForbiddenException(
        `${invoiceRef}: Operation '${operation}' is forbidden. ` +
          `Operator belongs to store ${operatorStoreId}, but invoice belongs to store ${invoiceStoreId}. ` +
          `Financial operations can only be performed within the same store.`,
      );
    }
  }

  /**
   * Validate that the operator belongs to the specified store
   */
  static validateOperatorStore(
    operatorStoreId: string,
    targetStoreId: string,
    operation: string,
  ): void {
    if (operatorStoreId !== targetStoreId) {
      throw new ForbiddenException(
        `Operation '${operation}' is forbidden. ` +
          `Operator belongs to store ${operatorStoreId}, but operation targets store ${targetStoreId}. ` +
          `Operations can only be performed within the operator's store.`,
      );
    }
  }
}
