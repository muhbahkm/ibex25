import { Controller, Get, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { UsageMeterService } from './usage-meter.service';
import { TimeWindow, UsageSnapshot } from './usage-metrics.types';
import { StoreScopeGuard } from '../core/store-scope.guard';

/**
 * Usage Controller
 *
 * C2: Read-only API for usage metering.
 * Provides accurate usage metrics computed on demand.
 *
 * ⚠️ READ-ONLY: No writes, no persistence, no caching.
 */
@UseGuards(StoreScopeGuard)
@Controller('usage')
export class UsageController {
  constructor(private readonly usageMeterService: UsageMeterService) {}

  /**
   * Get Usage Metrics
   * GET /usage
   *
   * Returns usage metrics for the authenticated store.
   *
   * Query Parameters:
   * - window: "daily" | "monthly" (default: "monthly")
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "window": "MONTHLY",
   *     "metrics": {
   *       "invoicesIssued": 45,
   *       "ledgerEntries": 90,
   *       "activeInvoices": 12,
   *       "activeCustomers": 8
   *     },
   *     "computedAt": "2025-01-27T10:00:00.000Z"
   *   }
   * }
   */
  @Get()
  async getUsage(
    @Req() req: Request,
    @Query('window') window?: string,
  ): Promise<{ success: true; data: UsageSnapshot }> {
    const storeId = req['storeId'] as string;

    if (!storeId) {
      throw new ForbiddenException('Store ID is required');
    }

    // Parse window parameter (default to MONTHLY)
    const timeWindow = this.parseWindow(window);

    // Get usage snapshot
    const snapshot = await this.usageMeterService.getUsageSnapshot(storeId, timeWindow);

    return {
      success: true,
      data: snapshot,
    };
  }

  /**
   * Parse window query parameter
   */
  private parseWindow(window?: string): TimeWindow {
    if (!window) {
      return TimeWindow.MONTHLY;
    }

    const normalized = window.toUpperCase();
    if (normalized === 'DAILY') {
      return TimeWindow.DAILY;
    }

    if (normalized === 'MONTHLY') {
      return TimeWindow.MONTHLY;
    }

    // Default to MONTHLY for invalid values
    return TimeWindow.MONTHLY;
  }
}

