/**
 * Operational Error Codes
 *
 * C1: Centralized error codes for operational safety controls.
 * These codes are used for rate limiting, throttling, and safety blocks.
 */

export enum OperationalErrorCode {
  /**
   * Rate limit exceeded for the tenant/endpoint
   */
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  /**
   * Write operation throttled (too many write ops in time window)
   */
  WRITE_THROTTLED = 'WRITE_THROTTLED',

  /**
   * Operation temporarily blocked due to safety limits
   */
  OPERATION_TEMPORARILY_BLOCKED = 'OPERATION_TEMPORARILY_BLOCKED',
}

