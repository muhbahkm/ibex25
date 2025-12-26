import { Module } from '@nestjs/common';
import { UsageSnapshotService } from './usage-snapshot.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { WriteThrottleGuard } from './guards/write-throttle.guard';
import { PrismaService } from '../../prisma.service';

/**
 * Operational Module
 *
 * C1: Operational hardening and safety controls.
 * Provides rate limiting, throttling, and usage monitoring.
 *
 * This module is additive - no business logic changes.
 */
@Module({
  providers: [
    UsageSnapshotService,
    RateLimitGuard,
    WriteThrottleGuard,
    PrismaService,
  ],
  exports: [
    UsageSnapshotService,
    RateLimitGuard,
    WriteThrottleGuard,
  ],
})
export class OperationalModule {}

