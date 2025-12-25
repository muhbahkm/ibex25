import { Module } from '@nestjs/common';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [LedgerController],
  providers: [LedgerService, PrismaService],
})
export class LedgerModule {}

