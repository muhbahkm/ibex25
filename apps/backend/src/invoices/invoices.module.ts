import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PrismaService } from '../prisma.service';
import { BillingModule } from '../billing/billing.module';
import { OperationalModule } from '../core/operational/operational.module';

@Module({
  imports: [BillingModule, OperationalModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, PrismaService],
})
export class InvoicesModule {}
