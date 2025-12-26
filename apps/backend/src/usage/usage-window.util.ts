/**
 * Usage Window Utilities
 *
 * C2: Pure functions for computing time windows.
 * No Date.now() inside services - dates are injected for testability.
 */

import { TimeWindow } from './usage-metrics.types';

/**
 * Time Window Boundaries
 */
export interface WindowBoundaries {
  start: Date;
  end: Date;
}

/**
 * Get daily window boundaries
 *
 * @param referenceDate - Reference date (defaults to now, but injectable for testing)
 * @returns Window boundaries for the current day
 */
export function getDailyWindow(
  referenceDate: Date = new Date(),
): WindowBoundaries {
  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0,
  );

  const end = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    23,
    59,
    59,
    999,
  );

  return { start, end };
}

/**
 * Get monthly window boundaries
 *
 * @param referenceDate - Reference date (defaults to now, but injectable for testing)
 * @returns Window boundaries for the current month
 */
export function getMonthlyWindow(
  referenceDate: Date = new Date(),
): WindowBoundaries {
  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );

  const end = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  return { start, end };
}

/**
 * Get window boundaries for a given time window type
 *
 * @param window - Time window type
 * @param referenceDate - Reference date (defaults to now)
 * @returns Window boundaries
 */
export function getWindowBoundaries(
  window: TimeWindow,
  referenceDate: Date = new Date(),
): WindowBoundaries {
  switch (window) {
    case TimeWindow.DAILY:
      return getDailyWindow(referenceDate);
    case TimeWindow.MONTHLY:
      return getMonthlyWindow(referenceDate);
    default:
      throw new Error(`Unknown time window: ${window}`);
  }
}
