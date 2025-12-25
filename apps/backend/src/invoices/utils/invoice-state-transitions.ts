import { InvoiceStatus } from '@prisma/client';

/**
 * Invoice State Transition Validator
 *
 * This utility enforces the official IBEX Invoice Lifecycle:
 *
 * Allowed Transitions:
 * - DRAFT → ISSUED
 * - ISSUED → UNPAID (if credit/deferred)
 * - ISSUED → PAID (if cash/immediate)
 * - UNPAID → PAID (Settlement)
 * - ISSUED → CANCELLED
 * - DRAFT → CANCELLED
 *
 * Forbidden Transitions:
 * - PAID → UNPAID
 * - PAID → ISSUED
 * - CANCELLED → any state
 * - Any modification after ISSUED (except state transitions)
 *
 * ⚠️ CONTRACT FROZEN: This lifecycle is a core invariant.
 * Do not change state transitions without version bump.
 * This is constitutional law for the invoice domain.
 */
export class InvoiceStateTransitions {
  /**
   * Check if a state transition is allowed
   */
  static isTransitionAllowed(
    from: InvoiceStatus,
    to: InvoiceStatus,
  ): boolean {
    // Same state is always allowed (no-op)
    if (from === to) {
      return true;
    }

    // CANCELLED invoices cannot transition to any other state
    if (from === InvoiceStatus.CANCELLED) {
      return false;
    }

    // PAID invoices cannot transition to any other state
    if (from === InvoiceStatus.PAID) {
      return false;
    }

    // Define allowed transitions
    const allowedTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      [InvoiceStatus.DRAFT]: [
        InvoiceStatus.ISSUED,
        InvoiceStatus.CANCELLED,
      ],
      [InvoiceStatus.ISSUED]: [
        InvoiceStatus.UNPAID,
        InvoiceStatus.PAID,
        InvoiceStatus.CANCELLED,
      ],
      [InvoiceStatus.UNPAID]: [InvoiceStatus.PAID],
      [InvoiceStatus.PAID]: [], // No transitions allowed
      [InvoiceStatus.CANCELLED]: [], // No transitions allowed
    };

    const allowed = allowedTransitions[from] || [];
    return allowed.includes(to);
  }

  /**
   * Validate a state transition and throw if invalid
   */
  static validateTransition(
    from: InvoiceStatus,
    to: InvoiceStatus,
    invoiceId?: string,
  ): void {
    if (!this.isTransitionAllowed(from, to)) {
      const invoiceRef = invoiceId ? `Invoice ${invoiceId}` : 'Invoice';
      throw new Error(
        `${invoiceRef}: Invalid state transition from ${from} to ${to}. ` +
          `Only DRAFT→ISSUED, ISSUED→UNPAID/PAID/CANCELLED, UNPAID→PAID, and DRAFT→CANCELLED are allowed.`,
      );
    }
  }

  /**
   * Check if an invoice can be modified (only DRAFT can be modified)
   */
  static canModify(status: InvoiceStatus): boolean {
    return status === InvoiceStatus.DRAFT;
  }

  /**
   * Check if an invoice can be settled (only UNPAID can be settled)
   */
  static canSettle(status: InvoiceStatus): boolean {
    return status === InvoiceStatus.UNPAID;
  }

  /**
   * Check if an invoice can be issued (only DRAFT can be issued)
   */
  static canIssue(status: InvoiceStatus): boolean {
    return status === InvoiceStatus.DRAFT;
  }

  /**
   * Check if an invoice can be cancelled (DRAFT or ISSUED can be cancelled)
   */
  static canCancel(status: InvoiceStatus): boolean {
    return (
      status === InvoiceStatus.DRAFT || status === InvoiceStatus.ISSUED
    );
  }

  /**
   * Check if an invoice has financial impact
   * (Only UNPAID and PAID have financial impact)
   */
  static hasFinancialImpact(status: InvoiceStatus): boolean {
    return (
      status === InvoiceStatus.UNPAID || status === InvoiceStatus.PAID
    );
  }

  /**
   * Check if an invoice should appear in customer statement
   * (Only UNPAID and PAID appear in statements)
   */
  static appearsInStatement(status: InvoiceStatus): boolean {
    return (
      status === InvoiceStatus.UNPAID || status === InvoiceStatus.PAID
    );
  }
}

