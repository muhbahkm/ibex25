import { SubscriptionState } from '@prisma/client';

/**
 * Billing State Machine
 *
 * B3: Pure domain logic for billing state transitions.
 * This is provider-agnostic and contains NO side effects.
 *
 * Rules:
 * - No API calls
 * - No dates calculated
 * - No external dependencies
 * - Only transition rules
 *
 * This represents the internal truth of billing state.
 * External providers (Stripe, etc.) are just executors.
 */
export class BillingStateMachine {
  /**
   * Check if a transition from one state to another is allowed
   */
  static canTransition(
    from: SubscriptionState,
    to: SubscriptionState,
  ): boolean {
    // Define allowed transitions
    const transitions: Record<SubscriptionState, SubscriptionState[]> = {
      ACTIVE: ['PAST_DUE', 'SUSPENDED', 'CANCELLED'],
      PAST_DUE: ['ACTIVE', 'GRACE', 'SUSPENDED', 'CANCELLED'],
      GRACE: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
      SUSPENDED: ['ACTIVE', 'CANCELLED'],
      CANCELLED: [], // Terminal state - no transitions allowed
    };

    return transitions[from]?.includes(to) ?? false;
  }

  /**
   * Validate a state transition
   * Throws error if transition is not allowed
   */
  static validateTransition(
    from: SubscriptionState,
    to: SubscriptionState,
    context?: string,
  ): void {
    if (!this.canTransition(from, to)) {
      const contextMsg = context ? ` (${context})` : '';
      throw new Error(
        `Invalid billing state transition: ${from} → ${to}${contextMsg}. ` +
          `This transition is not allowed by the billing state machine.`,
      );
    }
  }

  /**
   * Check if a state allows invoice issuance
   */
  static canIssueInvoices(state: SubscriptionState): boolean {
    return state === SubscriptionState.ACTIVE;
  }

  /**
   * Check if a state allows access to premium features
   */
  static canAccessPremiumFeatures(state: SubscriptionState): boolean {
    return state === SubscriptionState.ACTIVE || state === SubscriptionState.GRACE;
  }

  /**
   * Check if a state is in a payment-required state
   */
  static requiresPayment(state: SubscriptionState): boolean {
    return state === SubscriptionState.PAST_DUE || state === SubscriptionState.GRACE;
  }

  /**
   * Check if a state is terminal (no further transitions)
   */
  static isTerminal(state: SubscriptionState): boolean {
    return state === SubscriptionState.CANCELLED;
  }

  /**
   * Get all allowed next states from a given state
   */
  static getAllowedNextStates(from: SubscriptionState): SubscriptionState[] {
    const transitions: Record<SubscriptionState, SubscriptionState[]> = {
      ACTIVE: ['PAST_DUE', 'SUSPENDED', 'CANCELLED'],
      PAST_DUE: ['ACTIVE', 'GRACE', 'SUSPENDED', 'CANCELLED'],
      GRACE: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
      SUSPENDED: ['ACTIVE', 'CANCELLED'],
      CANCELLED: [],
    };

    return transitions[from] ?? [];
  }
}

