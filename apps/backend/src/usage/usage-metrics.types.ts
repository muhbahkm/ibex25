/**
 * Usage Metrics Types
 *
 * C2: Immutable metric names and time windows for usage metering.
 * These are the canonical definitions of what we measure.
 */

/**
 * Metric Names
 *
 * Immutable identifiers for usage metrics.
 * These names are used across the system for consistency.
 */
export enum MetricName {
  /**
   * Number of invoices issued (status: ISSUED, UNPAID, PAID)
   */
  INVOICES_ISSUED = 'invoicesIssued',

  /**
   * Number of ledger entries created
   */
  LEDGER_ENTRIES = 'ledgerEntries',

  /**
   * Number of active invoices (status: ISSUED, UNPAID, PAID)
   */
  ACTIVE_INVOICES = 'activeInvoices',

  /**
   * Number of active customers (non-guest customers with invoices)
   */
  ACTIVE_CUSTOMERS = 'activeCustomers',
}

/**
 * Time Window
 *
 * Defines the time period for usage metrics.
 */
export enum TimeWindow {
  /**
   * Daily window: from start of current day to end of current day
   */
  DAILY = 'DAILY',

  /**
   * Monthly window: from start of current month to end of current month
   */
  MONTHLY = 'MONTHLY',
}

/**
 * Usage Metrics
 *
 * Structure for usage metrics data.
 */
export interface UsageMetrics {
  invoicesIssued: number;
  ledgerEntries: number;
  activeInvoices: number;
  activeCustomers: number;
}

/**
 * Usage Snapshot
 *
 * Complete usage data for a time window.
 */
export interface UsageSnapshot {
  window: TimeWindow;
  metrics: UsageMetrics;
  computedAt: Date;
}
