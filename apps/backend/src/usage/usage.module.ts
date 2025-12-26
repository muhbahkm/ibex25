import { Module } from '@nestjs/common';
import { UsageMeterService } from './usage-meter.service';
import { UsageController } from './usage.controller';
import { PrismaService } from '../prisma.service';

/**
 * Usage Module
 *
 * C2: Read-only usage metering layer.
 * Provides accurate usage metrics computed on demand from existing data.
 *
 * ⚠️ READ-ONLY: No writes, no persistence, no caching, no side effects.
 */
@Module({
  providers: [UsageMeterService, PrismaService],
  controllers: [UsageController],
  exports: [UsageMeterService],
})
export class UsageModule {}

