import { Module } from '@nestjs/common';
import { ProfitLossController } from './profit-loss.controller';
import { ProfitLossService } from './profit-loss.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ProfitLossController],
  providers: [ProfitLossService, PrismaService],
})
export class ReportsModule {}

